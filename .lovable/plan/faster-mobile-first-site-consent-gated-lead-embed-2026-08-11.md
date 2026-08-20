# Faster, mobile-first site + consent-gated lead embed

Three things in one pass: make the site quicker and easier to use on a phone, put the CRM lead-capture embed behind a consent banner, and tighten the lead form. Plus a cleanup: the project README gets rewritten as Savvy Swim pool service.

## 1. Cookie / consent banner (compliance)

- The embed `savvyswim.app/embed/savvy-leads.js` is currently loaded for every visitor from the site head. It moves out of the head.
- A slim bottom banner appears on first visit: short plain-language line, "Accept" and "Decline", link to the privacy policy. Square corners, brand burgundy/cream — matches the site, not a generic grey bar.
- Choice is remembered locally. Accept injects the embed immediately; decline never loads it. A small "Cookie settings" link in the footer lets a visitor change their mind.
- Banner is loaded lazily and sits above the fold-bottom without pushing content or shifting layout.

## 2. Lead form: mobile keyboards, inline validation, cleaner flow

Applies to the request-inspection page and the booking dialog.

- Correct mobile keyboards and autofill: numeric keypad for phone and ZIP, email keyboard, one-time-code-free `autocomplete` values on every field, "next"/"go" key on the phone keyboard.
- Errors show inline under the field that caused them instead of only as a toast, the first bad field scrolls into view and gets focus, and the field is marked for screen readers.
- Phone number formats as you type; ZIP accepts digits only.
- Submit button becomes full-width and thumb-height on phones, with a clear sending state that can't be double-tapped.
- Failure state stays on the form with the entered values intact and offers a tap-to-call fallback, rather than a bare toast.
- Thank-you state gets the reference number, the confirmed day and window, an add-to-calendar and call button, and scrolls to the top so it is visible immediately on a phone.

## 3. Speed and phone friendliness

- Defer non-critical work on mobile: the cursor follower and other pointer-only flourishes don't run on touch devices at all.
- Below-the-fold homepage sections get skipped-until-needed painting so the first screen renders sooner.
- Audit tap targets and text sizes across the homepage, services, weekly-service hub and city pages: minimum comfortable tap height, no horizontal overflow, no iOS zoom-on-focus.
- Trim the first-load payload: keep dialogs and the map preview off the initial download, load the map only when an address is chosen.
- Re-check hero image sizing on small screens and confirm fonts don't block first paint.
- Report before/after numbers from a mobile-profile speed run.

## 4. Pool-only cleanup

- `README.md` gets replaced with the Savvy Swim pool service description. A full-text sweep confirms the app, content, and metadata are pool-only.

## Technical notes

- New `src/lib/consent.ts` (storage + `loadLeadEmbed()`) and `src/components/ConsentBanner.tsx`, mounted lazily in `src/routes/__root.tsx`; the `<script src=".../savvy-leads.js">` entry comes out of `head().scripts` while the `preconnect` stays.
- Form work is in `src/pages/RequestInspection.tsx` and `src/components/BookingDialog.tsx` — existing zod schema is reused, with issues mapped to per-field state instead of a single toast. No change to what gets stored or to the CRM lead forwarding.
- Mobile polish is Tailwind/`src/styles.css` only, reusing the existing `.perf-section` utility.
