## Context

Three sidebar sections (Job Preferences, CV Analysis, LinkedIn Analysis) currently open generic AI chat flows. There is no `profiles` table and no structured way to collect or persist candidate data. All AI interactions are stateless.

## Goals / Non-Goals

**Goals:**
- Persistent `profiles` table linked to `users`
- Job Preferences: replace chat with a 7-field form; save/load via `/api/profile`
- CV & Analysis: CV text area + "Analyse CV" button → inline results (skills, gaps, ATS)
- LinkedIn: URL field + AI recommendations + collapsible "How LinkedIn works" explainer
- Vanilla HTML/CSS/JS — no framework

**Non-Goals:**
- File upload for CV (text paste is sufficient; file upload is a future enhancement)
- Tab layout (three separate sidebar sections already exist — no need for a tabbed page)
- CV / LinkedIn analysis results linked to candidatures (future spec)

## Decisions

### Decision: Three separate sidebar sections instead of a tabbed page
The sidebar already has Job Preferences, CV Analysis, and LinkedIn Analysis as distinct nav items. Each renders its own `<div class="content-section">`. No tabs needed — navigation IS the tab switcher.

### Decision: Analyse buttons trigger on-demand, not on save
CV analysis and LinkedIn analysis are triggered by an explicit button click, not automatically on save. This avoids unexpected AI calls and keeps costs controlled.

### Decision: `profiles` table with JSONB columns for analysis results
CV analysis and LinkedIn analysis results are structured JSON. Storing as JSONB allows querying if needed and avoids a separate results table.

### Decision: "Analyse CV" button disabled when no CV saved
The button checks `savedCvText` (loaded from `/api/profile` on section open). If empty, it is `disabled` with a hint. This prevents wasted AI calls.

### Decision: LinkedIn recommendations generated from CV alone when no URL provided
Per FR-08b: if no LinkedIn URL is saved, analysis still runs using CV content + best practices, with a note to the user.

## Risks / Trade-offs

- **CV text can be large** — Gemini context window is large enough; no truncation needed for typical CVs
- **Analysis takes up to 10 seconds** — show a loading indicator; disable button during analysis
- **Profile migration** — existing postgres volume won't have `profiles` table; run `CREATE TABLE IF NOT EXISTS` via `docker exec` before deploying

## Migration Plan

1. Add `profiles` table to `db/init.sql`
2. Run `CREATE TABLE IF NOT EXISTS` migration on VM via `docker exec`
3. Add routes and AI flows
4. Update frontend
5. Push image and redeploy on VM
