## Why

Workita needs to identify users across sessions to persist journey progress, chat history, and CV uploads against a real identity rather than an anonymous cookie. Google SSO is the natural first auth method given our target audience of job candidates, and it unblocks the full personalisation roadmap.

## What Changes

- Add Google OAuth 2.0 sign-in flow (server-side, authorization code flow)
- Replace the anonymous session cookie with an authenticated user identity
- Show a functional "Sign in with Google" button in the header
- Protect journey data under the signed-in user's account
- Graceful fallback: unauthenticated users can still view the UI but cannot start journeys

## Capabilities

### New Capabilities

- `google-sso`: OAuth 2.0 sign-in with Google — authorization endpoint, callback handler, session token, sign-out

### Modified Capabilities

- `web-server`: Session middleware now resolves a user identity (authenticated or anonymous); API routes enforce authentication for journey interactions

## Impact

- **Backend**: New OAuth routes (`/auth/google`, `/auth/google/callback`, `/auth/logout`); session middleware updated to read user from DB; new `users` table in Postgres
- **Frontend**: Sign-in button becomes functional; UI shows user name/avatar when signed in; unauthenticated users see a sign-in prompt instead of journey buttons
- **Dependencies**: `passport`, `passport-google-oauth20`, `express-session`, `connect-pg-simple` (session store)
- **Database**: New `users` table; `sessions` table linked to `users`
- **Config**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` environment variables required
