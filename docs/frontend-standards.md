# Frontend Standards

## Stack
- React 18
- React Router v6
- Bootstrap 5 + React Bootstrap
- Axios for HTTP requests

## Conventions
- Components in `src/components/`
- Routes defined in `App.js`
- API base URL from environment variable `REACT_APP_API_URL`
- Functional components with hooks (no class components)

## Environment
Create `frontend/.env.local`:
```
REACT_APP_API_URL=http://localhost:3010
```
