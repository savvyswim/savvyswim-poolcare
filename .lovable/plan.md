# Hide the water test tab on the home page, slow down the offer card

Two small changes to the public site.

## What changes

- **"Free water test" tab**: the vertical blue tab disappears on the home page. It stays exactly as it is on every other page.
- **New customer offer card**: it now waits 4 full minutes after the visitor answers the cookie bar before sliding in. Scrolling no longer brings it up early. Everything else about it stays the same: same wording, same buttons, dismissed for the rest of the visit once closed.

Nothing else moves or changes.

## Technical notes

- `src/routes/__root.tsx`: render `<WaterTestTab />` only when the path is not `/`.
- `src/components/SwimClubPrompt.tsx`: drop the scroll listener and the 9 second timer; start a single 240000 ms timer once `consentSettled` is true (effect keyed on that state), clearing it on unmount.
- Keep the session dismiss key check before starting the timer.
- Verify with a typecheck and a quick rendered check of the home page and one other page.
