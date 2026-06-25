## Why

Candidates need a structured way to track job applications and receive AI-powered analysis of each role — matching their profile against job descriptions to surface strengths, gaps, ATS keywords, and tailored CV/LinkedIn recommendations. This is the core value-delivery feature of Workita.

## What Changes

- New "My Candidatures" section in the nav allows users to create and manage job applications
- New candidature form accepts a job posting URL plus optional fields (company, role, seniority, location, work mode, industry, labels, status, notes)
- Server fetches the job description from the URL; AI extracts missing fields automatically
- AI analysis produces: company overview, role requirements, % match score, strengths, gaps, key differentiators, ATS keywords, CV recommendations, LinkedIn recommendations, and networking guidance
- Candidature and full analysis JSON are persisted; 10 selection process stages are auto-created
- Users can navigate to the Selection Process tracker directly from the analysis results

## Capabilities

### New Capabilities

- `new-candidature`: End-to-end flow for submitting a job URL, running AI analysis, and saving the candidature with all results and auto-created selection stages

### Modified Capabilities

- `onboarding-ai`: Analysis results show a banner when no candidate profile exists, encouraging the user to complete onboarding for a personalised match score

## Impact

- New Genkit flow: `analyzeJobFlow` in `src/flows/jobAnalysis.ts`
- New API route: `POST /api/candidatures`
- New API route: `GET /api/candidatures` (list for the hub page)
- DB: `candidatures` table (already exists); `candidature_stages` table (already exists); new `candidature_analysis` JSONB column on `candidatures`
- Frontend: new candidature hub page inside `#myCandidaturesSection`, form + results rendered client-side in `app.js`
- Dependencies: no new npm packages required (URL fetch via Node `fetch`; Genkit already present)
