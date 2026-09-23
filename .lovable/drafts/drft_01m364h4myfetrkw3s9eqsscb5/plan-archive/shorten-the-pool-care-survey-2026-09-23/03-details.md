## Technical detail

- `src/lib/survey-questions.ts`: delete the `pool_size` and `filter_cleaning` entries from `SURVEY_QUESTIONS`. Nothing else references those ids, so the numbering, progress count, validation and `formatAnswers` write up all follow from the list.
- No database change. The survey answers are stored as formatted text on the lead, so removing questions needs no schema work and leaves historic leads intact.
- Verify on a phone width: the survey page loads, shows six numbered questions, the header reads "0 of 6 answered", and a test submission still sends the answers through.
