# Bring back the full booking form

The current quote popup is the short version (name, phone, email, address, notes). Restore the earlier "Book your inspection or 3D quote" form — the one with the service picker, date and time selection, address autocomplete with map preview, and the SMS consent checkbox — while keeping today's spam protection and CRM lead mirroring.

## What the restored form includes

- Header: "FREE · NO OBLIGATION" eyebrow, headline "Book your inspection or 3D quote", subline "Pick a time — we'll confirm by phone or email within one business day."
- Fields: full name, phone, email, property address (Google Places autocomplete + small map preview), service dropdown (Weekly Service & Maintenance, Equipment Repair, Green Pool Recovery, Salt & Automation, Filter Clean, Surface & Tile Care, On-site Inspection, Not sure — help me decide), preferred date (calendar), preferred time (8:00 AM–5:00 PM slots), notes.
- SMS consent checkbox with the existing disclosure text.
- Inline field-level validation with clear error messages, mobile keyboard/autofill hints.
- Confirmation screen after submit showing the chosen date and time, plus "Call us now" and "Add to calendar".

## What stays the same

- Riviera styling: burgundy #8E1F2C, cream #F4EFE3, aqua accents, Anton/Oswald type, square corners.
- Submissions still go to the site's hardened `/api/public/leads` endpoint (Zod validation, honeypot, minimum fill time, Turnstile, rate limiting). Preferred date, time, service and SMS opt-in ride along in the payload.
- The form keeps `data-savvy-cta="free_pool_visit"` so the CRM connector mirrors it into the lead inbox with page and UTM attribution.
- One modal only — no second unstyled popup.

## Technical notes

- Rebuild `src/components/QuoteModal.tsx` around the recovered pre-deletion `BookingDialog` structure (schema, service and time lists, field layout, confirmation state), swapping its old direct database write for the current `/api/public/leads` POST and analytics tracking.
- Reuse existing `AddressAutocomplete` and `AddressMapPreview` components and the fixed `ui/calendar`.
- Extend the leads endpoint's Zod schema with optional `service`, `preferred_date`, `preferred_time`, and `sms_opt_in` fields so the new inputs are accepted and stored.
- Keep the existing focus trap, Escape handling, and ARIA labelling on the dialog.
- No change to CTA wiring; every "Request a quote" / "Book free inspection" button opens this same modal.
