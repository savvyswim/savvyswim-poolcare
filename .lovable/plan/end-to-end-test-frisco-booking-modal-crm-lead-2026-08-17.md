# End-to-end test: Frisco booking modal → CRM lead

Goal: submit one real booking request from the Frisco page's booking modal and prove the lead lands with the phone number the visitor typed — both in the website's own lead table and in the CRM inbox.

## What I checked first

- The website's lead table (`inspection_requests`) is currently empty, and there is no lead-handoff delivery history yet. So this test will produce the first real records — nothing existing gets confused with the test.
- The shared handoff secret (`WEBSITE_WEBHOOK_SECRET`) is present on this project.
- The website is what I can verify directly. The CRM lives in a separate project, so I can prove the handoff by its HTTP response and the delivery log stored here, and by the admin Lead Sync screen — not by reading the CRM's database from this project.

## The test

1. Open the live Frisco page in a real browser session, open the booking modal from its main CTA, and fill it in exactly as a customer would: name, email, the phone number to test with, a Frisco address (using the address autocomplete), preferred date/time, and the consent checkbox. Wait out the anti-bot fill-time guard so the submission is treated as human.
2. Submit and capture the on-screen confirmation, plus any browser console/network errors.

## Verification

3. Website side: confirm exactly one new lead row exists with the submitted phone number intact (formatting preserved end to end), plus name, email, address, source pointing at the Frisco page, page/attribution fields, and the consent record.
4. Handoff side: read the delivery log for that lead — endpoint, HTTP status, response body, retry count — and the "synced" timestamp on the lead.
5. Open `/admin/lead-sync` and confirm the lead shows the same status there.
6. Report the outcome plainly: success, or the exact status and message the CRM returned. If the CRM rejects it (for example an authorization or "not configured" response), I will report the exact response and what the CRM side needs, and offer a one-click retry from the Lead Sync screen once it's fixed — I won't paper over a failure by inserting the row by hand.

## Cleanup

7. After confirmation, mark or remove the test lead so it doesn't sit in the sales pipeline as a real customer. Tell me if you'd rather leave it in place.

## Two things I need from you

- **Which contact details to submit.** A throwaway test contact keeps the pipeline clean; your real cell proves the text/email side actually arrives. Note that a real submission can trigger the office alert text/email.
- **CRM confirmation.** I can prove the handoff left this site and what the CRM answered, but I can't read the CRM project's database from here. If you want the CRM row itself confirmed, check the CRM leads pipeline after I run the test — or tell me and I'll walk you through the exact screen to look at.
