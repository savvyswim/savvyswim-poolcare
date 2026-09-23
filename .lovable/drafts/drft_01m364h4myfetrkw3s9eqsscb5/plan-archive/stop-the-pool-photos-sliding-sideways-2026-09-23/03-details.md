## Technical detail

- `src/pages/Index.tsx`, the mobile hero photo strip: replace `-mx-5 flex gap-3 overflow-x-auto px-5 pb-1` with a three column grid (`grid grid-cols-3 gap-2`), drop the fixed `w-32 shrink-0` on each photo in favour of `w-full`, and use a shorter aspect ratio (`aspect-3/4`) so the row stays compact. Update `sizes` to a viewport based value such as `(max-width: 1023px) 31vw, 11rem`.
- The desktop block at `lg:` already renders a static three column grid, so it is untouched.
- Verify at 390px and 440px wide: three photos visible, no horizontal scrollbar on the row, no page overflow, and the hero photo still preloads.
