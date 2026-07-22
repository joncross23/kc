/**
 * Cloudflare Pages Function: GET /api/reviews
 *
 * Fetches live Google rating + reviews for K C Motor Cycles via the
 * Google Places API (New), server-side so the API key is never exposed.
 * Responses are cached at the edge for 6 hours to keep API usage minimal
 * (~4 calls/day — comfortably inside Google's free tier).
 *
 * Required environment variable (set in Cloudflare Pages dashboard):
 *   GOOGLE_PLACES_API_KEY  - API key with "Places API (New)" enabled
 * Optional:
 *   GOOGLE_PLACE_ID        - the ChIJ... place ID; if unset it is
 *                            resolved automatically via Text Search
 */

const CACHE_URL = 'https://kc-reviews.internal/api/reviews';
const CACHE_SECONDS = 6 * 60 * 60; // 6 hours

function json(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
    });
}

export async function onRequestGet(context) {
    const { env } = context;
    const apiKey = env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        // Not configured yet - the front-end silently keeps its static reviews
        return json({ error: 'not_configured' }, 503);
    }

    // Serve from edge cache when possible
    const cache = caches.default;
    const cacheKey = new Request(CACHE_URL);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    // Resolve the place ID once if not provided
    let placeId = env.GOOGLE_PLACE_ID;
    if (!placeId) {
        const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id',
            },
            body: JSON.stringify({
                textQuery: 'K C Motor Cycles, Freemans Road, Portslade, Brighton BN41 1SL',
            }),
        });
        if (!searchRes.ok) return json({ error: 'place_search_failed' }, 502);
        const searchData = await searchRes.json();
        placeId = searchData.places?.[0]?.id;
        if (!placeId) return json({ error: 'place_not_found' }, 502);
    }

    // Fetch rating, review count and reviews
    const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
        },
    });
    if (!detailsRes.ok) return json({ error: 'details_failed' }, 502);
    const place = await detailsRes.json();

    const body = {
        rating: place.rating ?? null,
        count: place.userRatingCount ?? null,
        url: place.googleMapsUri ?? 'https://maps.google.com/?cid=6180811518161713697',
        reviews: (place.reviews || []).map((r) => ({
            author: r.authorAttribution?.displayName ?? 'Google user',
            rating: r.rating ?? 5,
            text: r.text?.text ?? r.originalText?.text ?? '',
            time: r.relativePublishTimeDescription ?? '',
        })),
    };

    const response = json(body, 200, {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
}
