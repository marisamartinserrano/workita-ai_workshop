## 1. Dependencies & Configuration

- [x] 1.1 Add `passport`, `passport-google-oauth20`, `express-session`, `connect-pg-simple` to `package.json` dependencies
- [x] 1.2 Add `@types/passport`, `@types/passport-google-oauth20`, `@types/express-session`, `@types/connect-pg-simple` to devDependencies
- [x] 1.3 Run `npm install` and verify `package-lock.json` is updated
- [x] 1.4 Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` to `docker-compose.yml` environment section
- [x] 1.5 Update `CLAUDE.md` environment variables section with the three new required vars

## 2. Database Schema

- [x] 2.1 Add `users` table to `db/init.sql` (columns: `id UUID PK`, `google_sub`, `email`, `name`, `picture`, `created_at`)
- [x] 2.2 Add `session` table to `db/init.sql` using the `connect-pg-simple` schema (or auto-create via `createTableIfMissing: true`)
- [x] 2.3 Add `user_id` nullable FK column to the `sessions` table in `db/init.sql`

## 3. Auth Module

- [x] 3.1 Create `src/auth.ts` — configure Passport with `GoogleStrategy`, `serializeUser`, `deserializeUser`
- [x] 3.2 Implement `serializeUser` to store `user.id` in session
- [x] 3.3 Implement `deserializeUser` to fetch user from DB by `id`
- [x] 3.4 Add `getOrCreateUser(googleProfile)` helper in `src/auth.ts` that upserts into `users` table on `google_sub`

## 4. Database Helpers

- [x] 4.1 Add `getOrCreateUser` query to `src/db.ts` (INSERT ... ON CONFLICT (google_sub) DO UPDATE)
- [x] 4.2 Add `mergeAnonymousData(anonymousSessionId, userId)` to `src/db.ts` — re-keys journey_progress, messages, cv_uploads rows to the user
- [x] 4.3 Add `getUserById(id)` query to `src/db.ts`

## 5. Express Middleware & Routes

- [x] 5.1 Replace custom cookie session middleware in `src/index.ts` with `express-session` + `connect-pg-simple` store
- [x] 5.2 Register `passport.initialize()` and `passport.session()` middleware in `src/index.ts`
- [x] 5.3 Add `GET /auth/google` route — calls `passport.authenticate('google', { scope: ['profile', 'email'] })`
- [x] 5.4 Add `GET /auth/google/callback` route — handles callback, merges anonymous data, redirects to `/`
- [x] 5.5 Add `GET /auth/logout` route — calls `req.logout()`, destroys session, redirects to `/`
- [x] 5.6 Add `requireAuth` middleware that returns HTTP 401 for unauthenticated requests
- [x] 5.7 Apply `requireAuth` to `POST /api/chat`, `POST /api/progress`, `GET /api/messages`, `POST /api/upload`
- [x] 5.8 Update `GET /api/session` to return `{ progress, user: { name, picture } | null }`

## 6. Frontend

- [x] 6.1 Update `GET /api/session` response handling in `app.js` to read `user` field
- [x] 6.2 When `user` is null, disable all journey buttons and show "Sign in to get started" message on click
- [x] 6.3 When `user` is present, show user's `picture` (avatar) and `name` in the header alongside a "Sign out" link
- [x] 6.4 Wire "Sign in with Google" button to `href="/auth/google"` (navigate, not fetch)
- [x] 6.5 Wire "Sign out" link to `href="/auth/logout"`
- [x] 6.6 Update `style.css` to style the user avatar and name in the header

## 7. Verification

- [ ] 7.1 Register `http://localhost:8080/auth/google/callback` as an authorized redirect URI in Google Cloud Console
- [x] 7.2 Rebuild Docker Compose and confirm both containers start healthy
- [ ] 7.3 Sign in with Google and verify user record appears in the `users` table
- [ ] 7.4 Verify anonymous journey data is preserved after sign-in (merge works)
- [ ] 7.5 Sign out and verify the header returns to "Sign in with Google" and journeys are disabled
- [x] 7.6 Verify `POST /api/chat` returns 401 when not signed in
