# Workita — Claude Code Guide

## 1. Project Overview

**Workita** is a job companion application that provides step-by-step AI-powered guidance for job candidates throughout the selection process. It uses Google's Genkit framework to orchestrate AI flows and deliver personalised support at each stage of the hiring journey.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) |
| AI Framework | [Genkit](https://genkit.dev/) (`genkit`, `@genkit-ai/google-genai`) |
| AI Model | Google Gemini (via `@genkit-ai/google-genai`) |
| Runtime | Node.js v20+ |
| Container | Docker |
| Package manager | npm |

### Key dependencies

```bash
npm install genkit @genkit-ai/google-genai
npm install -D typescript tsx
npm install -g genkit-cli
```

### Environment variables

```
GEMINI_API_KEY=<your Gemini API key>
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
SESSION_SECRET=<random string for session signing>
```

## 3. Project Structure

```
workita-ai_workshop/
├── src/
│   ├── index.ts          # Express entry point — API routes + static serving
│   ├── flows/
│   │   └── onboarding.ts # Genkit onboarding AI flow
│   └── public/           # Frontend static files served by Express
│       ├── index.html
│       ├── style.css
│       └── app.js
├── uploads/              # Temporary CV file storage (gitignored)
├── docs/                 # Context documentation
├── openspec/             # OpenSpec spec-driven change management
│   ├── changes/          # Active and archived changes
│   └── specs/            # Canonical specifications
├── .claude/              # Claude Code commands and skills
├── Dockerfile            # Container definition
├── CLAUDE.md             # This file
└── README.md
```

## 4. Development Commands

### Docker (primary)

```bash
docker build -t workita .
docker run -p 8080:8080 -e GEMINI_API_KEY=your_key workita
```

The `GEMINI_API_KEY` must be passed at runtime — never bake it into the image.

### Local (without Docker)

```bash
npx tsx src/index.ts                              # Run the app
genkit start -- npx tsx --watch src/index.ts      # Run with Genkit Dev UI (hot reload)
```

Genkit Developer UI runs at `http://localhost:4000` — use it to test and debug flows.

### Ports

| Service | Port |
|---|---|
| Web app | 8080 |
| Genkit Dev UI | 4000 |

## 5. Code Conventions

- **TypeScript strict mode** — all code must be fully typed, no `any`
- **English only** — all code, comments, docs, and commit messages in English
- **Genkit flows** — AI logic must be encapsulated in typed Genkit flows with Zod input/output schemas
- **Small steps** — one task at a time, incremental changes preferred over large rewrites
- **No comments** unless the WHY is non-obvious

## 6. OpenSpec Workflow

This repo uses OpenSpec for spec-driven development. **Always create a spec before writing code.**

| Command | When to use |
|---|---|
| `/opsx:propose` | Starting any new feature or change |
| `/opsx:apply` | Implementing tasks from an approved spec |
| `/opsx:explore` | Thinking through a problem before proposing |
| `/opsx:archive` | Closing out a completed change |

Specs live in `openspec/changes/<name>/` during development and are archived to `openspec/changes/archive/` on completion.

## 7. User Journeys
There will be multiple user journeys covering different hiring stages (e.g., application, interview prep, offer negotiation) and helping the candidate to improve the chances to get hired. 
Each journey will have its own Genkit flow and corresponding UI interactions. 
The initial focus is on the **getting started** journey, where candidates receive guidance on CV submission and role selection.
Journeys will be designed to be modular and extensible, allowing us to easily add new stages or update existing ones based on user feedback and evolving hiring practices.
The user can take multiple times the same journey (e.g., apply to multiple roles) and the system will keep track of their progress and context across sessions.
When the user has completed a journey, it will be marked as completed in the system and it will be signaled in the UI.
Journeys will be designed to be as interactive and engaging as possible, leveraging the capabilities of the Gemini model to provide personalized and context-aware guidance to candidates throughout their hiring process.
Journeys will be represented as buttons in the UI except for the "log in" journey, allowing users to easily select and start the journey they want to take. Each button will correspond to a specific Genkit flow that guides the user through the relevant tasks and interactions for that stage of the hiring process.
Each journey will be modelled as an spec for OpenSpec, allowing us to manage the development and evolution of each journey in a structured and transparent way. This will also enable us to track changes, gather feedback, and ensure that each journey meets the needs of our users effectively.
The journeys are:
Block 0: Log in
- **Log in**: The user can log in to the system using Google SSO. This will allow the system to keep track of the user's progress and context across sessions and to provide a more personalized experience. For example, if the user has already completed the "Getting Started" journey, the system can skip it and suggest the next relevant journey based on the user's profile and preferences.
Block I: Getting Started
- **Getting Started**: Guidance on CV submission and role selection. This journey must be the first one: If the user starts another journey without having completed the Getting Started one, the system will prompt the user to complete it first. For example, if the user clicks on "Interview Preparation" before completing "Getting Started", the system will display a message like "Please complete the Getting Started journey first to provide us with the necessary information about your background and preferences."
- **Quizzes**: Interactive quizzes to help candidates to improve their professional network, learn about the company culture, learn about the domain of the company, the specific role they are applying for, etc.
Block II: Application
- **Improve CV**: Based on the CV and the links to the job position(s) submitted by the candidate, the system will provide personalized guidance tailored to the candidate, company, seniority and role for the candidate to get noticed by the recruiters and to pass the ATS (Applicant Tracking System such as Taleo, SmartRecruiters and Greenhouse). For example, the system can provide guidance on how to optimize the CV with the right keywords, how to structure it, etc.
- **Improve LinkedIn**: Based on the LinkedIn profile and the links to the job position(s) submitted by the candidate, the system will provide personalized guidance tailored to the candidate, company, seniority and role for the candidate to get noticed by the recruiters and to pass the ATS (Applicant Tracking System such as Taleo, SmartRecruiters and Greenhouse) and to harmonize it with the CV. For example, the system can provide guidance on how to optimize the LinkedIn profile with the right keywords, how to structure it, etc.
Block III: Interview Preparation
- **Interview with Recruiter**: Simulated interview with a recruiter to help candidates prepare for the real interview. The system can provide feedback on the candidate's answers and guidance on how to improve.
- **Technical Interview**: Simulated technical interview based on the rol e.g. product manager, frontend developer, data analyst. The system can provide feedback on the candidate's answers and guidance on how to improve.
- **Use case Interview**: Simulated use case interview based on the role e.g. product manager, frontend developer, data analyst. The system can provide feedback on the candidate's answers and guidance on how to improve.
- **Team Interview**: Simulated interview with potential team members to help candidates prepare focusing on Product Lifecycle Development, ways of working, managing conflicts, agile, DevOps. The system can provide feedback on the candidate's answers and guidance on how to improve.
- **Interview with Hiring Manager**: Simulated interview with a hiring manager
- **Culture Fit Interview**: Simulated interview focused on assessing the candidate's fit with the company culture, values, and mission. The system can provide feedback on the candidate's answers and guidance on how to improve.
- **Stakeholder Interview**: Simulated interview with potential stakeholders to help candidates prepare focusing on stakeholder management, communication, influence, etc. The system can provide feedback on the candidate's answers and guidance on how to improve.
Block IV: Closing
- **Salary Negotiation**: Guidance on how to negotiate salary and benefits effectively, including salary benchmark based on the location, company, role and level of seniority. The system can provide personalized advice based on the candidate's profile, the company's typical compensation packages, and industry standards. 
- **Counteroffer Handling**: Guidance on how to handle counteroffers from current employers, including evaluating the offer, communicating with the current employer, and making informed decisions. The system can provide personalized advice based on the candidate's situation and goals.
- **Feedback**: Based on the feedback received previously by the candidate and during the hiring process, the system will provide personalized guidance to the candidate on how to improve their chances to get hired. For example, if the candidate received feedback that their CV is not clear enough, the system can provide guidance on how to improve it.
Blocks should appear on the UI with different naming:
- "Block 0: Log in" should not appear
- "Block I: Getting Started" should appear as "Getting Started"
- "Block II: Application" should appear as "Application"
- "Block III: Interview Preparation" should appear as "Interview Preparation"
- "Block IV: Closing" should appear as "Closing"
Whenever the user hovers a journey button, a tooltip should appear with a short description of the journey. For example, when the user hovers the "Interview Preparation" button, a tooltip can appear with the text "Prepare for your interviews with personalized guidance and simulated practice sessions."

## 8. API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves the chat UI |
| `POST` | `/api/chat` | Sends messages to the Genkit onboarding flow |
| `POST` | `/api/upload` | Accepts CV file upload (multer, stored in `uploads/`) |

## 9. References

- [Genkit docs](https://genkit.dev/docs/get-started)
- Context documentation: `docs/`
