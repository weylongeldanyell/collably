# Collably v0.5

A real multi-user-ready marketplace for creators, businesses and online workers.

## What changed from v0.3
- Real Supabase Auth integration for separate user accounts.
- Persistent PostgreSQL data for profiles, jobs, applications, conversations, messages and notifications.
- Row Level Security policies so users only modify data they are allowed to modify.
- Supabase Storage portfolio uploads.
- Realtime message refresh.
- Automatic profile creation after signup.
- Cleaner responsive UI and working navigation states.
- Demo mode remains available when Supabase is not connected.

## Important: v0.4 is multi-user AFTER Supabase is connected
GitHub Pages only hosts the frontend. The shared database/auth layer is Supabase. Once connected, two different people on two different devices can create separate accounts and see shared jobs, profiles and conversations.

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. In Supabase Auth, enable Email/Password.
4. Add your GitHub Pages URL to the Auth URL / redirect settings.
5. Copy your Supabase Project URL and Publishable Key into `config.js`.
6. Change `DEMO_MODE` to `false`.
7. Upload all files to the root of the GitHub repository.

Never use a `service_role` or secret key in `config.js`.

## Files
- `index.html` — app shell
- `styles.css` — polished responsive UI
- `app.js` — application logic
- `config.js` — Supabase connection settings
- `supabase.sql` — database, RLS, storage and realtime setup
- `logo.svg` — Collably logo/favicon

## Current scope
v0.5 adds a polished marketplace workflow on top of the v0.4 foundation. It includes:
- application cover messages and duplicate-application prevention
- buyer application management with accept flow
- automatic application notifications
- conversation preview updates and message notifications
- worker application tracking
- improved search routing and dashboard stats
- responsive visual polish and mobile improvements

The foundation supports:
- buyer and worker accounts
- persistent profiles
- searchable workers
- jobs
- applications
- direct buyer/worker conversations
- persistent messages
- realtime message refresh
- portfolio uploads
- notifications
- settings/profile editing

For a production marketplace, the next stage should add moderation/reporting, account recovery, email verification, application management UI, reviews, payments/escrow, contracts, project tracking, rate limiting and server-side validation.

## Custom domain
GitHub Pages supports custom domains. Configure the domain in Repository Settings → Pages, then add the DNS records at your domain provider.
