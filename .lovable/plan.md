# Split the CRM into its own project (still sharing one backend)

## Your admin login (ready now)

- URL: https://savvyswim.com/admin/crm/login
- Email: admin@savvyswim.com
- Password: SavvyOS-8acaaadc!

Owner-level access, email already confirmed. Change the password after first sign-in from CRM → Admin → Security.

## The key constraint

The website and the CRM must read and write the SAME database (customers, visits,
invoices, contracts, inspection requests). A Lovable Cloud project creates its own
isolated backend, so a plain remix would start with an empty database and the two
apps would drift apart immediately.

There are two honest ways to get "separate project, same data".

### Option A — Two projects, one shared backend (true split)

1. Remix this project into "Savvy Swim CRM".
2. In the remix, delete the public marketing pages and keep only the CRM/portal.
3. In this project, delete the CRM routes and keep only the public site + portal login link.
4. Point the remix at THIS project's existing backend instead of its own (connect it as
   an external backend using this project's URL and keys). Both apps then share the same
   tables, auth users, roles and RLS policies.
5. Domains: website stays on savvyswim.com, CRM goes to crm.savvyswim.com. The website's
   "Staff login" button links to the CRM domain.

Trade-offs: one database, one set of accounts, clean separation of code and deploys.
But schema changes must be made in the backend-owning project, and every new table needs
its grants/policies kept in sync with both apps. Auth sessions are per-domain, so staff
sign in once on the CRM domain.

### Option B — Keep one project, separate the surfaces (lower risk)

Keep everything where it is, and treat the CRM as its own app inside the same project:

- Serve the CRM from crm.savvyswim.com and the marketing site from savvyswim.com, with
  the CRM routes blocked on the public hostname.
- Keep the current route split (`/admin/crm/*` staff, `/portal` customers, public pages).

Trade-offs: nothing to migrate, no schema sync, one deploy. But CRM and website ship
together and the code stays in one repo.

## Recommendation

Option B unless you specifically need separate deploys/teams for the CRM. If you do want
the real split, Option A is the correct shape — the one thing that must not change is the
backend: the CRM project must connect to the existing backend, never create a new one.

## What I would do next (on approval)

For Option A: prepare this project for the split — isolate CRM code under one folder,
document the shared backend keys, add the staff-login handoff link on the website, then
you remix and I finish the wiring in the new project.

For Option B: add the hostname-based split, wire crm.savvyswim.com, and add the staff
login entry point on the public site.

## Technical notes

- Shared backend means shared `auth.users`, `user_roles`, `ss_staff` and every `ss_*`
  table; RLS keeps techs, office and customers scoped exactly as today.
- Both apps must keep the same Supabase client env values for the shared backend.
- Cross-domain sign-in is not shared automatically; staff sign in on the CRM domain.
