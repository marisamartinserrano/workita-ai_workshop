# Tasks: Hello World Setup

## 1. Project dependencies

- [x] 1.1 Create `package.json` with Express, Genkit, tsx, and TypeScript dependencies
- [x] 1.2 Create `tsconfig.json` with strict TypeScript configuration

## 2. Application code

- [x] 2.1 Create `src/index.ts` with Express server listening on `PORT` (default 8080)
- [x] 2.2 Add GET `/` route returning "Hello World"

## 3. Verify

- [x] 3.1 Run `npm install` and confirm no errors
- [x] 3.2 Run `npx tsx src/index.ts` and confirm server starts on port 8080
- [x] 3.3 Confirm `curl http://localhost:8080` returns "Hello World"
- [ ] 3.4 Build Docker image and confirm container starts and responds on port 8080
