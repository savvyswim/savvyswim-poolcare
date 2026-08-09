# Clean, professional CRM redesign (Jobber / QuickBooks style)

Goal: make the CRM look and feel like the reference tools — calm white workspace, clear headings, quiet cards, real charts for reporting — while keeping Savvy Swim identity as accent only. Three audiences: office/admin (dense but clean), technician (simple, big touch targets), customer portal (easy, friendly, visual).

## 1. New CRM design system

Rework the CRM token layer (`src/crm/crm.css`, scoped to `.savvy-crm` so the marketing site is untouched):

- Canvas `#F7F8F7` warm-neutral, cards pure white with a 1px `#E3E5E3` border and a soft shadow, 8px rounded corners inside the CRM only (marketing site keeps square corners).
- Ink `#12303C` for headings/body, muted `#5C6B72` for labels — no more all-caps Oswald body text.
- Type: Inter/system UI everywhere, headings semibold sentence case ("Jobs", "Insights"), tabular numerals for money. Anton/Oswald stay only in the sidebar wordmark.
- Accents: burgundy `#8E1F2C` for primary buttons/active nav, aqua `#1FA9BE` for info, green/amber/red for status pills — used sparingly, like the reference screenshots.
- Retire the heavy cabana stripe band and burgundy gradient hero from interior pages (wordmark keeps a thin stripe).
- Component primitives: `PageHeader` (title + subtitle + primary action + overflow "More actions"), `StatCard` (label, big number, trend chip, sub value), `Panel` (title row + optional filter + body), `DataTable` (sortable headers, zebra-free rows, hover, status pills, right-aligned money), `FilterBar` (pill filters + search), `EmptyState` (icon, one line, one button), `Skeleton` loading rows.

## 2. Admin shell

- Sidebar: white, grouped, sentence case, 6 top-level groups collapsed by default with the active group open; collapsible to an icon rail.
- Top bar: global search, quick-create "+" menu (new customer, quote, job, invoice), notifications, help, settings, account.
- Page frame: breadcrumb + page title + primary action row on every page, consistent 24px gutters and max width.

## 3. New Insights dashboard (`/admin/crm/insights`, becomes the CRM home)

Built with recharts on existing data:

- Overview strip: new leads, new inspection requests, converted quotes, jobs scheduled, invoiced value, collected — each with period-over-period trend chip and a date-range picker (this month / last 30 / quarter / year).
- Revenue over time (bar + goal line, editable monthly revenue goal).
- Sales pipeline funnel: requests → contacted → scheduled → completed → won, with drop-off callouts (reuses existing inspection funnel logic).
- Lead source donut + revenue by source.
- Today's operations: visits scheduled, completed, unassigned, open alerts.
- Activity feed of recent CRM events.

## 4. Finance overview (QuickBooks style)

New top section on Savvy Ledger: Invoices card (unpaid / overdue / paid split bars), Expenses donut by category, Profit & Loss bars (income vs expenses, net), Cash collected trend, and Top services by revenue. Existing ledger tabs stay, restyled.

## 5. List pages restyled to the Jobber pattern

Jobs, Customers, Quotes, Invoices, Inspection Requests, Tickets, Inventory all get: page header + primary action, a 3–4 card overview strip specific to that page, pill filters + search, then the clean table with status pills, sortable columns and empty states.

## 6. Technician mobile app (Pool Brain style)

Mobile-first tech experience, big touch targets, no dense tables and no finance data:

- Bottom tab bar: Home, Customers, Scheduling, Quotes, with a center "+" quick-create.
- Home day view: date arrows, progress ring (stops completed / total), counters for route stops and jobs, then stop cards showing job number, customer, pool badge, address, phone, and quick actions: "On the way" text, Chemical history, Customer history, plus "No access" and "Start job".
- Work-in-progress screen: running timer in the header, equipment and gallons shortcuts, service checklist rows with due-in-visits badges and "last done" text, camera / readings / notes / issue icons in a bottom action bar, and one full-width "Complete job" button.
- Chemical history screen: reading-type chips (chlorine, pH, alkalinity, CYA, salt, phosphates, TDS, calcium, water temp, bromine, borates, LSI), range selector, trend chart, empty state when no readings.
- Scheduling: Routes / Map toggle, route card with drive time, distance and duration, ordered stop list with optimize-route action.
- Customer quick view for techs: property, pool type, gate/lock/dog icons, equipment link, and Jobs tab only — quotes, invoices and payments stay hidden for technician role.
- Existing tech privacy lockdown behavior is preserved.

## 6b. Job costing card

Per-job "Total cost to date" card (revenue bar, cost bar, profit % and amount, expandable cost breakdown) shown on job and project detail pages, plus a Notes panel matching the reference layout.


## 7. Customer portal

Cleaner `/portal`: friendly header, tab bar (Overview, Visits, Water reports, Invoices, Documents, Support), a next-visit card, chemistry trend chart, invoice list with a single Pay button, and simple support ticket flow. Same tokens, larger type, fewer controls per screen.

## Technical notes

- Purely presentational: new/updated components under `src/crm/components/ui/*`, tokens in `src/crm/crm.css`, no schema or business-logic changes except the new insights aggregation queries (read-only) and a `revenue_goal` entry in existing `ss_settings`.
- Charts use the already-installed `recharts`; colors read from CSS variables.
- Rollout order: (1) tokens + primitives, (2) shell + Insights dashboard, (3) list pages, (4) finance overview, (5) tech day view, (6) portal.

## Open items

Anything else you want added to this list — extra dashboards, specific reports, or a page you want prioritized first — tell me and I'll fold it in before we build.
