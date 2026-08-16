# Fix the Swim Club membership checkout

## What's wrong

The "Claim the summer offer" / "Join in 60 seconds" buttons send visitors to a **hardcoded Stripe test payment link** (`buy.stripe.com/test_...`) that lives in `src/lib/app-links.ts`. Test links expire, which is exactly the "The link is no longer active" screen in your screenshot. Nothing about the site or the CRM is broken — the link itself is dead, and a test link could never take a real payment anyway.

## The fix

Stop hardcoding a Stripe link on the marketing site and let the CRM own the charge, the way every other transactional flow already does.

1. **Route the membership buttons to the CRM.** Every Swim Club CTA points at the app's membership join route (`savvyswim.app/join/swim-club`), carrying the button source and campaign attribution, instead of a raw Stripe URL. The CRM creates the Stripe checkout session with the current live price and redirects the customer there.
2. **Keep a configurable override.** If you'd rather use a Stripe payment link for now, setting `VITE_SWIM_CLUB_STRIPE_URL` still wins — but the default becomes the CRM route, so an expired link can never be the default again.
3. **Confirm the destination is live before shipping.** Check that the CRM's membership route responds. If that route doesn't exist yet in the CRM project, the buttons fall back to the booking form pre-tagged with the Swim Club plan so no visitor hits a dead end, and I'll tell you exactly what to add on the CRM side.
4. **Verify.** Click through the offer card, the popup prompt and the membership section on mobile and desktop and confirm each lands on a working checkout rather than the Stripe error page.

## What I need from you

The membership charge has to be created somewhere. Two ways:

- **CRM creates the checkout (recommended)** — the CRM already holds the customer record, so the membership can be tied to the right account and the $19.99/mo add-on stacks on the base service price automatically.
- **You paste a live Stripe payment link** — quickest, but the payment isn't linked to a customer record and someone has to reconcile it manually.

If you have a live payment link handy, say so and I'll wire it in as the override while the CRM route is built.

## Technical notes

- Files touched: `src/lib/app-links.ts` (default target), plus the CTA call sites in `src/pages/Index.tsx` and `src/components/SwimClubPrompt.tsx` if they need the fallback behavior.
- No database or pricing changes; the $19.99/mo Swim Club stacking rule is unchanged.
