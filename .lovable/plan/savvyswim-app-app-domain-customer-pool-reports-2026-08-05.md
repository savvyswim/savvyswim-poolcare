# savvyswim.app — app domain + customer pool reports

## Short answer

Yes. One Lovable project can serve several domains at once. `savvyswim.com` keeps the marketing site, and `savvyswim.app` points at the same deployment but opens straight into the app (customer portal + admin CRM). Admin stays fully connected to the website — same database, same accounts — because it is literally the same app, just a different front door.

```text
savvyswim.com  -> marketing site (/, /services, ...)  + /admin/crm still reachable
savvyswim.app  -> app shell: sign in -> customer portal or admin CRM by role
```

## What gets built

### 1. Domain
- Connect `savvyswim.app` (and `www.savvyswim.app`) in Project settings > Domains after the next publish. No code duplication, no second project.

### 2. Host-aware entry
- Detect the host in the router. On `savvyswim.app`, `/` renders the app entry instead of the marketing home; marketing routes redirect to `savvyswim.com`.
- On `savvyswim.com` nothing changes.
- After sign-in, route by role: staff/admin/owner to `/admin/crm`, customers to `/portal`.

### 3. Customer portal (new)
Signed-in customers get a small, read-only area:
- **My pool** — address, plan, next scheduled visit.
- **Pool reports** — history of service visits with date, technician, chemical readings, work performed, and any photos from the visit sheet.
- **Billing** — invoices and payment status already tracked in the CRM.
Customers only ever see their own records, enforced at the database level with row-level policies keyed to their account. Customer accounts continue to be created by admin invite (existing invite email flow), no public signup.

### 4. Wordmark accessibility (folded in)
- The header "SAVVY SWIM" wordmark is currently a bare `<span>` inside a link with no accessible name for the tagline context. It becomes the page's brand link with an explicit `aria-label="Savvy Swim — home"`, and the decorative tagline is marked so screen readers don't read it as part of the link name.
- Wordmark color moves from `text-accent` to a contrast-checked brand red token that clears WCAG AA (4.5:1) against the cream header background; same treatment on Services and Frisco pages so all three headers match.
- Any remaining logo images get real `alt` text rather than empty or filename alt.

## Technical notes

- Router: a small `useAppHost()` helper reads `window.location.hostname`; `App.tsx` swaps the `/` element and adds `/portal` routes. Preview and localhost keep the marketing default so nothing breaks while building.
- Portal data comes from the existing `ss_visits`, `ss_customers`, and invoice tables — no new sync layer. New RLS policies scope reads to `auth.uid()` via a customer-to-user link column, with GRANTs for `authenticated`.
- Existing `RequireModule` role gating stays as-is for `/admin/crm`; the portal uses its own customer guard.
- SEO: marketing pages keep canonical URLs on `savvyswim.com`; `savvyswim.app` is marked `noindex` so it doesn't split rankings.
