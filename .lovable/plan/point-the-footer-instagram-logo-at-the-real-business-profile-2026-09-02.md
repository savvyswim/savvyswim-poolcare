# Point the footer Instagram logo at the real business profile

The four footers already link to `https://www.instagram.com/hi.savvyswim/`, but the URL is hard-coded in each page, so it can drift. This makes the real account the single source of truth and tells search engines the profile belongs to the business.

## Changes

1. **One shared social constant** — add the Instagram profile URL and handle to the existing `src/lib/contact-info.ts` (e.g. `INSTAGRAM_URL = "https://www.instagram.com/hi.savvyswim/"`, `INSTAGRAM_HANDLE = "hi.savvyswim"`).
2. **Use it in the footers** — `src/pages/Index.tsx`, `Services.tsx`, `PoolCleaningPlano.tsx`, `PoolCleaningFrisco.tsx` import the constant instead of the literal URL. Keep the current icon + "Instagram" label, `target="_blank"`, `rel="noopener noreferrer"`, and the existing aria-label.
3. **Verified profile in structured data** — add `sameAs: [INSTAGRAM_URL]` to the LocalBusiness node in `src/lib/structured-data.ts` so Google associates the account with Savvy Swim.

No Instagram API/Graph connection, no embedded feed, no new secrets.

## Verification

- Load the homepage and confirm the footer logo opens the real profile in a new tab.
- Confirm the homepage JSON-LD includes the `sameAs` entry.
