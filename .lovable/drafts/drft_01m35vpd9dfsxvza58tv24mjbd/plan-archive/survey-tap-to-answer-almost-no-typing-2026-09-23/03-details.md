## Technical notes

- `src/lib/survey-questions.ts`: `current_company` becomes `kind: "single"` with
  an option list plus "Other"; `frustration` becomes `kind: "multi"` (no
  `maxPicks`) with its own option list plus "Other". Both stay `optional: true`.
  A new field `otherOption?: string` marks which option opens a text box, and
  answers gain a companion key (`<id>_other`) holding the typed text.
- `visibleQuestions` is unchanged. `formatAnswers` merges the companion text
  into the printed answer, for example `Other: Aqua Clear Pools`, so the office
  and CRM notes read the same as before.
- `src/pages/Survey.tsx`: the option renderer already handles single and multi;
  add a conditional short input under a question when its `otherOption` is
  selected. The existing `kind: "text"` branch stays in place, unused for now
  but still supported.
- Progress bar counting is unchanged; optional questions never block submit.
- No database, API or route change. No em dash in any copy.

### Verification

Typecheck, then load `/survey` in the browser: confirm both questions render as
tappable options, "Other" reveals a text box, a submission with only name and
phone still reaches the thank you page, and the notes show the picked options.
Remove the test lead afterwards.
