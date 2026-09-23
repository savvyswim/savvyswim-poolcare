## Technical notes

- New route `src/routes/survey.tsx` with its own page title, description and
  social metadata; the survey component lives in `src/pages/Survey.tsx` with the
  question data in `src/lib/survey-questions.ts`.
- Submission posts to the existing `POST /api/public/leads` endpoint. Contact
  fields map directly; the eight answers are formatted into `pool_details` and
  `notes` so they show in the CRM and on the leads dashboard without a database
  change. `source` is set to `survey`, and existing UTM, referrer and landing
  page attribution is passed through unchanged.
- Honeypot, elapsed time and consent text are sent the same way `LeadForm` sends
  them, so the endpoint's existing bot checks keep working.
- After a successful submit the page navigates to `/thank-you`.
- `/survey` is added to the sitemap generator so it can be indexed and used as a
  paid ad destination.
