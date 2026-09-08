## What each section holds

**Who we are** — hero photo stays, but the copy shrinks to the company name, a single sentence, and the existing free-inspection and call buttons.

**What we offer** — four cards: weekly pool service, service & repair, green pool recovery, Swim Club. Each card shows the offer name, a one-line description and the starting price, and the whole card is a link:
- Weekly pool service → the weekly service page
- Service & repair, green recovery, Swim Club → the services page (anchored to the matching block)

**How it happens** — the existing process steps, condensed to short lines with no extra artwork.

**Why people go Savvy** — the review quotes already on the page today, reused unchanged, in a simple row.

**Contact** — phone, email, hours and the inspection button, plus the service-area map that's already built.

## What moves off

Membership, refer & save, our work/gallery, the long cleaning-detail block, the stats strip and the scrolling ticker come off the home page. Membership content lands on the services page; referrals and the work gallery get their own pages so their links keep working. Nothing is deleted.

## Technical notes

- `src/pages/Index.tsx` is rewritten around five sections; removed blocks are lifted into `src/pages/Services.tsx` and new routes `src/routes/refer.tsx` and `src/routes/our-work.tsx` (with matching page components).
- Header nav array and the mobile menu update to the five anchors plus Service & Repair and Customer Login; old `#membership`, `#refer`, `#portfolio` anchors on the home page become real page links so no menu item dead-ends.
- Offer cards reuse existing pricing constants rather than new hardcoded numbers; starting-price wording only.
- `src/routes/index.tsx` head/JSON-LD stays as is; new routes get their own title, description, canonical and og tags.
- Existing lead capture (`openQuoteModal`) and phone constants are reused untouched.
