## ADDED Requirements

### Requirement: User can sign in with Google
The system SHALL support Google OAuth 2.0 authentication using the authorization code flow. Clicking "Sign in with Google" SHALL redirect the user to Google's consent screen and return them to the app as an authenticated user.

#### Scenario: Successful sign-in
- **WHEN** an unauthenticated user clicks "Sign in with Google"
- **THEN** the browser is redirected to Google's OAuth consent screen requesting the `profile` and `email` scopes

#### Scenario: OAuth callback completes sign-in
- **WHEN** Google redirects to `/auth/google/callback` with a valid authorization code
- **THEN** the system exchanges the code for tokens, creates or retrieves the user record, sets a signed session cookie, and redirects the user to `/`

#### Scenario: New user account created on first sign-in
- **WHEN** a Google account signs in for the first time
- **THEN** a new row is inserted into the `users` table with the Google `sub`, `email`, `name`, and `picture` fields

#### Scenario: Returning user account retrieved on sign-in
- **WHEN** a Google account that has previously signed in authenticates again
- **THEN** the existing `users` row is retrieved and the session is linked to it (no duplicate user created)

### Requirement: Anonymous data is merged on first sign-in
The system SHALL migrate journey progress, messages, and CV upload records from the user's anonymous session to their authenticated user account upon first sign-in.

#### Scenario: Anonymous progress preserved after sign-in
- **WHEN** a user has completed the Getting Started journey anonymously and then signs in for the first time
- **THEN** their journey progress and chat messages are re-keyed to their user account and remain visible after sign-in

#### Scenario: Merge is idempotent
- **WHEN** a user signs in and their user account already has data for a journey
- **THEN** the existing user data is preserved and the anonymous data for that journey is discarded

### Requirement: User can sign out
The system SHALL allow an authenticated user to end their session.

#### Scenario: Successful sign-out
- **WHEN** an authenticated user clicks "Sign out"
- **THEN** the server destroys the session, clears the session cookie, and redirects the user to `/`

#### Scenario: UI reflects signed-out state
- **WHEN** the page loads after sign-out
- **THEN** the header shows "Sign in with Google" and journey buttons are disabled

### Requirement: Authenticated state is reflected in the UI
The system SHALL display the signed-in user's name and profile picture in the header and enable journey interactions only for authenticated users.

#### Scenario: Header shows user identity when signed in
- **WHEN** an authenticated user loads the page
- **THEN** the header displays the user's Google profile picture and name, and shows a "Sign out" button

#### Scenario: Unauthenticated users cannot start journeys
- **WHEN** an unauthenticated user clicks any journey button
- **THEN** a message is shown in the chat area prompting them to sign in, and no AI call is made

#### Scenario: API rejects unauthenticated journey requests
- **WHEN** an unauthenticated request is made to `POST /api/chat` or `POST /api/progress`
- **THEN** the server responds with HTTP 401
