# Savvy Swim OS — multi-workspace SaaS console

Not one flat CRM: a suite. Each part of the business gets its own workspace (its own home screen, its own nav, its own reports), reached from an app launcher in the top bar. Every person can personalize their workspace background/theme, and a built-in AI assistant panel sits on the right of any screen.

**Nothing is removed.** Every page, tool and report that exists today (pricing engine, promos, contracts & e-sign, ledger, payroll, break-even, water lab, QC, routes, inventory, tickets, inspections, attribution, audit trail, security, deploy health, site speed, portal, store, city pages) stays exactly as it is functionally — it is only regrouped into the right workspace, restyled, and given a clean home screen. Before building, every existing CRM route is inventoried and mapped to a workspace so nothing is orphaned, and old URLs keep working (redirects where a path moves).


## 0. Workspaces (the big change)

An app launcher (grid icon, top-left) switches between workspaces. Each has a distinct home screen and its own left nav:

- **Home / My day** — personalized greeting ("Hello Alex"), today's tasks, my numbers, quick actions, pinned reports.
- **Marketing** — leads, campaigns, landing pages, city pages, lead source dynamics, inspection requests, attribution, reviews.
- **Sales** — pipeline, quotes/proposals, contracts & e-sign, conversion reporting.
- **Operations** — routes, scheduling, jobs, techs, water lab, QC, alerts, inventory, trucks.
- **Financial** — Savvy Ledger, invoices, expenses, payroll, margins, break-even, job costing.
- **Field (tech app)** — mobile-first day view, work-in-progress, chemical history, route.
- **Customer portal** — separate friendly surface (section 7).
- **Admin** — settings, permissions, pricing engine, security, audit, deploy health.

Nav shows only workspaces the person's role allows. Each workspace remembers the last page you were on.

## 1. Personalization (per person)

- Background picker per user: photo backgrounds (Savvy pool/riviera photo set), solid canvas, or dark mode — like the reference screenshot, with translucent glass cards over a photo.
- Light / dark / auto, accent color, compact vs comfortable density, sidebar collapsed by default.
- Stored per user in a new `ss_user_prefs` table (user_id, workspace, theme, background, density, pinned widgets) so it follows them across devices.
- Home screen widgets are drag-to-arrange and per user.

## 2. Built-in AI assistant ("Savvy AI")

- Right-side dock, openable from any screen, aware of the current workspace and the dashboard on screen.
- Answers about the data it can see, drafts messages/estimates, explains numbers, and suggests actions ("why did this source drop?").
- Runs on Lovable AI through a server function; permissions and row access follow the signed-in user — techs never get finance answers.
- Streams answers, shows suggested follow-ups, and can deep-link to the record it's talking about.

## 3. Shared design system


Rework the CRM token layer (`src/crm/crm.css`, scoped to `.savvy-crm` so the marketing site is untouched):

