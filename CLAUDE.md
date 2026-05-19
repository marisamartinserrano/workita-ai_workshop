# workita-ai_workshop — Claude Code Guide

## Project overview
Full-stack web application with a Node.js/TypeScript backend and React frontend.

## Structure
- `backend/` — Express API, Prisma ORM, domain-driven design
- `frontend/` — React SPA
- `docs/` — API spec and standards
- `docker-compose.yml` — PostgreSQL database

## Backend
- Entry point: `backend/src/index.ts`
- Dev server: `npm run dev` (ts-node-dev, hot reload)
- ORM: Prisma — run `npx prisma generate` after schema changes
- Tests: Jest — `npm test`

## Frontend
- Entry point: `frontend/src/App.js`
- Dev server: `npm start` (port 3000)
- Tests: `npm test`

## Database
Start with `docker-compose up -d`. Connection string in `backend/.env`.
