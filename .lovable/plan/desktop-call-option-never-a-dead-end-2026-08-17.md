# Desktop call option: never a dead end

Right now a desktop click never even tries to place the call — it copies the number and shows a toast. But Macs (with an iPhone paired via Handoff/FaceTime) and iPads can place real calls, so that behavior blocks a working call path. And a visitor who genuinely can't call is only told through a toast that disappears.

## What changes

Clicking any phone control on a desktop browser opens a small branded call card anchored to the button instead of a toast:

- **Call now** — fires `tel:+18176637665`, so Mac/iPad hand off to FaceTime/iPhone and place the real call. Nothing is blocked.
- **Text us** — opens `sms:+18176637665` where supported.
- **Request a callback** — opens the existing booking form (same `QuoteModal`) pre-set so the office calls them.
- **The number itself**, shown large and selectable: `817-663-POOL` with `(817) 663-7665` under it, plus a **Copy** button that confirms inline.

The card stays open until dismissed (click outside or Esc), so the number is always readable — no reliance on a toast, and no blank tab if the machine has no call handler.

Phones and tablets are unchanged: one tap goes straight to the dialer, no card.

## Technical notes

- Extend `src/components/CallButton.tsx`: keep `isDesktop()` detection, but replace the `preventDefault` + toast branch in `handleCall` with opening a `CallOptionsPopover` (new small component in the same file, brand tokens: burgundy/cream/aqua, square corners).
- `CallLink`, `CallButton` and `StickyCallBar` all keep their current props so the site-wide replacements done earlier stay intact.
- "Call now" inside the card is a plain `<a href={PHONE_HREF}>` with no interception, so any installed handler wins.
- Numbers keep coming from `src/lib/contact-info.ts`. Analytics: existing `trackContactClick("call_click", location)` on open, plus `call_now`, `sms`, `copy`, `callback` sub-actions.
- Verify with Playwright at 1280px (card opens, number visible, copy works) and 390px (straight `tel:` handoff, no card).
