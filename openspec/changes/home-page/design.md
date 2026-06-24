## Context

The current app has a sidebar with a "Home" nav item that shows a "coming soon" placeholder bubble. The backend has no home-specific endpoint. The database has no candidatures table. This change introduces the first real content panel — a job search dashboard — replacing the placeholder.

## Goals / Non-Goals

**Goals:**
- Implement `GET /api/home` returning stats + candidatures for the authenticated user
- Add `candidatures` and `candidature_stages` tables to `db/init.sql`
- Render the Home dashboard in `app.js` when the user clicks Home
- Style the stats grid, candidatures list, empty state, and quick actions in `style.css`
- Auto-navigate to Home after login

**Non-Goals:**
- Full Candidature CRUD (only read from seed/manual data for now)
- New Candidature creation flow
- Profile editing flow

## Decisions

### Decision: Server-side `/api/home` endpoint
A dedicated `GET /api/home` route returns `{ user, stats, candidatures }` in one request. This keeps the frontend dumb — it fetches once and renders.

**Alternatives considered:** Multiple small endpoints (`/api/stats`, `/api/candidatures`) — rejected; adds round trips and complexity for no gain at this stage.

### Decision: Home dashboard as an inline panel (not a separate route)
The Home section is rendered as a `<div id="home-section">` toggled visible by `navigateTo('home')` in `app.js`, consistent with the existing SPA pattern (no URL changes).

**Alternatives considered:** URL-based routing — deferred; out of scope per design.md of navigation-menu.

### Decision: Candidature tables added to `db/init.sql`
`candidatures` and `candidature_stages` are added to the init script so they are created on first DB start. Existing data is unaffected; the tables start empty.

### Decision: Auto-navigate to Home after login
After `loadSession()` resolves with an authenticated user, call `navigateTo('home')` automatically so the first thing users see after login is their dashboard, satisfying FR-01.

## Risks / Trade-offs

- **Empty dashboard on first login** → mitigated by the empty state requirement (show prompt to create first candidature)
- **`db/init.sql` only runs on fresh volumes** → on the VM, the existing postgres volume already has the schema. A migration step is needed for the live deployment (run `CREATE TABLE IF NOT EXISTS` statements via `docker exec`).
- **No candidature creation UI yet** → stats will always show zeros until data is inserted manually or the New Candidature flow is built

## Migration Plan

1. Update `db/init.sql` with new tables
2. On VM: run migration SQL via `docker exec` against the existing postgres container
3. Deploy new app image
4. Verify `/api/home` returns correct shape

**Rollback:** revert `src/index.ts`, `src/public/*`, `db/init.sql`; drop new tables if needed.
