## Goal
Add the Cloudflare Turnstile "I am human" check so spam bots can't get through the login forms on savvyswim.com.

## What exists today
- savvyswim.com has **no public sign-up form**. The office creates customer and staff accounts from the office pages, and those accounts get invite emails.
- The website has two public login forms, both on the /office page: **Sign in** and **Forgot password**.
- Customers sign up on savvyswim.app, which is a separate project. I can't add the check there from here.

## What you will see
- A small Cloudflare box under the email and password fields on /office, on both Sign in and Forgot password. Most people pass it without clicking anything.
- The buttons stay greyed out until the check passes. If a check fails or times out, the form says: "Please confirm you are human and try again."
- Staff who create accounts from the office pages are already signed in, so they don't see the box.

## What I need from you
A free Turnstile widget from your Cloudflare account (Turnstile, then Add widget), with the domains savvyswim.com, www.savvyswim.com and lovable.app. When I start, a secure box will ask you for the two keys it gives you: the **Site Key** and the **Secret Key**.
