# Get the CRM accepting website leads

The website side is already wired: `WEBSITE_WEBHOOK_SECRET` is saved on this project, and every lead POSTs to `https://savvyswim.app/api/public/leads` with the secret sent four ways (bearer token, `x-website-secret`, `x-webhook-secret`, and an HMAC-SHA256 signature of the body).

The `503 "Lead intake is not configured"` comes from the CRM app, not from here. I can only manage secrets on this project — the CRM is a separate Lovable project, so its secret has to be set from that project. Here is the shortest path to a working replay.

## Step 1 — Pick one shared value

Because the same value must exist in two separate projects, it can't be a generated-and-hidden secret (those are never shown again). Create one strong random value, for example:

```text
openssl rand -hex 32
```

Keep it in your password manager. This one string is the handshake between the website and the CRM.

## Step 2 — Save it on the CRM project

In the CRM project, save it as `WEBSITE_WEBHOOK_SECRET`, then confirm the CRM's `/api/public/leads` route actually reads that variable and stops returning "Lead intake is not configured". If the CRM route is not built yet, it needs to:

- accept `POST` at `/api/public/leads`
- verify the caller using any one of the headers the website already sends
- insert the lead into the CRM leads pipeline and return `200`/`201`

## Step 3 — Save the same value here

I'll reopen the secret form on this project so you can paste the identical value over the existing `WEBSITE_WEBHOOK_SECRET`. If you'd rather not overwrite, we can instead read the current value out of the CRM once it's configured — but overwriting both with one known value is simpler.

## Step 4 — Replay and verify

Once both sides hold the same value:

- Open `/admin/lead-sync` and hit Retry on the pending/failed leads.
- Expected: status flips from `pending`/`failed` to `synced`, `crm_synced_at` fills in, and the delivery log shows `200` instead of `503`.
- I'll submit one fresh live booking end-to-end and confirm the row lands in the CRM pipeline with phone, consent, ZIP, and the `cta` / `source_page` / `city` attribution intact.

## Optional: point at a different endpoint

If the CRM lead route lives somewhere other than `https://savvyswim.app/api/public/leads`, set `CRM_LEADS_URL` on this project to the real URL — the forwarder already prefers it over the default, no code change needed.

## Technical notes

- Website forwarder: `src/lib/crm-lead-forward.server.ts` — reads `CRM_LEADS_TOKEN` first, then `WEBSITE_WEBHOOK_SECRET`; 3 bounded retries; every attempt logged to `ss_webhook_deliveries`.
- HMAC is `sha256` over the exact raw JSON body, sent as `x-webhook-signature: <hex>` and `x-signature: sha256=<hex>` — the CRM should verify against the raw body, not a re-serialized object.
- Retry UI: `/admin/lead-sync` (`src/lib/lead-sync.functions.ts`), office/owner only.
