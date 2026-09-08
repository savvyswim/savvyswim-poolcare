## Technical detail

- `src/pages/WeeklyPoolService.tsx`: delete the `{/* AREAS */}` section (lines ~299–328) and the now-unused `cities` array (lines ~92–99).
- Drop the `SERVICE_AREAS` import and the `CalendarDays` icon import if nothing else on the page uses them.
- No route, sitemap, or data change: every city page stays published and linked from the sitemap and footer.
- Verify: page loads clean, no unused-import or type errors.
