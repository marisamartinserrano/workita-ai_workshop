## Why

The sidebar has Job Preferences, CV Analysis, and LinkedIn Analysis sections but they all open generic AI chat flows with no structured data collection. There is no persistent candidate profile, so every AI interaction starts from scratch with no context about the user.

## What Changes

- Add `profiles` table to store job preferences, CV text, LinkedIn URL, and AI analysis results per user
- Replace the Job Preferences chat flow with a 7-field form (Role, Seniority, Industry, Location, Work Mode, Salary, Preferred Companies)
- Replace the CV Analysis chat flow with a CV text area + "Analyse CV" button that triggers AI analysis inline (skills, gaps, ATS feedback)
- Replace the LinkedIn Analysis chat flow with a LinkedIn URL field + AI recommendations + collapsible "How LinkedIn works" explainer
- Add `GET /api/profile` and `POST /api/profile` endpoints (upsert)
- Add `POST /api/profile/analyze-cv` and `POST /api/profile/analyze-linkedin` endpoints
- Add `cvAnalysisFlow` and `linkedinAnalysisFlow` Genkit AI flows

## Capabilities

### New Capabilities
- `candidate-onboarding`: Three profile sections (Job Preferences form, CV & Analysis, LinkedIn) with persistent storage and AI analysis

### Modified Capabilities
- `onboarding-ai`: Two new Genkit flows added — `cvAnalysisFlow` and `linkedinAnalysisFlow`
- `navigation-menu`: Job Preferences, CV Analysis, LinkedIn Analysis nav items now render profile sections instead of chat flows

## Impact

- `db/init.sql` — new `profiles` table
- `src/index.ts` — four new API routes
- `src/flows/cvAnalysis.ts` — new file, CV analysis Genkit flow
- `src/flows/linkedinAnalysis.ts` — new file, LinkedIn analysis Genkit flow
- `src/public/index.html` — three new content sections (replacing chat for those nav items)
- `src/public/style.css` — form, analysis results, collapsible explainer styles
- `src/public/app.js` — section rendering, form save/load, analyze triggers, results rendering
