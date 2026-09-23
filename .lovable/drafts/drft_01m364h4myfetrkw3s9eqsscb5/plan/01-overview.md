# Ask first, then a Monday to Friday 7 day picker

Right now the thank you page shows the day and time picker straight away, offers
Saturdays, and offers wide windows (morning, midday, afternoon).

The change:

1. Ask first. After the confirmation, the page asks "Would you like to pick your
   consultation day now?" with two answers: "Yes, pick a day" and "No, just call
   me". Nothing else shows until they answer.
2. Days: the next 7 days only, Monday to Friday. Weekends are not offered.
3. Times: three fixed start times, 7:00 AM, 8:00 AM and 9:00 AM.
4. Same day stays possible: today shows up only while there is still a start
   time at least two hours away, so an early morning visitor can ask for today.
5. If they answer "No, just call me", we thank them and the office still calls
   within one business day. Nothing is saved as a time.
