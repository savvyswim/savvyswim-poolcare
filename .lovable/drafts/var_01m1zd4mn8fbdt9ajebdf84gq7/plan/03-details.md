## What changes

- **Service area map**: drop the day text under each city dot, keep the dot, the city name and the link. The name sits centred under the dot with the spacing tightened so the map doesn't look gappy. The link's screen-reader description becomes just "Plano pool service".
- **City list beside the map**: remove the small day line under each city name; the list keeps two columns of city links.
- **City pages**: remove the whole "Weekly route / {City} route days" section — heading, table and the note underneath it — so the page flows from the section above straight into the inclusions.

## What stays

Generic wording like "one fixed route day", "your first visit on the next route day" and the internal staff pool map keep their day column and phrasing — those don't name a weekday. Pricing, plans and the Swim Club membership are untouched.

## Technical notes

- `src/components/ServiceAreaSvgMap.tsx`: remove the `routeDays` `<text>` node and the `dayY` offset; adjust the label guard-rail spacing (currently name/day offsets 13/12) to a single-line offset and reduce the collision step accordingly.
- `src/components/ServiceAreaMap.tsx`: remove the `routeDays` `<span>`.
- `src/pages/CityLanding.tsx`: remove the ROUTE DAYS `<section>` and the now-unused `CalendarDays` import if nothing else uses it.
- `src/lib/service-locations.ts` and `src/lib/serviceAreas.ts`: drop the `routeDays` fields (and `routeNote` on the city data) once no component reads them, keeping the types in sync.
- Verify with a typecheck, the existing test run, and a browser pass over the map and one city page.
