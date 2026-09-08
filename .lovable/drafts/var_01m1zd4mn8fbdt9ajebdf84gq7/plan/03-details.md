## Technical detail

In `src/pages/Index.tsx`:

- Delete the `PROMISES` array (lines 38-43).
- Replace the bulleted block (lines 196-208) with a single paragraph in the same slot, keeping the `mt-8 border-t border-hairline pt-7` divider so spacing above the buttons is unchanged: a `<p className="max-w-xl text-[1.05rem] leading-relaxed sm:text-[1.15rem]">` reading "Weekly pool cleaning, equipment service, and repair across Dallas and Fort Worth."
- Nothing else in the hero changes: wordmark, tagline, photo row, and both call-to-action buttons stay as they are.

Verify with a type check and a load of the home page.
