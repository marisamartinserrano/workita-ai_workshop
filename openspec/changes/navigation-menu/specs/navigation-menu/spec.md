## ADDED Requirements

### Requirement: Persistent sidebar on authenticated pages
The navigation menu SHALL always be visible on the left side of the screen on all authenticated pages. It SHALL be hidden and replaced with a minimal top bar on unauthenticated pages (login/redirect).

#### Scenario: Authenticated user sees sidebar
- **WHEN** a logged-in user loads any page
- **THEN** the left-side navigation menu is visible with all sections

#### Scenario: Unauthenticated user does not see sidebar
- **WHEN** a user is not logged in
- **THEN** the navigation menu is not rendered and the user sees only the login prompt

### Requirement: Structured top-level sections
The navigation menu SHALL include the following top-level sections in order: Home, Profile (collapsible), Candidatures (collapsible), Closing, Glossary, Quizzes.

#### Scenario: All sections present
- **WHEN** a logged-in user views the navigation menu
- **THEN** all six top-level sections are visible in the specified order

### Requirement: Collapsible Profile group
The Profile section SHALL be a collapsible group containing three sub-items: Job Preferences, CV Analysis, LinkedIn Analysis. It SHALL auto-expand when the active section is within the Profile group.

#### Scenario: Profile group expands
- **WHEN** a user clicks the Profile group label
- **THEN** the sub-items (Job Preferences, CV Analysis, LinkedIn Analysis) expand into view within 200ms

#### Scenario: Profile group auto-expands on child route
- **WHEN** the active section is Job Preferences, CV Analysis, or LinkedIn Analysis
- **THEN** the Profile group is automatically expanded

### Requirement: Collapsible Candidatures group
The Candidatures section SHALL be a collapsible group. The group label SHALL itself link to `/candidatures`. It SHALL auto-expand when the current route starts with `/candidature`. Sub-item: My Candidatures → `/candidatures`.

#### Scenario: Clicking Candidatures label navigates to hub
- **WHEN** a user clicks the Candidatures group label
- **THEN** they are taken to `/candidatures` without a full page reload

#### Scenario: Candidatures group auto-expands on candidature routes
- **WHEN** the active section starts with `/candidature`
- **THEN** the Candidatures group is expanded and highlighted

### Requirement: Active item highlighting
The currently active section SHALL be visually highlighted in the navigation menu so users always know where they are.

#### Scenario: Active section is highlighted
- **WHEN** a user navigates to any section
- **THEN** that section's menu item is visually distinguished from inactive items

### Requirement: SPA navigation
Clicking any menu item SHALL navigate the user to the corresponding section without a full page reload.

#### Scenario: Navigation without reload
- **WHEN** a user clicks a menu item
- **THEN** the content area updates and the URL reflects the new section without a browser reload

### Requirement: User identity in menu footer
The navigation menu SHALL display the logged-in user's Google profile picture and display name in the footer area.

#### Scenario: User sees their identity
- **WHEN** a logged-in user views the navigation menu
- **THEN** their Google avatar and display name are visible in the menu footer

### Requirement: Logout from menu
The navigation menu SHALL include a logout action in the footer area.

#### Scenario: User logs out from menu
- **WHEN** a user clicks the logout option in the menu footer
- **THEN** their session is terminated and they are redirected to the login page

### Requirement: Responsive layout
The navigation menu SHALL adapt its layout based on screen size: full sidebar (w-64) on desktop (lg+), icon-only rail (w-16) on tablet (md), hamburger drawer on mobile.

#### Scenario: Desktop shows full sidebar
- **WHEN** the viewport is desktop width (≥1024px)
- **THEN** the full sidebar with labels is visible

#### Scenario: Tablet shows icon rail
- **WHEN** the viewport is tablet width (768px–1023px)
- **THEN** only icons are shown without text labels

#### Scenario: Mobile shows hamburger
- **WHEN** the viewport is mobile width (<768px)
- **THEN** a hamburger button is shown and the menu slides in as a drawer overlay

### Requirement: Transition speed
All menu transitions (collapse/expand, drawer open/close) SHALL complete in under 200ms.

#### Scenario: Collapse animation is fast
- **WHEN** a user toggles a collapsible group
- **THEN** the animation completes within 200ms

### Requirement: Keyboard navigation
All menu items SHALL be keyboard-navigable and meet WCAG 2.1 AA accessibility standards.

#### Scenario: Keyboard user navigates menu
- **WHEN** a user navigates the menu using Tab and Enter keys
- **THEN** focus moves through all menu items in logical order and Enter activates the focused item
