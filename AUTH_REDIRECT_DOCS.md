# Authentication & Email Redirect Configuration

## Supabase Auth Redirect URLs

For email confirmation links (signup confirmation, password reset) to work correctly across environments, you must configure the following redirect URLs in your Supabase Dashboard (`Authentication > URL Configuration`):

### Development / Local
- `http://localhost:3000/login`
- `http://localhost:3000/reset-password`

### LAN Testing (Current Network)
- `http://192.168.1.6:3000/login`
- `http://192.168.1.6:3000/reset-password`

### Production (When Deployed)
- `https://<your-production-domain>/login`
- `https://<your-production-domain>/reset-password`

## Required Environment Variables

The application uses these variables for redirect URL construction:

- `NEXTAUTH_URL` (`.env` / `.env.local`): The base URL used by server-side auth actions.
- `NEXT_PUBLIC_SITE_URL` (`.env` / `.env.local`): The public site URL used for redirect links.

Both should match the environment where the user accesses the application. If a user accesses `http://192.168.1.6:3000`, the `.env.local` or runtime environment must set `NEXT_PUBLIC_SITE_URL=http://192.168.1.6:3000` (or rely on `NEXTAUTH_URL` as fallback) for email links to redirect correctly.

## Email Confirmation Flow

When `signup()` is called:
1. If `data.session` is present (auto-confirm enabled), the user is redirected to `/onboarding`.
2. If `data.session` is `null` (email confirmation required by Supabase), the user is redirected to `/login?message=check-email`.

The user must open the confirmation link from their email. The link points to the configured redirect URL (`/login`), which allows the session to be established. After confirmation, navigating to `/dashboard` or any protected route will load the user context correctly.

## Password Reset Flow

When `requestPasswordReset()` is called:
- The reset email contains a link pointing to `/reset-password` using the configured site URL.
- The user opens the link, enters a new password through the `updatePassword()` action (which calls `supabase.auth.updateUser({ password })`), and is redirected to `/login`.

This flow requires the Supabase redirect URL to be configured correctly for the user's access domain (localhost, LAN, or production).
