# "Use my current location" in the address field

Add a one-tap location option to the address input used in the booking / water-test forms, so a homeowner can fill their pool address without typing and see nearby suggestions first.

## What the user sees

- A small "Use my current location" link/button inside the address field row (pin icon, brand-styled, square corners).
- Tap it: browser asks for location permission.
  - Allowed: the field fills with the nearest street address, the map preview updates, and further typing ranks suggestions around that spot instead of the default Plano/Frisco center.
  - Denied or unavailable: a short inline note ("Location off — type your address instead"), field untouched, autocomplete keeps today's service-area bias.
- While resolving, the button shows a "Locating…" state and is disabled.

## Technical notes

- `src/components/AddressAutocomplete.tsx`
  - Add locate button + `locating` / `locError` state using `navigator.geolocation.getCurrentPosition` (high accuracy, ~10s timeout).
  - Store resolved coords in state; use them for `locationBias.center` and `origin` when present, falling back to `SERVICE_AREA_CENTER`.
  - On success, set the input text to the reverse-geocoded address and fire `onSelect(address, placeId)` so the map preview and parent form update.
- New server function `src/lib/geo.functions.ts` — `reverseGeocode({ lat, lng })`:
  - `createServerFn({ method: 'POST' })` with a zod-validated lat/lng range check.
  - Calls the Google Maps connector gateway `/maps/api/geocode/json?latlng=...` with `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key`, env read inside the handler.
  - Returns `{ formattedAddress, placeId }` for the best street-level result; surfaces gateway status/body on failure, with the documented 403 referrer/service-blocked messages mapped to a clear message.
- No database or schema changes; nothing else on the page changes.

## Note

The browser geocoding call runs server-side through the gateway, so it works on the custom domain even though the managed browser key is restricted to `*.lovable.app`. The inline map preview still needs your own browser key on `savvyswim.com`.
