# Make every call link behave correctly everywhere

Today only the header buttons and the sticky mobile bar use the shared call component. Every other phone link on the site (hero, service rows, final CTA, footers, quote modal, legal pages, contract pages) is a raw `tel:` anchor. On a phone those work fine; on a desktop browser they open a blank tab or a dead handler page.

## What changes

- Phones and tablets: every call control opens the native dialer with 817-663-7665 pre-filled — unchanged.
- Desktop browsers: the click still tries the system handler, and at the same time copies the number and shows a "Call 817-663-POOL — (817) 663-7665 copied" toast, so the visitor is never left on a blank page.
- Every phone link on the site goes through this one behavior, including the ones currently hand-rolled.

## Where it applies

Home, Services, Weekly Pool Service, all city landing pages, Frisco, Plano, the booking/quote modal, the lead form, Privacy, Terms and the contract signing pages.

## Technical notes

- Extract the desktop/mobile detection and click handler from `src/components/CallButton.tsx` into a small shared hook/helper plus a `CallLink` component that accepts `className` and `children`, so marketing surfaces can keep the vanity label and legal pages can keep `(817) 663-7665`.
- Replace each raw `<a href={PHONE_HREF}>` in `Index.tsx`, `Services.tsx`, `WeeklyPoolService.tsx`, `CityLanding.tsx`, `PoolCleaningFrisco.tsx`, `PoolCleaningPlano.tsx`, `LeadForm.tsx`, `QuoteModal.tsx`, `Privacy.tsx`, `Terms.tsx`, `SignContract.tsx` with `CallLink`, keeping their existing `trackContactClick` location strings.
- Numbers keep coming from `src/lib/contact-info.ts`; no new constants.
- Desktop detection stays conservative (no touch, no mobile UA, viewport > 820px) so a touch laptop or tablet is treated as dial-capable.
- Verify with Playwright at 390px and 1280px that links carry `tel:+18176637665` and that a desktop click produces the toast instead of a navigation.
