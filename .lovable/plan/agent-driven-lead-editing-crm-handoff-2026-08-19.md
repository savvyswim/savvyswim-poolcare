# Agent-driven lead editing + CRM handoff

Goal: the agent can fill in or correct a website lead and push it straight into the CRM app, so both systems hold the same record.

## What exists today

- Website agent tools: `list_leads`, `get_lead`, `set_lead_status`, `list_service_areas`.
- `set_lead_status` already re-sends the lead to the CRM after a status change.
- `crm-lead-forward.server.ts` posts the full lead (contact, service, consent, attribution) to the CRM endpoint and stores the returned CRM row id.
- No tool lets the agent edit contact details, service details, or create a lead from a phone call.

## What gets added

### 1. `update_lead` tool
The agent can set or correct any of these on an existing website lead:
- Contact: name, phone, email, address, ZIP
- Service: lead type (inspection / water test), preferred date, preferred contact time, pool details, notes
- Pipeline: status, source/attribution label

Writes apply immediately (no confirmation step), run as the signed-in staff user so access rules still decide what they may touch, and automatically push the refreshed lead to the CRM afterwards. The tool reports back the saved values plus the CRM sync result.

### 2. `create_lead` tool
For calls, walk-ins, and referrals the agent takes down directly. Creates the lead on the website side (with a reference number and a `source` of `agent`), then forwards it to the CRM in the same call so it lands in the sales pipeline immediately.

### 3. `push_lead_to_crm` tool
A standalone re-send for leads whose earlier handoff failed, returning the CRM row id and the HTTP result so failures are visible instead of silent.

### 4. Sharper agent instructions
The MCP description is updated so the assistant knows the intended flow: find the lead, fill in what's missing, then confirm it reached the CRM. Every write path ends in a CRM push, so website and CRM never drift.

## Technical notes

- New tool files under `src/lib/mcp/tools/` (`update-lead.ts`, `create-lead.ts`, `push-lead-to-crm.ts`), registered in `src/lib/mcp/index.ts`.
- All writes go through `supabaseForUser(ctx)` against `inspection_requests` — RLS enforced, no service-role client in MCP code.
- CRM handoff reuses `forwardInspectionToCrm` (dynamic import inside the handler) and reports `crm_lead_id` / delivery state via the existing `lead-sync` helpers.
- Zod input schemas kept flat and unconstrained beyond types; unknown/blank fields are omitted rather than nulled, matching what the CRM validator accepts.
- After the edits, the MCP manifest is regenerated so the new tools show up for connected assistants.
