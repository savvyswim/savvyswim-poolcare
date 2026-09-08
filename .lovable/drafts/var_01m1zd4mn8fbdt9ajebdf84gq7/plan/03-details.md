## Details

- The header button keeps a short label ("Consultation") because the menu bar is tight on smaller laptops; its hidden screen-reader description becomes "Free consultation — opens the Savvy Swim booking form".
- Hidden screen-reader labels on the renamed buttons are updated to match.
- Page headings, paragraphs, price notes, the admin console, and the confirmation emails keep their current wording. Say the word and those get updated in a follow-up.
- Files touched: `src/pages/Index.tsx`, `src/pages/CityLanding.tsx`, `src/pages/WeeklyPoolService.tsx`, `src/pages/OurWork.tsx`, `src/pages/Schedule.tsx`, `src/components/SiteChrome.tsx`, `src/components/QuoteModal.tsx`.
- Verify with a type check and a quick look at the home page and header at a narrow laptop width to confirm nothing wraps or overlaps.
