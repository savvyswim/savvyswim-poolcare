# Remove the Instagram feed block from the footer

Take out the embedded Instagram profile widget (the box showing the account header, follower count and photo grid). Keep only the small Instagram logo link that was already in the footer, so visitors still have a way to reach the profile.

## Changes

- Remove the `<InstagramProfileEmbed />` block and its import from:
  - `src/pages/Index.tsx`
  - `src/pages/Services.tsx`
  - `src/pages/PoolCleaningPlano.tsx`
  - `src/pages/PoolCleaningFrisco.tsx`
- Delete `src/components/InstagramProfileEmbed.tsx` (no other usage).
- Leave the existing footer Instagram icon link (`https://www.instagram.com/hi.savvyswim/`) untouched.

No backend, data, or layout changes elsewhere.
