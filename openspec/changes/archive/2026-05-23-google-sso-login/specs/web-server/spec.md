## ADDED Requirements

### Requirement: Auth routes exposed
The server SHALL expose OAuth routes for Google sign-in at `/auth/google`, `/auth/google/callback`, and `/auth/logout`.

#### Scenario: Sign-in redirect
- **WHEN** a GET request is made to `/auth/google`
- **THEN** the server responds with HTTP 302 redirecting to Google's OAuth authorization endpoint

#### Scenario: Logout redirect
- **WHEN** a GET request is made to `/auth/logout`
- **THEN** the server destroys the session and responds with HTTP 302 redirecting to `/`

### Requirement: Session middleware uses Postgres store
The server SHALL use `express-session` backed by `connect-pg-simple` for session management, replacing the current custom cookie session approach.

#### Scenario: Session persists across requests
- **WHEN** a client sends a request with a valid signed session cookie
- **THEN** the server retrieves the session from the Postgres `session` table and attaches the user to `req.user`

### Requirement: API routes require authentication
The server SHALL reject requests to `POST /api/chat`, `POST /api/progress`, and `GET /api/messages` from unauthenticated clients.

#### Scenario: Unauthenticated API request rejected
- **WHEN** a request without a valid authenticated session is made to `POST /api/chat`
- **THEN** the server responds with HTTP 401 and a JSON error body

## MODIFIED Requirements

### Requirement: Root Route Response
The web server SHALL respond to GET requests at `/` with the Workita chat UI (static HTML). The previous "Hello World" response is replaced.

#### Scenario: Browser visits root
- **WHEN** a client sends a GET request to `http://localhost:8080/`
- **THEN** the server responds with HTTP 200
- **AND** the response body contains the Workita HTML application shell
