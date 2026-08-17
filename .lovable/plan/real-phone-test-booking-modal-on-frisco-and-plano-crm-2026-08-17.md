# Real-phone test: booking modal on /frisco and /plano → CRM

Goal: confirm that a quote submitted from an actual phone on the two city pages creates a lead on the site AND lands in the CRM leads pipeline — with a clear pass/fail per page.

## Current state (verified just now)

- The website's lead table has zero rows, and the delivery log has no lead-channel entries at all. So there is currently no evidence that any lead has ever reached the CRM; this test creates the first real evidence.
- The shared secret used to sign the handoff is present on the website side. Whether the CRM accepts it is exactly what this test proves.

## What you do (on your phone)

For each page — savvyswim.com/frisco and savvyswim.com/plano:

1. Open the page on your phone (cellular, not the preview).
2. Tap a quote button; confirm the branded "Book your inspection or 3D quote" modal opens.
3. Fill it with a clearly marked test identity — name "Phone Test Frisco" / "Phone Test Plano", your own email and phone, a real local address, pick a service, tick the authorization box.
4. Submit and confirm you see the "You're on the board" confirmation.
5. Tell me when both are submitted.

Use a different email for each page so nothing gets collapsed as a duplicate, and take a screenshot of each confirmation screen.

## What I do afterwards

1. Read both lead rows back and check every field landed: name, email, phone, address, postal code, preferred date/time, pool details, notes, source tag (should identify the Frisco vs Plano page), lead type, consent flag and the exact consent wording, SMS opt-in, UTM/referrer/landing page/page path.
2. Check the delivery log for each lead: endpoint called, HTTP status, payload sent, CRM response body, retry attempts.
3. Check the CRM sync stamp — a lead only counts as "in the CRM" when the forward returned success and the stamp is set.
4. Confirm the leads appear in the CRM leads pipeline itself, not just as a successful HTTP call.
5. Report a per-page table: modal opened → submit response → local lead row → field completeness → CRM status, plus the CRM's exact error text if it rejects.
6. Delete the two test leads, their consent rows, delivery-log rows and event rows so the pipeline stays clean.

## If the CRM rejects the handoff

The likely failure is the CRM's public lead endpoint refusing the signed request (previously it answered "Lead intake is not configured"). If that happens I will report the exact status and body, confirm the lead is safely stored on the website side and retryable from the lead-sync admin screen, and tell you precisely what the CRM project needs to change. Fixing the CRM endpoint is work in the other project, not this one.

## Notes

- No production code changes are part of this task. If the test uncovers a bug (wrong source tag, dropped field, broken button), I'll report it and propose the fix separately.
- Path under test: the city page quote button → shared lead form → `/api/public/leads` → lead row → CRM forward with signed headers → delivery log + sync stamp.
