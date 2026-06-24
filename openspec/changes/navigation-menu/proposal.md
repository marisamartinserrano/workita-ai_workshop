## Why

The current app renders journeys as a flat list of buttons with no structural hierarchy or navigation context. Users have no sense of where they are, no way to see their identity, and no path to future sections beyond the initial journey list. A persistent, structured navigation menu is the foundational UI scaffold that all future features will build on.

## What Changes

- Replace the current left-side journey button panel with a structured navigation menu
- Add collapsible groups for Profile (Job Preferences, CV Analysis, LinkedIn Analysis) and Candidatures (My Candidatures)
- Display the logged-in user's avatar and name in the menu footer
- Move the logout action into the menu
- Hide the menu entirely on unauthenticated / login pages
- Add SPA-style section switching (no full page reload)
- Make the menu responsive: full sidebar on desktop, icon-only rail on tablet, hamburger drawer on mobile

## Capabilities

### New Capabilities

- `navigation-menu`: Persistent left-side navigation menu with collapsible groups, active-state highlighting, user identity display, logout, and responsive behaviour across desktop/tablet/mobile

### Modified Capabilities

- `chat-ui`: The chat area layout must adapt to the new sidebar — currently occupies the full right panel; needs to remain as the main content area alongside the new nav structure
- `google-sso`: User profile data (name, avatar) must be surfaced in the nav menu footer in addition to the current header display

## Impact

- `src/public/index.html` — restructure layout, replace journey panel with nav menu markup
- `src/public/style.css` — add sidebar, rail, drawer styles; remove old journey panel styles
- `src/public/app.js` — add nav state management, SPA section switching, collapse/expand logic, active highlighting
- No backend changes required — user data already available via `/api/session`
