# Fix the crowded top bar

On some screen widths the top bar items collide: the "Savvy Swim" name prints on top of the menu links, and the word "Services" sits on top of the phone number. It looks broken and the links are hard to click.

## What will change

- The name and tagline on the left get their own protected space so nothing can print over them.
- The menu links get proper breathing room and are only shown when there is genuinely enough width for all of them; below that width the menu collapses cleanly instead of overlapping.
- The extra "Services" link stops crowding the phone number: it only appears when there is real room left, and the phone and Consultation button keep a fixed, reserved area on the right.
- Spacing between the three groups (name, menu, buttons) is increased so items can never touch.

Nothing else on the page changes: same links, same wording, same colors, same button behavior.

## Technical notes

- Edit `src/components/SiteChrome.tsx` only.
- Logo block: `shrink-0` instead of `shrink`, keep `min-w-0` on the row.
- Nav: raise the breakpoint at which the full link row appears (`xl:flex` instead of `lg:flex`), keep `flex-1 justify-center`, add `min-w-0` and consistent `gap` scaling so links never sit under the wordmark.
- Move the `/services` link behind the same wide breakpoint and give the right-hand cluster `shrink-0` with a left margin so it cannot be overlapped.
- Verify with a typecheck and a rendered check of the header at 1280, 1440 and 1920 widths.
