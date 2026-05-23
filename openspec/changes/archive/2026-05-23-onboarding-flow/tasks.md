# Tasks: Onboarding Flow

## 1. Dependencies

- [x] 1.1 Add multer to package.json and install

## 2. Genkit onboarding flow

- [x] 2.1 Create `src/flows/onboarding.ts` with Genkit AI flow and system prompt
- [x] 2.2 Handle initial greeting (empty messages) and multi-turn conversation

## 3. Backend routes

- [x] 3.1 Update `src/index.ts` to serve static files from `src/public/`
- [x] 3.2 Add POST `/api/chat` route calling the onboarding flow
- [x] 3.3 Add POST `/api/upload` route handling CV file upload with multer

## 4. Frontend

- [x] 4.1 Create `src/public/index.html` with chat window and input area
- [x] 4.2 Create `src/public/style.css` with clean chat UI styles
- [x] 4.3 Create `src/public/app.js` with message sending, CV upload, and auto-greeting logic

## 5. Infrastructure

- [x] 5.1 Update Dockerfile to create `uploads/` directory
- [x] 5.2 Update CLAUDE.md with user flow documentation

## 6. Verify

- [ ] 6.1 Run locally — AI greets on load, responds to name and role inputs
- [ ] 6.2 Upload a CV — AI acknowledges it
- [ ] 6.3 Build Docker image and confirm full flow works on port 8080
