# Collably v0.6

Collably is a creator-workforce marketplace for finding online talent, posting jobs, messaging, managing projects and building a portfolio.

## What's new in v0.6

- Buyer and worker accounts with Supabase Auth
- Worker discovery by name, skills and tools
- Portfolio image/video uploads
- Job posting and applications
- Application acceptance + automatic project creation
- Active/completed/cancelled project tracking
- Buyer project management: description, budget, due date and status
- Worker project completion flow
- Reviews after completed projects
- Automatic worker rating averages from reviews
- Save/unsave jobs for workers
- Saved jobs section
- Personal dashboard with activity and project stats
- Notifications for applications, application updates and project status
- Real-time messaging
- Real-time project/review refresh
- Responsive desktop/mobile layout
- Profile editing and public portfolio/review display

## Install / update

1. Keep your existing `config.js` with your real Supabase URL and browser-safe publishable key.
2. Replace the files in your GitHub Pages repo with the files in this ZIP.
3. In Supabase SQL Editor, run your existing `supabase.sql` if you are setting up from scratch.
4. For an existing v0.5 database, run **`supabase_v0_6.sql` once** after the old schema.
5. Hard refresh the website with `Ctrl + Shift + R`.

### Important

Do not put a Supabase service-role/secret key in `config.js`. The browser should only use the publishable/anon client key.

Real payments are deliberately not faked in this version. A production payment system should use a secure backend and a provider such as Stripe rather than exposing secret payment keys in the browser.

## Main user flow

Buyer: discover worker → message → post job → receive applications → accept → project created → manage project → complete → review.

Worker: build profile → upload portfolio → discover jobs → save/apply → message → get accepted → work on project → complete → review.


## v0.6.1 upgrades
- Profile pictures using Supabase Storage bucket `avatars`.
- Clickable notification centre: message, application and project notifications open the relevant destination.
- Refreshed cards, buttons, avatars, notifications, gradients and mobile styling.
- Run `supabase_v0_6.sql` after the existing v0.6 SQL to add notification targets and avatar storage policies.
