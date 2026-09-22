# Collably v0.3

This is the polished v0.3 build for GitHub Pages + Supabase.

## Included
- Working Home, Discover, Jobs, Messages, Notifications, Profile and Settings pages
- Buyer/worker account choice
- Demo accounts with browser persistence
- Supabase email/password authentication when configured
- Persistent profiles, jobs, applications and messages
- Supabase Storage portfolio uploads
- Realtime message refresh when Supabase Realtime is enabled
- Responsive desktop/mobile UI with consistent states and no placeholder navigation tabs

## Put it on GitHub Pages
Upload these files to the root of the `collably` repository:
`index.html`, `styles.css`, `app.js`, `config.js`, `supabase.sql`, `README.md`.

The website will run immediately in Demo Mode.

## Turn it into the real multi-user app
1. Create a Supabase project.
2. Run `supabase.sql` in Supabase SQL Editor.
3. Confirm the `portfolio` Storage bucket exists.
4. Copy your Supabase project URL and publishable/anon key into `config.js`.
5. Change `DEMO_MODE:true` to `DEMO_MODE:false`.
6. Configure email/password Auth and your GitHub Pages URL in Supabase Auth URL settings.
7. Enable Realtime for `messages` and `notifications` if you want live updates.

Never put a Supabase service_role/secret key in `config.js`. The browser should only use the publishable/anon key with Row Level Security enabled.

## Important
GitHub Pages itself is only the frontend host. Supabase supplies the real authentication, database, storage and realtime backend. Payments, contracts, moderation and production-grade anti-abuse controls are intentionally not included yet.
