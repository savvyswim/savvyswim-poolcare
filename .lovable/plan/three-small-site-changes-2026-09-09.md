# Three small site changes

## What changes

- **"Free water test" tab**: the vertical blue tab disappears on the home page. It stays exactly as it is on every other page.
- **New customer offer card**: it now waits 4 full minutes after the visitor answers the cookie bar before sliding in. Scrolling no longer brings it up early. Same wording, same buttons, still dismissed for the rest of the visit once closed.
- **Phone number**: everywhere the number appears it reads 817-663-7665 instead of 817-663-POOL, including the small "(7665)" note, which is no longer needed. Calling behavior does not change.

Nothing else moves or changes.

## Technical notes

- `src/routes/__root.tsx`: render `<WaterTestTab />` only when the path is not `/`.
- `src/components/SwimClubPrompt.tsx`: drop the scroll listener and the 9 second timer; start a single 240000 ms timer once `consentSettled` is true (effect keyed on that state), clearing it on unmount. Keep the session dismiss key check.
- `src/lib/contact-info.ts`: `PHONE_VANITY = "817-663-7665"` and `PHONE_VANITY_WITH_DIGITS = "817-663-7665"`; update the keypad comment. Consumers (`CallButton`, `BusinessInfoCard`, `LocalSeoBlurb`, `ThankYou`, `service-locations`) need no edits, but check for duplicated "(7665)" strings elsewhere in copy, structured data and docs.
- Verify with a typecheck, the test suite, and a rendered check of the home page plus one other page.
