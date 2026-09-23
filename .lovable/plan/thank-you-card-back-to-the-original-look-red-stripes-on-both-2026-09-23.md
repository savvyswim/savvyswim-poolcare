# Thank-you card: back to the original look, red stripes on both edges

## What changes
- **Square again**, like the original card. Right now it stretches tall and narrow.
- **Stripes end in red on both sides.** Use an odd number of stripes (red, cream, red ... red) so the left and right edges are both full red stripes. Right now the right edge cuts off on a cream stripe with a thin red sliver.
- **Stripes show at the top and bottom too**, the same as the original, with the blue panel centered and an even stripe border all the way around.
- **Type matches the original:** a large, flowing script "thank you", big tall condensed "YOUR POOL IS IN / GOOD HANDS." on two lines, bold "SAVVYSWIM.COM", then the phone number in plain type, and a slanted "see you soon" in the bottom right corner.
- **Colors match the original:** soft sky blue panel, deep burgundy text, brighter red stripes on cream.
- **Cleaner finish:** remove the thin inner box line, and give the card a softer shadow.

The wording and phone number stay the same. Nothing else on the thank-you page changes.

## Technical notes
- Only `src/components/ThankYouCard.tsx` changes.
- Stripes: `repeating-linear-gradient` sized so the width holds exactly 23 bands (12 red, 11 cream), starting and ending on red; `aspect-square`, panel inset about 6% on all sides.
- Headline in the Anton display font, `leading-[0.95]`, sized with container units; script uses Caveat at a larger size with a slight tilt; phone in the body font, not mono.
- Verify with a Playwright element screenshot of the card on `/thank-you` at desktop and phone widths.
