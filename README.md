# Savvy Swim — pool service website

Marketing website for Savvy Swim, a residential pool cleaning, water care, and
equipment repair company serving the Dallas–Fort Worth area.

This project is the public website only. Everything transactional — the customer
portal, billing, checkout, and the staff CRM — lives in the Savvy Swim app at
`savvyswim.app`. Both share one backend, so a handoff is just a link.

## What the site does

- Explains weekly pool service, green pool recovery, equipment repair, filter
  cleans, and salt/automation work
- Local landing pages for each DFW service city, plus a "weekly pool service
  near me" hub
- Captures leads: free pool visit requests, the booking dialog, and the public
  lead endpoint at `POST /api/public/leads`
- Forwards every lead to the CRM so sales works one inbox
- Links customers and staff to their logins on `savvyswim.app`

## Stack

- TanStack Start (React 19, Vite 7), file-based routes in `src/routes`
- Tailwind CSS v4, tokens in `src/styles.css`
- Lovable Cloud backend for lead storage, notifications, and webhooks

## Brand

Riviera pool-club look: burgundy `#8E1F2C`, cream `#F4EFE3`, aqua `#1FA9BE`,
Anton/Oswald display type, square corners.

## Privacy

The CRM lead-capture embed only loads after a visitor accepts the cookie banner.
Visitors can change that choice from "Cookie settings" in the footer.
