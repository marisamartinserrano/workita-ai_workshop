## 1. Database

- [x] 1.1 Add `candidatures` table to `db/init.sql` (id, user_id, job_title, company, status, match_pct, created_at)
- [x] 1.2 Add `candidature_stages` table to `db/init.sql` (id, candidature_id, stage_name, entered_at)
- [x] 1.3 Run migration SQL on VM via `docker exec` to create tables on the live postgres volume

## 2. Backend

- [x] 2.1 Add `GET /api/home` route to `src/index.ts` — requires auth, returns `{ user, stats, candidatures }`
- [x] 2.2 Implement stats query: total applications, interview count (from stages), offers received, avg match %
- [x] 2.3 Implement candidatures query: join candidatures + latest stage per candidature, return list for current user

## 3. Frontend — HTML

- [x] 3.1 Add `<div id="home-section" class="content-section hidden">` inside `.chat-section` in `index.html`
- [x] 3.2 Add welcome heading `<h2 id="homeWelcome">` inside the home section
- [x] 3.3 Add stats grid with four stat cards (applications, interviews, offers, avg match %)
- [x] 3.4 Add quick-action buttons: New Candidature, Update Profile, Practice Quizzes
- [x] 3.5 Add candidatures list container `<div id="candidaturesList">`
- [x] 3.6 Add empty state `<div id="homeEmpty" class="hidden">` with CTA inside the candidatures container

## 4. Frontend — CSS

- [x] 4.1 Add `.content-section` base styles (flex column, padding, overflow-y auto)
- [x] 4.2 Add `.stats-grid` — 2×2 responsive grid of stat cards
- [x] 4.3 Add `.stat-card` styles (border, padding, label + value typography)
- [x] 4.4 Add `.quick-actions` row with `.quick-action-btn` styles
- [x] 4.5 Add `.candidature-card` styles (title, company, stage, match % badge)
- [x] 4.6 Add match % badge colour coding: green ≥75%, amber ≥50%, red <50%
- [x] 4.7 Add `.empty-state` styles (centered, muted, CTA button)

## 5. Frontend — JavaScript

- [x] 5.1 Add `renderHome(data)` function in `app.js` — populates welcome, stats, candidatures, empty state
- [x] 5.2 Update `navigateTo('home')` in `app.js` — fetch `/api/home`, call `renderHome()`, show `#home-section`
- [x] 5.3 Wire quick-action buttons to call `navigateTo('quizzes')`, `navigateTo('job-preferences')`, `navigateTo('my-candidatures')`
- [x] 5.4 After `loadSession()` resolves with an authenticated user, auto-call `navigateTo('home')`
- [x] 5.5 Hide `.chat-placeholder` and `.chat-window` when showing the home section; restore on other nav

## 6. Deploy

- [x] 6.1 Rebuild Docker image and push to `marisamartinserrano/workita:latest`
- [x] 6.2 Redeploy on VM and verify Home dashboard loads at `https://207.175.99.38.nip.io`
