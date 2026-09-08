## Technical detail

206 occurrences of U+2014 remain across `src/` and `public/`. Sweep them with a scripted pass plus manual review, in these groups:

- Staff routes: `src/routes/admin/*` (canary, not-found, lead-sources, lead-sync, webhook-health, pool-map, leads).
- Internal notifications and monitors: `src/lib/*.server.ts`, `src/lib/*-monitor.ts`, `src/routes/api/public/hooks/*`, `src/routes/api/public/leads.ts`, `src/lib/mcp/tools/*`.
- Shared UI still carrying dashes: `LeadForm.tsx`, `CallButton.tsx`, `QuoteModal.tsx`, `AddressMapPreview.tsx`, `src/routes/__root.tsx`.
- Code comments and JSDoc across `src/lib` and `scripts`.
- `public/crm-app.html` (49 occurrences, standalone page).
- `src/styles.css`: inspect the 5 hits individually; if any sit inside a CSS `content:` value they are replaced, comment-only ones are rewritten too.

Rules applied per occurrence: sentence break to `.`, parenthetical pause to `,`, label-to-value to `:`, title separator to `|`, decorative spacer removed. Preserve the en dash in "Dallas–Fort Worth".

Verification: `bunx tsgo --noEmit`, `bunx vitest run`, and a Playwright pass loading the public pages plus `/admin/leads` and `/admin/canary` checking for console errors and a zero count of `—` in rendered text.
