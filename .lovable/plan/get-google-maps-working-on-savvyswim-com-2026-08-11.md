# Get Google Maps working on savvyswim.com

The snippets you pasted are Google's sample pages for a map, a marker, and a place picker. Those samples all depend on one thing the site doesn't have yet: an API key that is allowed to run on your own domains. Right now the project uses the Lovable-managed key, which Google only accepts on `*.lovable.app` / `*.lovableproject.com`, so the address autocomplete and map preview silently fail on savvyswim.com and savvyswimservices.com.

## Step 1 — Your own Google API key (you do this part)

1. Google Cloud Console: pick or create a project and make sure **billing is enabled**.
2. Enable **Maps JavaScript API** and **Places API (New)** (add Geocoding only if you want it later).
3. Create an **API key** in that project.
4. On that key, **Application restrictions → HTTP referrers**, add all four patterns:
   - `https://savvyswim.com/*`
   - `https://*.savvyswim.com/*`
   - `https://savvyswimservices.com/*`
   - `https://*.savvyswimservices.com/*`
   Add `https://*.lovable.app/*` too so the preview keeps working.

When the key exists, I open the connect card and you paste it in as a new connection (not the managed one).

## Step 2 — Site changes I make

- Keep the current address field and map preview as-is: `AddressAutocomplete` already uses Places API (New) suggestions, and `AddressMapPreview` already draws a map with a marker. They are the same behaviour as your snippets, wired into the quote and water-test forms.
- Add a clear fallback: if Maps can't load (blocked key, offline), the address stays a plain typed field and the map area quietly hides instead of showing a dead grey box, so a lead can always be submitted.
- Verify on the published domain after the new key is linked: type an address in the quote form, confirm suggestions appear and the map preview centres on the selected place.

## Not doing (and why)

The `gmp-advanced-marker` / `map-id="DEMO_MAP_ID"` sample needs a Map ID configured in Google Cloud; without one the whole map fails to render. The site sticks with the standard marker, which needs no extra Cloud setup.

## Technical notes

- `src/lib/google-maps.ts` loads the JS API with `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`; linking your own connection swaps that value with no code change.
- `AddressAutocomplete.tsx` uses `AutocompleteSuggestion.fetchAutocompleteSuggestions`; `AddressMapPreview.tsx` uses `Place.fetchFields` + `google.maps.Marker`. Only the failure-path handling changes.
- No backend or lead-endpoint changes.

If instead you wanted a full-page map (service-area map, marker per city), say so and I'll add that as a separate section once the key is live.
