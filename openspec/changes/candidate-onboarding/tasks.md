## 1. Database

- [x] 1.1 Add `profiles` table to `db/init.sql` (user_id, target_role, seniority, industry, location, work_mode, salary, preferred_companies, cv_text, linkedin_url, cv_analysis JSONB, linkedin_analysis JSONB, updated_at)
- [x] 1.2 Run migration on VM via `docker exec` to create the table on the live postgres volume

## 2. Backend — API Routes

- [x] 2.1 Add `GET /api/profile` route — requires auth, returns saved profile for current user (or empty object)
- [x] 2.2 Add `POST /api/profile` route — requires auth, upserts profile fields (preferences + cv_text + linkedin_url)
- [x] 2.3 Add `POST /api/profile/analyze-cv` route — requires auth, loads cv_text from profile, calls cvAnalysisFlow, saves result to cv_analysis column, returns result
- [x] 2.4 Add `POST /api/profile/analyze-linkedin` route — requires auth, loads profile, calls linkedinAnalysisFlow, saves result to linkedin_analysis column, returns result

## 3. AI Flows

- [x] 3.1 Create `src/flows/cvAnalysis.ts` — Genkit flow accepting cv_text, returning `{ skills, experience, education, gaps, atsFeedback }`
- [x] 3.2 Create `src/flows/linkedinAnalysis.ts` — Genkit flow accepting cv_text, linkedin_url?, target_role?, seniority?, returning `{ recommendations: [{ title, rationale, priority }], note? }`

## 4. Frontend — HTML

- [x] 4.1 Add `<div id="jobPreferencesSection" class="content-section hidden">` with 7-field form and Save button
- [x] 4.2 Add `<div id="cvAnalysisSection" class="content-section hidden">` with CV textarea, Save button, Analyse CV button, and results panel
- [x] 4.3 Add `<div id="linkedinSection" class="content-section hidden">` with LinkedIn URL input, Save button, collapsible explainer, Get Recommendations button, and results panel

## 5. Frontend — CSS

- [x] 5.1 Add `.profile-form` styles: label/input/select/textarea layout, field groups
- [x] 5.2 Add `.save-btn` primary and `.analyse-btn` secondary button styles
- [x] 5.3 Add `.form-hint` disabled hint text style
- [x] 5.4 Add `.analysis-results` panel styles: section headings, skill chips, gap list, ATS badge row
- [x] 5.5 Add `.collapsible-explainer` toggle + content styles (max-height transition)
- [x] 5.6 Add `.recommendation-card` styles (title, rationale, priority badge)
- [x] 5.7 Add `.toast` success notification style

## 6. Frontend — JavaScript

- [x] 6.1 Remove `job-preferences`, `cv-analysis`, `linkedin-analysis` from `SECTION_JOURNEY_MAP`
- [x] 6.2 Add `loadProfile()` helper — fetches `GET /api/profile`, caches result in `profileData`
- [x] 6.3 Update `navigateTo('job-preferences')` — show `#jobPreferencesSection`, populate form from `profileData`
- [x] 6.4 Update `navigateTo('cv-analysis')` — show `#cvAnalysisSection`, populate textarea, set Analyse button state
- [x] 6.5 Update `navigateTo('linkedin-analysis')` — show `#linkedinSection`, populate URL field, show cached analysis if present
- [x] 6.6 Add `saveProfile(fields)` — POST /api/profile, show toast on success, refresh `profileData`
- [x] 6.7 Add `analyzeCv()` — POST /api/profile/analyze-cv, show loading, render results in `#cvAnalysisResults`
- [x] 6.8 Add `analyzeLinkedin()` — POST /api/profile/analyze-linkedin, show loading, render results in `#linkedinResults`
- [x] 6.9 Add `renderCvResults(data)` and `renderLinkedinResults(data)` rendering functions
- [x] 6.10 Wire collapsible explainer toggle in LinkedIn section
- [x] 6.11 Wire all Save, Analyse CV, and Get Recommendations button event listeners

## 7. Deploy

- [x] 7.1 Rebuild Docker image and push to `marisamartinserrano/workita:latest`
- [x] 7.2 Redeploy on VM and verify profile sections load at `https://207.175.99.38.nip.io`
