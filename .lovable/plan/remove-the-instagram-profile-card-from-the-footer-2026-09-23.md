# Remove the Instagram profile card from the footer

Take out the large Instagram profile card (the one showing the photo grid,
follower count and "View this profile on Instagram") from the bottom of every
page. Keep the simple Instagram link that sits lower in the footer row with the
other links.

## Changes

- `src/components/SiteChrome.tsx`: remove the `InstagramProfileEmbed` render and
  its import. Leave the `InstagramLink` in the footer links row untouched.
- Delete `src/components/InstagramProfileEmbed.tsx`, since nothing else uses it.

Nothing else on the footer or any page changes.
