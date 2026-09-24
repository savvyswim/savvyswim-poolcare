## Testing
There is no sign-up form on the website, so there's nothing to test sign-up against. Instead I'll test the real forms on /office in a browser:
1. Signing in without passing the check is blocked.
2. Signing in with the check passed works with the office account.
3. Forgot password works with the check.
4. A fake sign-in sent straight to our server with no check token is refused.

Cloudflare's always-pass test keys make steps 2 and 3 possible in the test browser. Your real keys stay in use on the live site.

## Limits to know
- Turnstile on its own blocks bots that use the website forms. It can't stop bots that skip the website and talk directly to the login service, because the login service doesn't have a Turnstile setting I can switch on.
- The right fix for fake accounts is to **turn off public sign-up** on the shared login service, since the website never uses it. But savvyswim.app shares that same login service. If the app lets customers sign themselves up, turning it off would break that. I'll leave it on unless you confirm the app only uses office-created accounts.

## Technical details
- Secrets: `TURNSTILE_SECRET_KEY` (server only) and `VITE_TURNSTILE_SITE_KEY` (the public site key).
- `src/components/Turnstile.tsx`: loads `challenges.cloudflare.com/turnstile/v0/api.js` once, only on the client, and returns the token through a callback. It resets after each submit.
- `src/lib/turnstile.server.ts`: `verifyTurnstile(token, ip)` posts to `siteverify` and checks `success` and the hostname.
- `src/lib/auth-gate.functions.ts`:
  - `signInWithCheck`: verifies the token, then calls the password sign-in on the server and returns the session.
  - `resetWithCheck`: verifies the token, then sends the reset email.
- `src/routes/office.tsx`: replace the direct sign-in and reset calls with the new functions, then call `supabase.auth.setSession` with the returned session.
- If the site key is missing, the form shows a clear notice instead of failing without explanation.
