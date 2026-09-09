# Fix the overlapping top bar

## What's wrong

In your screenshot the menu words sit on top of the "SAVVY SWIM" name, and "Services" runs straight through the phone number. The menu strip is allowed to overflow its own space, so when the words are wider than the gap between the name and the buttons they spill out over both sides instead of being hidden or shortened.

## The fix

- Keep three fixed zones in the bar: name on the left, menu in the middle, phone and Consultation on the right. The middle zone stays inside its own space and can never draw over its neighbours.
- Let the menu words shrink and be clipped instead of spilling, so nothing ever sits on top of anything else.
- Show the full menu only when the screen is genuinely wide enough for it, and the extra "Services" link only at the widest sizes. Below that the menu hides cleanly and the phone plus Consultation buttons stay reachable.
- Add a little more breathing room between the name block and the menu so they never touch.
- No wording, colour or link changes, and the mobile bar stays as it is today.

## Check

- Load the home page at roughly 1280, 1440, 1600 and 1920 wide and confirm no words overlap at any size.
- Confirm the phone number and Consultation button are fully visible and clickable at each size.

## Technical notes

- Single file: `src/components/SiteChrome.tsx`, `SiteHeader`.
- Root row becomes an explicit three-slot layout: logo `shrink-0`, nav `min-w-0 flex-1 overflow-hidden`, actions `shrink-0`.
- Remove `shrink-0` from the nav `Link` items so they participate in shrinking; keep `whitespace-nowrap` with `overflow-hidden` on the nav container so text clips rather than overflows.
- Raise the nav reveal to a width where the five labels actually fit, and gate `/services` at the top breakpoint.
- Verify with `bunx tsgo --noEmit` and a preview screenshot at the widths above.
