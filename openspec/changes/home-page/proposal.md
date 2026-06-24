## Why

After login, users land on an empty chat screen with no orientation. They need a dashboard that shows their job search progress at a glance and provides clear entry points to the most common actions.

## What Changes

- Add a Home page section rendered when the user navigates to "Home" in the sidebar
- Display a welcome message with the user's first name from Google SSO
- Show a stats panel: total applications, interviews in progress, offers received, average match %
- Show a list of active candidatures (title, company, stage, match %)
- Show an empty state with a CTA when there are no candidatures
- Add quick-action shortcuts: New Candidature, Update Profile, Practice Quizzes
- Add `/api/home` backend endpoint returning stats and candidatures
- Add `candidatures` and `candidature_stages` database tables

## Capabilities

### New Capabilities
- `home-page`: Dashboard shown after login — stats panel, active candidatures list, quick-action shortcuts, empty state

### Modified Capabilities
- `navigation-menu`: Home item now navigates to the Home Page dashboard instead of showing a "coming soon" placeholder

## Impact

- `src/public/index.html` — new `#home-section` panel rendered in the chat area
- `src/public/app.js` — `navigateTo('home')` renders the Home page instead of a placeholder bubble
- `src/public/style.css` — dashboard card, stats grid, candidature list, quick-action button styles
- `src/index.ts` — new `GET /api/home` route returning stats + candidatures
- `db/init.sql` — new `candidatures` and `candidature_stages` tables
- No changes to existing AI flows or auth
