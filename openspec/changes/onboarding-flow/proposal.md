# Proposal: Onboarding Flow

## Why

Implement the first two steps of the Workita user flow: a chat interface where the candidate can interact with a Genkit-powered AI that greets them, collects their name and role, and requests their CV.

## What Changes

- Replace the plain "Hello World" response with a full chat UI served as a static HTML page
- Add a Genkit AI flow that drives the onboarding conversation
- Add a CV file upload endpoint
- Add multer for handling file uploads

## Capabilities

### New Capabilities
- `chat-ui`: Browser-based chat interface for the candidate to interact with the AI
- `onboarding-ai`: Genkit AI flow that greets the user, collects name and role, and requests CV upload

## Impact

- `src/index.ts`: replace plain response with static file serving + API routes
- `src/flows/onboarding.ts`: new file — Genkit onboarding flow
- `src/public/index.html`: new file — chat UI
- `src/public/style.css`: new file — styles
- `src/public/app.js`: new file — frontend logic
- `package.json`: add multer dependency
- `Dockerfile`: add uploads/ directory creation
