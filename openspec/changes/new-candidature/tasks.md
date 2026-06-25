## 1. Database

- [x] 1.1 Add columns to `candidatures` in `db/init.sql`: `job_url TEXT`, `seniority VARCHAR(50)`, `location VARCHAR(255)`, `work_mode VARCHAR(50)`, `industry VARCHAR(255)`, `labels TEXT[]`, `additional_info TEXT`, `analysis JSONB`
- [x] 1.2 Add `status VARCHAR(20) NOT NULL DEFAULT 'pending'` column to `candidature_stages` in `db/init.sql`
- [ ] 1.3 Run `ALTER TABLE` migrations on the VM for all new columns

## 2. Genkit Flow

- [x] 2.1 Create `src/flows/jobAnalysis.ts` with Zod output schema covering: `company` (name, summary, industry, financialHealth, recentNews), `role` (title, seniority, location, workMode, industry, skills[], experienceLevel, salary), `matchPct` (number 0–100 or null), `strengths` (string[]), `gaps` (string[]), `differentiators` (string[]), `atsKeywords` ({keyword, tip}[]), `cvRecommendations` (string[]), `linkedinRecommendations` (string[]), `networkingGuidance` (string[])
- [x] 2.2 Implement `analyzeJobFlow` — accepts `{ jobText, cvText?, targetRole?, seniority? }`; prompts Gemini to extract all fields; returns null `matchPct` when no CV text provided

## 3. Backend

- [x] 3.1 Add `fetchJobDescription(url)` helper in `src/index.ts` — uses `fetch` with 10 s timeout, strips HTML tags, truncates to 8 000 chars
- [x] 3.2 Add `POST /api/candidatures` route — validates URL present; calls `fetchJobDescription`; loads candidate profile; calls `analyzeJobFlow`; inserts candidature row with all fields + analysis JSON + match_pct; inserts 10 `candidature_stages` rows (first with status `completed`, rest `pending`); returns candidature id + full analysis + `hasProfile` boolean
- [x] 3.3 Add `GET /api/candidatures` route — returns list of candidatures for the authenticated user (id, job_title, company, status, match_pct, job_url, created_at, current stage name)

## 4. Frontend — HTML

- [x] 4.1 Replace placeholder content in `#myCandidaturesSection` with three sub-views: list view (`#candListView`), form view (`#candFormView`), results view (`#candResultsView`)
- [x] 4.2 Build form view: URL input (required), plus optional fields — company, role/job title, seniority (select), location, work mode (select), industry, labels (text), status (select, default "Applied"), additional info (textarea); "Save candidature" primary button + "Cancel" secondary
- [x] 4.3 Build results view: no-profile banner (`#candNoProfileBanner`, dismissible), match % hero, company summary card, role requirements card (skills as chips, experience + salary labels), strengths list, gaps list, differentiators list, ATS keywords table (keyword + tip), CV recommendations list, LinkedIn recommendations list, networking guidance card; "Track Selection Process" CTA button at bottom

## 5. Frontend — CSS

- [x] 5.1 Add styles for the three sub-view containers and transitions (`.cand-view`)
- [x] 5.2 Add match % hero badge (large circle, colour-coded: ≥75 green, ≥50 amber, <50 red)
- [x] 5.3 Add analysis card styles: `.analysis-card` (white, border, border-radius, padding), section headings, ATS keyword table rows
- [x] 5.4 Add no-profile banner style (amber background, dismissible × button)
- [x] 5.5 Add networking guidance card style (teal left-border accent)

## 6. Frontend — JavaScript

- [x] 6.1 In `navigateTo('my-candidatures')`: load and render candidature list from `GET /api/candidatures`; show "New Candidature" button; wire view switching
- [x] 6.2 Implement `submitCandidature()` — validates URL field; shows animated progress bar (same pattern as CV/LinkedIn analysis, 4 cycling step labels); POSTs to `/api/candidatures`; on success renders results view
- [x] 6.3 Implement `renderCandidatureResults(data)` — populates all result panels; shows/hides no-profile banner based on `hasProfile`; wires "Track Selection Process" button (navigates to selection process for this candidature id — stub for now)
- [x] 6.4 Implement `renderCandidatureList(candidatures)` — renders list cards with match badge, company, role, status, current stage; "New Candidature" button switches to form view

## 7. Deploy

- [x] 7.1 Build and push Docker image
- [x] 7.2 Run DB migrations on VM
- [x] 7.3 Redeploy on VM and verify
