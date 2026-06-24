## ADDED Requirements

### Requirement: Welcome message with user's first name
The Home page SHALL display a personalised welcome message using the user's first name retrieved from Google SSO.

#### Scenario: Authenticated user opens Home
- **WHEN** an authenticated user navigates to Home
- **THEN** the page shows "Welcome back, {firstName}!" using the name from the session

### Requirement: Stats panel
The Home page SHALL display a stats panel with four metrics: total applications submitted, applications currently in an interview stage, offers received, and average match percentage across all candidatures.

#### Scenario: User with candidatures views stats
- **WHEN** a user with candidatures navigates to Home
- **THEN** the stats panel shows correct totals for each metric

#### Scenario: User with no candidatures views stats
- **WHEN** a user with no candidatures navigates to Home
- **THEN** the stats panel shows zeros for all metrics

### Requirement: Active candidatures list
The Home page SHALL display a list of the user's active candidatures, each showing job title, company name, current stage, match percentage, and a link to the candidature detail.

#### Scenario: User with active candidatures
- **WHEN** a user with active candidatures navigates to Home
- **THEN** each candidature shows title, company, current stage, and match % colour-coded (green ≥75%, amber ≥50%, red <50%)

### Requirement: Empty state
When a user has no candidatures, the Home page SHALL display an empty state with a prompt to create their first candidature.

#### Scenario: First-time user with no candidatures
- **WHEN** a user who has never created a candidature navigates to Home
- **THEN** the empty state is shown with a "Create your first candidature" call-to-action

### Requirement: Quick-action shortcuts
The Home page SHALL include three quick-action buttons: "New Candidature", "Update Profile", and "Practice Quizzes", each navigating to the correct section.

#### Scenario: User clicks a quick action
- **WHEN** the user clicks "Practice Quizzes"
- **THEN** the app navigates to the Quizzes section
