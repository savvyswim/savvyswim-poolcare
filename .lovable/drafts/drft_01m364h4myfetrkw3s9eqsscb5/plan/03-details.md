## Details

- The day buttons cover the next 7 calendar days and simply skip Saturday and
  Sunday, so the visitor sees four or five weekday choices.
- Each time is a fixed start, shown as "7:00 AM", "8:00 AM", "9:00 AM", and
  saved with the request as the arrival start time.
- Same day: today only appears when at least one of those start times is still
  two hours out. After that, the list begins with the next weekday.
- Everything else on the page stays as it is, including the reference number,
  the call button and the save our contact button.
- Note on published hours: the site and Google listing currently say we open at
  8:00 AM. Adding a 7:00 AM start is fine, and if you want, I can update the
  published opening time to 7:00 AM so the two match.

## Technical notes

- `src/lib/consultation-slots.ts`: replace the morning/midday/afternoon windows
  with three fixed starts (7, 8, 9), drop the Saturday list, and limit the range
  to 7 calendar days, weekdays only. The same day rule becomes "start hour is at
  least two hours ahead".
- `src/components/ConsultationPicker.tsx`: add the yes/no step before the day
  and time grid, and render the three start times.
- `src/lib/consultation-slot.functions.ts` and `consultation-slot.server.ts`
  keep working unchanged; they validate the choice against the same shared list
  and save it to the request, log it and email the office.
