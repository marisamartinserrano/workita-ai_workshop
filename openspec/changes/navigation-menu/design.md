## Context

The current app is a single Express-served HTML page (`src/public/index.html`) with vanilla JS (`app.js`) and CSS (`style.css`). The left panel currently holds flat journey buttons with no hierarchy. There is no routing — section switching is done by toggling CSS classes in JS. User data is fetched from `/api/session` on load.

The navigation menu must be implemented entirely in vanilla HTML/CSS/JS — no framework, no bundler.

## Goals / Non-Goals

**Goals:**
- Replace the flat journey button panel with a structured, hierarchical nav menu
- Implement collapsible groups (Profile, Candidatures) via CSS transitions + JS toggle
- Implement responsive behaviour (sidebar / rail / drawer) via CSS media queries + JS
- Display user avatar and name from existing `/api/session` response
- Maintain existing chat area and API wiring untouched

**Non-Goals:**
- Actual page routing (no URL changes yet — sections are still toggled in-page)
- Implementing content for new sections (Home, Profile, Candidatures, Closing, Glossary) — placeholders only
- Backend changes

## Decisions

### Decision: CSS transitions for collapse/expand
Use `max-height` CSS transition on collapsible group content with `overflow: hidden` and a 180ms `ease` curve. This satisfies the 200ms NFR without JS animation libraries.

**Alternatives considered:** JS-driven height calculation — rejected, adds complexity for no benefit in vanilla context.

### Decision: Responsive breakpoints via CSS classes + JS
Use CSS media queries for desktop/tablet layout switching. For mobile drawer, toggle a `.nav-open` class on `<body>` via JS hamburger button — the drawer uses `transform: translateX` transition.

**Alternatives considered:** Pure CSS `:checked` hack — rejected, harder to maintain and requires markup coupling.

### Decision: Active state management in JS
Track the active section in a JS variable (replacing the current `activeJourney`). On nav item click, update the variable, toggle `.active` classes, and render the appropriate content panel.

**Alternatives considered:** URL hash routing — deferred; the current app has no router and introducing one is out of scope for this change.

### Decision: User identity from existing `/api/session`
The `/api/session` endpoint already returns `{ user: { name, picture } }`. No backend change needed — read this in `loadSession()` and populate the nav footer.

## Risks / Trade-offs

- **No real routing** → Active state is purely JS-managed; browser back/forward won't work. Acceptable for now; routing is a future concern.
- **`max-height` transition** → Requires a hardcoded `max-height` value on the collapsible element. Use a generous value (e.g., `400px`) to avoid clipping. → Mitigation: set per group based on item count.
- **Mobile drawer overlay** → Requires a backdrop element to close drawer on outside click. → Mitigation: add a `.nav-backdrop` div that appears with the drawer and listens for click.

## Migration Plan

1. Update `index.html`: replace `<nav class="journey-panel">` with new `<nav class="sidebar">` structure
2. Update `style.css`: add sidebar/rail/drawer styles; remove old journey panel styles
3. Update `app.js`: add nav state management, collapse/expand, hamburger, active highlighting; preserve existing chat and API logic
4. Smoke test locally with `npx tsx src/index.ts`
5. Rebuild Docker image and push to Docker Hub
6. Redeploy on VM

**Rollback:** revert the three front-end files; no backend changes to undo.
