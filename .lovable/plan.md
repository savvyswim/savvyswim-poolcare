# Snap the map preview to the chosen address

Today the preview map does center on the selected address and sits at a fixed zoom 17, but it jumps hard on every change and ignores the property's actual footprint — a large lot or a long driveway can land half off-frame, and re-selecting a nearby address teleports the view. This makes the confirm step instant and obvious.

## What changes

- **Fit the property, not a fixed zoom.** Use the place's own viewport bounds when Google returns one and fit the map to it with a small padding, then clamp so a tiny viewport can't zoom past street level (max ~19) and a sprawling one can't pull back past ~16. If no viewport comes back, keep centering on the point at zoom 17.
- **Glide instead of jump.** When the map already exists, pan/zoom to the new address smoothly so it reads as "moving to your house" rather than a flash of a different place.
- **Marker lands with it.** The pin repositions with a short drop animation on each new address so the eye catches where it settled.
- **Recenter control.** A small "Recenter" button in the map corner returns to the address after the user pans or zooms away, so they can explore and get back in one tap.
- **Slightly taller frame on mobile** (h-56 instead of h-48) so a house and its street are both visible at confirm zoom.

Everything else stays: the map still hides itself entirely if Maps can't load on the domain, and the address caption stays beneath.

## Technical notes

- Only `src/components/AddressMapPreview.tsx` changes.
- Add `viewport` to the existing `place.fetchFields` field list; call `map.fitBounds(place.viewport, padding)` then clamp with `map.getZoom()` inside a one-shot `idle` listener.
- Use `panTo` + `setZoom` for subsequent updates; keep the existing `Marker` (no `AdvancedMarkerElement`, which would need a Map ID).
- Recenter button is a plain overlay `button`, brand-styled, square corners; it re-applies the stored center/zoom.
- No backend, form, or autocomplete changes.
