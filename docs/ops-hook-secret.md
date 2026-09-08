# Ops hook secret, setup guide

The internal automation endpoints under `/api/public/hooks/*` trigger real email
and SMS, so they refuse anonymous callers. Each request must prove it holds a
shared secret.

Protected endpoints:

- `/api/public/hooks/canary`
- `/api/public/hooks/health-watch`
- `/api/public/hooks/failure-rate-watch`
- `/api/public/hooks/visit-reminders`
- `/api/public/hooks/low-stock-watch`

## 1. Set the secret

Add a backend secret named `OPS_HOOK_SECRET` with a long random value (32+
chars). Ask Lovable to "add a secret called OPS_HOOK_SECRET" and paste the value
into the secure prompt, never commit it to the repo or a `.env` file.

Generate one locally if you need a value:

```bash
openssl rand -hex 32
```

If `OPS_HOOK_SECRET` is not set, the code falls back to `CRM_WEBHOOK_SECRET`, so
existing cron jobs that already use that secret keep working. Prefer
`OPS_HOOK_SECRET` for new setups.

Behavior without a valid secret:

- No secret configured at all → `503 {"error":"not configured"}`
- Wrong or missing secret on the request → `401 {"error":"unauthorized"}`

## 2. Pass the secret on every call

Any one of these is accepted:

```
Authorization: Bearer <secret>
x-ops-secret: <secret>
?k=<secret>
```

Use a header when the caller supports it. Use `?k=<secret>` for schedulers that
can only send a URL.

```bash
curl "https://savvyswim.com/api/public/hooks/canary?rounds=3&source=manual&k=YOUR_SECRET"
curl -H "x-ops-secret: YOUR_SECRET" "https://savvyswim.com/api/public/hooks/health-watch"
```

## 3. Update the scheduled jobs

Scheduled jobs run from `pg_cron` + `pg_net`. Re-schedule each job with the
secret appended to the URL:

```sql
SELECT cron.unschedule('canary-post-deploy');

SELECT cron.schedule(
  'canary-post-deploy',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://savvyswim.com/api/public/hooks/canary?rounds=3&source=cron&k=YOUR_SECRET',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Do the same for `health-watch`, `failure-rate-watch`, `visit-reminders`, and
`low-stock-watch`, keeping each job's own schedule and query string.

Check what is currently scheduled:

```sql
SELECT jobname, schedule FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

## 4. Rotating the secret

1. Set the new value on `OPS_HOOK_SECRET`.
2. Re-schedule every cron job with the new `?k=` value in the same sitting. Jobs still carrying the old value start returning `401`.
3. Confirm with `cron.job_run_details` that the next runs come back `200`.

## Webhook failure & spike alerts

`/api/public/hooks/webhook-watch` runs every 5 minutes (pg_cron job
`savvyswim-webhook-watch`) and pages on-call when webhook traffic goes wrong:

- **Failures**: 401 / 400-class / 5xx attempts in the last 15 minutes, alerting
  once at least 3 failures (`?minFailures=`) or a 25% failure rate
  (`?threshold=`) is reached.
- **Spikes**: attempts in the window at 4x (`?spike=`) the 6-hour baseline and
  above 20 calls (`?minSpike=`), which catches retry storms and hammering of the
  public hook endpoints.

Rejected calls (bad signature, missing secret, malformed body) are recorded in
the delivery log under channel `ops`, so blocked traffic is alertable too.

Alerts dedupe per channel with a 30-minute cooldown (`?cooldown=`), are recorded
in `ss_webhook_alerts`, and are visible at `/admin/webhook-health`. Add
`?dryRun=1` to test detection without sending anything.

Alert recipients: `OPS_ALERT_EMAIL` (email) and `OPS_ALERT_PHONE` (SMS, needs the
Twilio connector).
