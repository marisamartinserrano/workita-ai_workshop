## Context

The `candidatures` table and `candidature_stages` table already exist in the schema. The home dashboard already reads from these tables. No existing route handles creation or full AI analysis of a candidature. The candidate profile (`profiles` table) holds CV text and job preferences that will be used to personalise the analysis.

## Goals / Non-Goals

**Goals:**
- Accept a job posting URL and optional metadata, fetch the page server-side, run Genkit AI analysis, persist result
- Display all analysis panels inside the existing My Candidatures section
- Auto-create 10 selection stages with correct initial statuses
- Work gracefully with no candidate profile (show banner, skip % match)

**Non-Goals:**
- Spec 06 (Glossary) auto-generation — deferred
- Selection Process tracker UI — handled in a separate spec
- Editing or deleting candidatures after creation
- Pagination of the candidature list

## Decisions

### 1. URL fetch happens server-side
Client passes the URL; server uses Node.js `fetch` to retrieve the HTML and strips it to plain text before passing to Gemini. Rationale: avoids CORS issues; keeps credentials/keys server-side; simpler than a browser-side headless approach.

### 2. Single Genkit flow for all analysis
One `analyzeJobFlow` in `src/flows/jobAnalysis.ts` receives job text + candidate profile and returns the full structured result in a single Gemini call. Rationale: one round-trip is faster and easier to type with Zod schemas. If the 15-second NFR becomes a problem, the flow can be split later.

### 3. DB schema additions to `candidatures`
Add columns: `job_url TEXT`, `seniority VARCHAR(50)`, `location VARCHAR(255)`, `work_mode VARCHAR(50)`, `industry VARCHAR(255)`, `labels TEXT[]`, `additional_info TEXT`, `analysis JSONB`. The existing `job_title`, `company`, `status`, `match_pct` columns are reused. `job_title` and `company` are currently `NOT NULL`; they will be filled by AI when the user leaves them blank, so the constraint is satisfied before insert.

### 4. `candidature_stages` status column added
The existing table has no `status` column. Add `status VARCHAR(20) NOT NULL DEFAULT 'pending'` to record whether each stage is completed or pending.

### 5. Frontend: single-page hub with view toggling
My Candidatures section shows a list view by default. A "New Candidature" button switches to the form view. After analysis, results are shown in a results view. Navigation between views is purely client-side (no URL change). Rationale: consistent with the single-page architecture already in use.

## Risks / Trade-offs

- **Job URL access** → Some job boards block server-side fetches (LinkedIn, Greenhouse behind auth). Mitigation: graceful error message asking user to paste the job description text as fallback; fetch timeout of 10 s.
- **Analysis time** → Gemini response may exceed 15 s for complex JDs. Mitigation: show animated progress bar (same pattern as CV/LinkedIn analysis); 30 s server timeout on the route.
- **`job_title NOT NULL` constraint** → If AI fails to extract a title, insert will fail. Mitigation: default to "Unknown Role" if AI returns empty.

## Migration Plan

1. `ALTER TABLE candidatures ADD COLUMN ...` for all new columns (idempotent `IF NOT EXISTS`)
2. `ALTER TABLE candidature_stages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`
3. Existing rows in `candidature_stages` default to `'pending'` — no data migration needed
4. Deploy new image; existing home dashboard query is unaffected (it only reads `job_title`, `company`, `status`, `match_pct`, and current stage)
