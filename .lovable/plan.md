# "Use my current location" in the address field

Add a one-tap location option to the address input used in the booking and water-test forms, so a homeowner can fill their pool address without typing and see nearby suggestions first.

## What the user sees

- A small "Use my current location" button in the address field row (pin icon, brand-styled, square corners).
- Tap it: the browser asks for location permission.
  - Allowed: the field fills with the nearest street address, the map preview centers on it, and any further typing ranks suggestions around that spot instead of the default Plano/Frisco center.
  - Denied or unavailable: a short inline note ("Location off — type your address instead"), field untouched, autocomplete keeps today's service-area bias.
- While resolving, the button shows a "Locating…" state and is disabled.

## Technical notes

- `src/components/AddressAutocomplete.tsx`
  - Add the locate button plus `locating` / `locError` state using `navigator.geolocation.getCurrentPosition` (high accuracy, ~10s timeout), called from the click handler only.
  - Store resolved coords in state and use them for `locationBias.center` and `origin`, falling back to `SERVICE_AREA_CENTER` when absent.
  - On success, set the input text to the reverse-geocoded address and fire `onSelect(address, placeId)` so the map preview and parent form update.
- New server function `src/lib/geo.functions.ts` — `reverseGeocode({ lat, lng })`:
  - `createServerFn({ method: 'POST' })` with a zod-validated lat/lng range check.
  - Calls the Google Maps connector gateway `/maps/api/geocode/json?latlng=...` with `Authorization: Bearer LOVABLE_API_KEY` and `X-Connection-Api-Key`, both read inside the handler.
  - Returns `{ formattedAddress, placeId }` for the best street-level result; surfaces the gateway status and body on failure, mapping the 403 referrer/service-blocked cases to a clear message.
- No database or schema changes; nothing else on the page changes.

## Note

The geocoding call runs server-side through the gateway, so it works on savvyswim.com even though the managed browser key is restricted to `*.lovable.app`. The inline map preview still needs your own browser key on the custom domain.
