# Make maps and address autocomplete work on savvyswim.com

## The situation

The maps key this project currently uses is the Lovable-managed Google key. Its allowed-website list is locked to `*.lovable.app` and `*.lovableproject.com`, and that list is not editable — not by me, and not from Lovable settings. That is why the map and address suggestions work in preview but fail on savvyswim.com.

So the fix isn't "change the restriction on the current key." It's "use your own Google key on your own domains." Your own key is fully under your control, including the allowed-website list.

## What you do in Google Cloud (about 10 minutes)

1. Create (or open) a Google Cloud project and turn on billing. Maps requires billing even for the free monthly allowance.
2. Enable these APIs in that project: Maps JavaScript API, Places API (New), Geocoding API.
3. Create an API key.
4. Set the key's website restrictions to include all four patterns, since root and subdomains count separately:
   - `https://savvyswim.com/*`
   - `https://*.savvyswim.com/*`
   - `https://savvyswimservices.com/*`
   - `https://*.savvyswimservices.com/*`
   Add `https://*.lovable.app/*` too if you want the same key working in preview.
5. Under API restrictions, allow the three APIs from step 2.

I'll walk you through any step you get stuck on — just tell me where you are.

## What I do once you have the key

1. Open the Google Maps connection card so you can add a new connection with your own credentials (not the managed one).
2. After it links, the site picks up your key automatically — the map preview, the address autocomplete, and "Use my current location" all read from the connector variables already wired in the code. No code rewrite needed.
3. Verify on the live domain: open the booking form, type an address, confirm suggestions appear and the map renders.

## Fallback if you'd rather not create a key

Address autocomplete and the map are conveniences, not requirements — the form already accepts a typed address and submits fine without them. I can leave the current behavior (map quietly hides when the key is blocked) and skip the Google setup entirely.

## Technical notes

- Browser side reads `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` in `src/lib/google-maps.ts`; both the autocomplete and map preview go through that loader.
- Server side reverse geocoding in `src/lib/geo.functions.ts` goes through the Lovable connector gateway with `GOOGLE_MAPS_API_KEY`, so it is unaffected by browser referrer rules — but the new connection's server key must have application restrictions set to "None" or "IP addresses", not HTTP referrers, or gateway calls return 403.
- No schema or route changes are involved.
