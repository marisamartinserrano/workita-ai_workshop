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

## 7. User Flow

| Step | Actor | Action |
|---|---|---|
| 0 | Candidate | Opens the web app — chat interface loads at `http://localhost:8080` |
| 0 | AI (Workita) | Auto-greets the candidate and asks for their name |
| 1 | Candidate | Types their name |
| 1 | AI (Workita) | Addresses them by name, asks for the role they are applying for |
| 1 | Candidate | Types their role |
| 1 | AI (Workita) | Asks them to upload their CV |
| 1 | Candidate | Uploads CV via the Upload CV button |
| 1 | AI (Workita) | Acknowledges the CV and confirms next steps |

## 8. API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves the chat UI |
| `POST` | `/api/chat` | Sends messages to the Genkit onboarding flow |
| `POST` | `/api/upload` | Accepts CV file upload (multer, stored in `uploads/`) |

## 9. References

- [Genkit docs](https://genkit.dev/docs/get-started)
- Context documentation: `docs/`
