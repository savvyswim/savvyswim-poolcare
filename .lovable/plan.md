# New-customer offer pop-up, live on every page

The offer card already exists in the project but is not shown anywhere. This turns it on site-wide and drops the "Summer" wording.

## What the visitor sees

- A small card slides in at the bottom-right (full width at the bottom on phones) after about 9 seconds, or as soon as the visitor scrolls past the first screen — whichever happens first.
- Label at the top reads "New customer offer" instead of "Summer offer, new customers".
- Headline stays "First service visit free." with the three bullets: Swim Club bundle on a 12-month agreement, 25% off filter cleans, and 10% off services / 10% off parts / 24/7 text support.
- "Join in 60 seconds" opens the quote request form, tagged so we can see how many leads came from the offer.
- "Later", the X, and the Escape key all dismiss it, and it stays dismissed for the rest of that visit.
- It waits until the cookie bar has been answered so the two never overlap, and it sits above the sticky call bar on phones.

## Technical notes

- Mount `SwimClubPrompt` once in `src/components/SiteChrome.tsx` (shared shell) so it renders on all public pages; skip it on `/admin` and portal routes.
- `onJoin` calls `goToLead("swim_club_prompt")` from `src/lib/site-analytics`.
- Change the header string in `SwimClubPrompt.tsx` to "New customer offer".
- Bump the bottom offset on mobile so it clears the sticky call bar and the safe area.
- Verify with a quick browser check on the home page and one city page.
