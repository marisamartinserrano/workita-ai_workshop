## Context

Workita currently identifies users via an anonymous UUID stored in a `workita_session` cookie, persisted in the `sessions` table. Journey progress, messages, and CV uploads are all keyed to this anonymous session. There is no way to link data across devices or browsers, and the "Sign in with Google" header button is a non-functional stub.

The app runs as a single Express server behind Docker Compose. The database is PostgreSQL 16. The stack has no existing auth layer.

## Goals / Non-Goals

**Goals:**
- Implement Google OAuth 2.0 (authorization code flow) so users can sign in with their Google account
- Persist a `users` table and link sessions to authenticated users
- Make the Sign in / Sign out header button functional
- Migrate anonymous session data to the user's account on first sign-in
- Show user's name and avatar in the header when signed in
- Block journey interactions for unauthenticated users (redirect to sign-in)

**Non-Goals:**
- Email/password authentication
- Multi-provider OAuth (GitHub, LinkedIn) — Google only for now
- Role-based access control
- Mobile app auth flows
- Linking multiple Google accounts to one Workita account

## Decisions

### 1. Passport.js + passport-google-oauth20

**Decision**: Use `passport` with the `passport-google-oauth20` strategy.

**Rationale**: Passport is the de facto Express auth middleware. The Google strategy handles the OAuth dance (redirect, callback, token exchange) with minimal boilerplate. Alternatives like raw `google-auth-library` would require hand-rolling the redirect/callback flow.

### 2. Server-side sessions with connect-pg-simple

**Decision**: Use `express-session` backed by `connect-pg-simple` (stores sessions in Postgres), replacing the current custom cookie approach.

**Rationale**: The current `workita_session` cookie stores a raw UUID and the session middleware manually queries the `sessions` table. `express-session` provides signing, rotation, and expiry out of the box. Storing sessions in Postgres (rather than Redis or memory) keeps the infrastructure footprint minimal — we already have Postgres running. Alternatives: JWT (stateless, but requires token rotation strategy); Redis (fast, but adds a third container).

### 3. Merge anonymous data on first sign-in

**Decision**: When an authenticated user signs in for the first time, re-key their anonymous session's rows (journey_progress, messages, cv_uploads) to the new `users` record.

**Rationale**: Users may have already started the Getting Started journey before signing in. Discarding that data would be jarring. The merge happens once at sign-in and is idempotent.

### 4. Unauthenticated users see UI but cannot interact

**Decision**: The page loads for anonymous visitors but journey buttons are disabled with a "Sign in to get started" message rather than a hard redirect.

**Rationale**: A soft block lets users preview the app before committing to sign in, which reduces friction and improves conversion. API routes return 401 for unauthenticated requests; the frontend handles this gracefully.

## Risks / Trade-offs

- **OAuth credentials in env vars** → Mitigation: document required vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`) in CLAUDE.md and docker-compose; never bake into image.
- **Session fixation** → Mitigation: `express-session` regenerates the session ID on login by default.
- **Anonymous→user data merge conflicts** → Mitigation: use `ON CONFLICT DO NOTHING` when merging journey_progress rows so existing user data wins.
- **connect-pg-simple requires a `session` table** → Mitigation: add `CREATE TABLE session` to `db/init.sql`; the library provides the schema.
- **Google OAuth requires a public callback URL** → Mitigation: for local dev, use `http://localhost:8080/auth/google/callback`; document that this must be registered in the Google Cloud Console.

## Migration Plan

1. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` to docker-compose environment (or `.env` file).
2. Register `http://localhost:8080/auth/google/callback` as an authorized redirect URI in the Google Cloud Console.
3. `db/init.sql` changes apply automatically on first `docker compose up` (new volume) — for existing volumes, run migration manually or recreate the volume.
4. Rollback: revert to previous image tag; the `users` and `session` tables are additive and do not break the old schema.

## Open Questions

- Should unauthenticated users be able to start journeys at all, or should the first click on any journey trigger the sign-in flow?
- What happens to anonymous session data for users who never sign in (long-term cleanup)?