- Canvas `#F7F8F7` warm-neutral (or the person's chosen photo/dark background), cards white/glass with a 1px hairline border and soft shadow, 8px rounded corners inside the app only (marketing site keeps square corners).
- Ink `#12303C` for headings/body, muted `#5C6B72` for labels — no more all-caps Oswald body text.
- Type: Inter/system UI everywhere, headings semibold sentence case ("Jobs", "Insights"), tabular numerals for money. Anton/Oswald stay only in the sidebar wordmark.
- Accents: burgundy `#8E1F2C` for primary buttons/active nav, aqua `#1FA9BE` for info, green/amber/red for status pills — used sparingly.
- Retire the heavy cabana stripe band and burgundy gradient hero from interior pages (wordmark keeps a thin stripe).
- Component primitives: `PageHeader`, `StatCard`, `Panel`, `DataTable`, `FilterBar`, `EmptyState`, `Skeleton`.

## 4. App shell (shared by every workspace)

- App launcher grid → workspace switcher; left sidebar changes per workspace, grouped, sentence case, collapsible to an icon rail.
- Top bar: global search, quick-create "+" menu, notifications, help, settings, avatar, and the Savvy AI button.
- Page frame: breadcrumb + page title + primary action row, consistent gutters and max width.

## 5. Workspace home screens


Each workspace gets its own dashboard, built with recharts on existing data:

- **My day**: greeting + date, my tasks, my numbers, quick actions, pinned widgets.
- **Marketing home**: new leads, cost per lead, leads by campaign (bar), lead source dynamics (multi-line over 12 months), landing page + city page performance, inspection request funnel with drop-off by source.
- **Sales home**: pipeline value by stage, quotes sent/accepted, win rate, contracts awaiting signature, conversion trend.
- **Operations home**: today's visits scheduled / completed / unassigned, route efficiency, open alerts, QC scores, low stock.
- **Financial home** (QuickBooks style): Invoices card (unpaid / overdue / paid split bars), Expenses donut by category, Profit & Loss bars, cash collected trend, top services by revenue, break-even. Existing ledger tabs stay, restyled.
- Shared: date-range picker (this month / last 30 / quarter / year), period-over-period trend chips, activity feed.

## 6. List pages restyled to the Jobber pattern

Jobs, Customers, Quotes, Invoices, Inspection Requests, Tickets, Inventory all get: page header + primary action, a 3–4 card overview strip specific to that page, pill filters + search, then the clean table with status pills, sortable columns and empty states.


## 7. Field workspace — technician mobile app (Pool Brain style)

Mobile-first tech experience, big touch targets, no dense tables and no finance data:

- Bottom tab bar: Home, Customers, Scheduling, Quotes, with a center "+" quick-create.
- Home day view: date arrows, progress ring (stops completed / total), counters for route stops and jobs, then stop cards showing job number, customer, pool badge, address, phone, and quick actions: "On the way" text, Chemical history, Customer history, plus "No access" and "Start job".
- Work-in-progress screen: running timer in the header, equipment and gallons shortcuts, service checklist rows with due-in-visits badges and "last done" text, camera / readings / notes / issue icons in a bottom action bar, and one full-width "Complete job" button.
- Chemical history screen: reading-type chips (chlorine, pH, alkalinity, CYA, salt, phosphates, TDS, calcium, water temp, bromine, borates, LSI), range selector, trend chart, empty state when no readings.
- Scheduling: Routes / Map toggle, route card with drive time, distance and duration, ordered stop list with optimize-route action.
- Customer quick view for techs: property, pool type, gate/lock/dog icons, equipment link, and Jobs tab only — quotes, invoices and payments stay hidden for technician role.
- Existing tech privacy lockdown behavior is preserved.

## 8. Job costing card

Per-job "Total cost to date" card (revenue bar, cost bar, profit % and amount, expandable cost breakdown) shown on job and project detail pages, plus a Notes panel matching the reference layout.

## 9. Customer portal

Cleaner `/portal`: friendly header, tab bar (Overview, Visits, Water reports, Invoices, Documents, Support), a next-visit card, chemistry trend chart, invoice list with a single Pay button, and simple support ticket flow. Same tokens, larger type, fewer controls per screen.

## Technical notes

- Mostly presentational: new primitives under `src/crm/components/ui/*`, tokens in `src/crm/crm.css`, workspace shell in `CrmLayout.tsx`, workspace homes as new pages/routes.
- Two backend additions: `ss_user_prefs` (per-user theme, background, density, pinned widgets — RLS scoped to the signed-in user) and a `savvy-ai` server function on Lovable AI that answers with the caller's own permissions.
- Charts use the already-installed `recharts`; colors read from CSS variables so photo/dark backgrounds work.
- Rollout order: (1) tokens + primitives, (2) shell + launcher + personalization, (3) workspace homes (Marketing, Sales, Operations, Financial, My day), (4) list pages, (5) field app, (6) portal, (7) Savvy AI dock.


## Open items

Anything else you want added to this list — extra dashboards, specific reports, or a page you want prioritized first — tell me and I'll fold it in before we build.
