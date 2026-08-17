# Make the phone icon dial directly

The header phone icon on the home page is currently icon-only on smaller screens (the number only appears on very wide desktops), so it reads as decoration and the number is cut off in the preview. Every other page shows the number but hides the whole phone link on narrow screens because it sits in the desktop header row.

## What changes

- The phone control in the header always shows the icon plus **817-663-POOL** whenever there's room, and stays a tap-to-call link at every screen size (no breakpoint where it disappears or shrinks to a bare icon with no label).
- Add a tooltip/`title` and accessible label reading "Call 817-663-POOL" so hovering or using a screen reader announces the number.
- Add a sticky bottom call bar on mobile with a single "Call 817-663-POOL" button, so the number is one tap away from anywhere on the page.
- Apply the same header treatment on Services, Weekly Pool Service, city landing pages, and the Frisco page so behavior is identical everywhere.

## Technical notes

- All links keep dialing `tel:+18176637665` from `src/lib/contact-info.ts`; display stays the vanity `817-663-POOL`, legal pages keep `(817) 663-7665`.
- Files touched: `src/pages/Index.tsx`, `Services.tsx`, `WeeklyPoolService.tsx`, `CityLanding.tsx`, `PoolCleaningFrisco.tsx`, plus a small shared `CallButton` component.
- Existing `trackContactClick("call_click", …)` analytics is preserved and extended to the new sticky mobile bar.

## Dialer behavior

Every call control opens the device dialer with the number pre-filled:
- `href="tel:+18176637665"` on a real `<a>` (no `button` + JS handler, no `preventDefault`, no `target="_blank"`), so mobile opens the dial pad and desktop hands off to the default calling app.
- Analytics tracking stays non-blocking so it never cancels the dial.
