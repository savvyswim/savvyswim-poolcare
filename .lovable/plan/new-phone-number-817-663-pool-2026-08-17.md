# New phone number: (817) 663-POOL

Replace the old (469) 744-0379 number everywhere with **817-663-7665**, shown to
customers as **817-663-POOL** (POOL = 7665) wherever there's room for the vanity
version.

## Display rules

- Buttons, headers, hero, footer, city pages, service pages: `817-663-POOL`.
- Legal pages (Privacy, Terms), SMS footers, email bodies, and structured data:
  `(817) 663-7665` — plain digits, since compliance text and search engines should
  not see a vanity spelling.
- Every click-to-call link dials `tel:+18176637665` regardless of how it's shown.
- Optional nicety used on the marketing pages: `817-663-POOL (7665)` on first
  mention so nobody has to guess.

## One source of truth

Add a small shared module with the number in each form (dial href, plain display,
vanity display) and point every page and email at it, so the next change is one edit
instead of thirty.

## Where it changes

- Marketing pages: home, services, weekly pool service, all city landings, Frisco page.
- Forms and modals: quote modal, lead form, contract signing page.
- Legal: privacy, terms.
- Emails and texts: inspection confirmations, contract emails, receipts, reschedule
  and appointment notices, SMS compliance footer.
- SEO: LocalBusiness structured data in the site head and on city pages.

## Internal ops alerts

Several internal alert paths (error monitor, health checks, inventory alerts) text a
default staff number. I'll point those at the new number too, so nothing keeps ringing
the retired line.

## Still open from the last plan

The website→CRM lead handoff is coded and ready; it just needs the shared secret saved
on both sides and the CRM's lead endpoint to accept it. I'll pick that back up after
the phone change, or in parallel once you have the secret value.
