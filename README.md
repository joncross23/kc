# KC Motorcycles — Website

Single-page site for K C Motor Cycles, Unit 3 Freemans Road, Portslade, Brighton BN41 1SL.
Deployed on **Cloudflare Pages**.

## Structure

- `index.html` — the entire site (styles and scripts inlined)
- `images/` — logo and background photography
- `functions/api/reviews.js` — Cloudflare Pages Function serving live Google reviews
- `favicon.svg`

## Booking policy

**All bookings are taken by phone (01273 411 911).** There is deliberately no online
booking form — do not re-add one without checking with the owner first.

## Live Google reviews

The reviews section upgrades itself with live Google data when
`/api/reviews` responds. Without configuration it falls back silently to the
static testimonials, so the site works fine before setup.

### One-time setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project
   and enable **Places API (New)**.
2. Create an **API key** (Credentials → Create credentials → API key).
   Restrict it to the Places API (New). No referrer restriction is needed —
   the key is only used server-side.
3. In the Cloudflare Pages dashboard → project → **Settings → Environment
   variables**, add:
   - `GOOGLE_PLACES_API_KEY` = the key from step 2
   - *(optional)* `GOOGLE_PLACE_ID` = the ChIJ… place ID; if omitted, the
     function resolves it automatically on first call.
4. Redeploy. `/api/reviews` now returns live rating, review count and the
   most recent reviews, cached at the edge for 6 hours (~4 API calls/day,
   inside Google's free tier).

## Location / map

The embedded map and all "reviews" links point at the canonical Google
Business listing (CID `6180811518161713697`, place ref
`0x48759a84cdce2807:0x55c6a75413abfa21`) — the same listing linked from the
old Weebly site.
