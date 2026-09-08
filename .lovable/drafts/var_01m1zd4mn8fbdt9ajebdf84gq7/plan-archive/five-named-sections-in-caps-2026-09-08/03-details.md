## What changes

Menu (shared header, used on every page)
- The five menu items read WHO WE ARE, WHAT WE OFFER, HOW IT HAPPENS, WHY PEOPLE GO SAVVY, CONNECT WITH US.
- The last one still jumps to the same contact area at the bottom of the home page; the jump targets themselves are unchanged, so existing links keep working.

Home page
- Add a WHO WE ARE label to the opening section, styled like the small labels above the other sections but readable over the photo.
- WHAT WE OFFER, HOW IT HAPPENS and WHY PEOPLE GO SAVVY change from mixed case to capitals.
- "Contact" becomes CONNECT WITH US.

## Technical notes

- `src/components/SiteChrome.tsx`: update the five `NAV` labels; hashes (`who`, `offer`, `how`, `why`, `contact`) stay the same.
- `src/pages/Index.tsx`: update the eyebrow text of the four labelled sections and add an eyebrow inside the `#who` hero block, reusing the existing `font-tech text-[11px] uppercase tracking-[0.24em]` treatment (with `text-on-media` tone in the hero).
- Because the eyebrow class already applies `uppercase`, the copy is written in caps in source so it matches everywhere, including any surface without that class.
- No routing, data, or component-structure changes.
