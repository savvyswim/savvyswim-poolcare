# Consultation times: Monday to Friday, 8 AM to 6 PM

## What changes
- **Days:** Monday to Friday only, as it is today.
- **Times:** the 7:00, 8:00 and 9:00 AM choices are replaced by hourly arrival times from **8:00 AM to 5:00 PM**. The last visit starts at 5:00 PM so it finishes by 6:00 PM.
- **Layout:** the times show in a tidy grid: Morning (8 to 11 AM), Midday (12 to 1 PM) and Afternoon (2 to 5 PM). This keeps ten buttons easy to scan on phones.
- **Wording:** the line under "Pick your consultation" becomes "Monday to Friday, arrivals from 8:00 AM to 5:00 PM."
- **Same day visits:** these still work, and only times at least two hours away are shown.
- **Your office emails and the schedule** show the new times automatically.

## Technical notes
- `src/lib/consultation-slots.ts`: `START_TIMES` becomes 8 through 17, one entry per hour, with ids such as `8am` and `1pm`. Each gets a label and a group detail. The weekend skip and the `LEAD_HOURS` logic stay the same.
- `src/components/ConsultationPicker.tsx`: update the subtitle copy and the comment. The time buttons go in a responsive grid (2 columns on phones, 5 on desktop).
- Server-side checks use `findConsultChoice`, so any old 7 AM choice is rejected automatically.
- Verify: typecheck, then a Playwright screenshot of `/thank-you?kind=survey&ref=SS-26-1042` at desktop and phone widths.
