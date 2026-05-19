# Development Guide

## Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- npm >= 9

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/marisamartinserrano/workita-ai_workshop.git
cd workita-ai_workshop
```

### 2. Start the database
```bash
docker-compose up -d
```

### 3. Backend setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 4. Frontend setup
```bash
cd frontend
npm install
npm start
```

## Ports
| Service  | Port |
|----------|------|
| Frontend | 3000 |
| Backend  | 3010 |
| Database | 5432 |
