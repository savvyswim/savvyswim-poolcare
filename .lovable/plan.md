# Split: Website project + CRM project (two apps, one shared backend)

Goal: the CRM becomes its own separate project, the public website stays here, and both
keep talking to the SAME database. The website only carries links that hand off to the
CRM app (staff login and customer portal).

## Step 0 — Finish your admin login

An owner account was created: `admin@savvyswim.com` / `SavvyOS-8acaaadc!` (email already
confirmed). It still needs to be attached to the staff roster and given the admin role,
otherwise it lands on "No staff access". That is a one-line database change and is the
first thing I do on approval. Change the password afterwards in CRM → Admin → Security.

## Target shape

```text
savvyswim.com            (this project — public website)
  marketing pages, city pages, services, booking, free inspection
  header buttons:  [Customer login] -> portal.savvyswim.com
                   [Staff login]    -> crm.savvyswim.com

crm.savvyswim.com        (new project — Savvy Swim OS)
  /                staff sign-in
  /crm/*           Marketing, Sales, Operations, Financial, Field, Admin workspaces
  /portal/*        customer portal (invoices, visits, water reports, tickets)
  /sign/*          contract e-sign pages
  /quote/*         public proposal links

both -> the SAME Lovable Cloud backend (customers, visits, invoices, contracts,
        inspections, auth users, roles, RLS)
```

## How the split is done

1. **Prepare this project (I do this).**
   - Move every CRM-only file under one clearly separated folder tree so the remix can
     drop the website cleanly and this project can drop the CRM cleanly.
   - Add a shared "handoff" module: the two public entry buttons (Customer login, Staff
     login) plus a `/portal` and `/admin/crm` redirect that forwards to the CRM domain,
     so old links and bookmarks never break.
   - Verify no website page imports CRM code and no CRM page imports website code.

2. **You remix the project** into "Savvy Swim CRM" (project menu → Remix).

3. **Wire the remix to the existing backend (I do this in the new project).**
   - Connect it to THIS project's backend instead of letting it create an empty one, so
     both apps read/write identical data and the same staff/customer accounts work.
   - Delete the marketing pages there; keep CRM, portal, sign, quote.
   - Set the CRM home route to the staff sign-in.

4. **Clean this project (I do this).**
   - Remove the CRM screens, keep the website, keep the booking/inspection forms that
     write leads into the shared database.
   - Keep the redirect stubs so `savvyswim.com/portal` and `/admin/crm` bounce to the CRM
     app.

5. **Domains.**
   - `crm.savvyswim.com` -> CRM project. Optionally `portal.savvyswim.com` -> same CRM
     project (portal routes).
   - `savvyswim.com` and `www` stay on the website project.

## What stays working

Inspection requests submitted on the website appear instantly in the CRM. Quotes,
contracts, e-sign, invoices, routes, chemistry, inventory, attribution, notifications and
the customer portal all keep functioning — same data, same accounts, same permissions.
Nothing is deleted, only relocated.

## Trade-offs to know

- Schema changes are made in the backend-owning project (this one) and both apps see them.
- Two deploys instead of one: website changes ship independently from CRM changes.
- Sign-in is per-domain, so staff and customers sign in on the CRM domain; the website
  only links there.

## Technical notes

- Shared backend = shared `auth.users`, `user_roles`, `ss_staff`, and all `ss_*` tables;
  RLS keeps technician / office / customer scoping exactly as today.
- The CRM project must be pointed at the existing backend URL and publishable key; it must
  not provision a new one, or it starts with an empty database.
- Redirect stubs use the CRM base URL from an environment value, so the domain can change
  without a code edit.
- Server functions that back the website (booking, inspection notify, attribution) stay in
  the website project; CRM-only server functions move with the CRM.
