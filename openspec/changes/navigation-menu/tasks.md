## 1. HTML Structure

- [x] 1.1 Replace `<nav class="journey-panel">` in `index.html` with new `<nav class="sidebar">` skeleton
- [x] 1.2 Add top-level nav items: Home, Closing, Glossary, Quizzes
- [x] 1.3 Add collapsible Profile group with sub-items: Job Preferences, CV Analysis, LinkedIn Analysis
- [x] 1.4 Add collapsible Candidatures group with sub-item: My Candidatures
- [x] 1.5 Add sidebar footer with avatar `<img>`, user name `<span>`, and logout `<a>`
- [x] 1.6 Add hamburger button (`<button class="nav-hamburger">`) and backdrop `<div class="nav-backdrop">` for mobile drawer

## 2. CSS Styles

- [x] 2.1 Add desktop full sidebar styles (`width: 16rem`, fixed left, full height)
- [x] 2.2 Add tablet icon-rail styles via `@media (max-width: 1023px)` — hide labels, shrink to `width: 4rem`
- [x] 2.3 Add mobile drawer styles via `@media (max-width: 767px)` — off-screen by default, slide in with `.nav-open`
- [x] 2.4 Add hamburger button and backdrop styles
- [x] 2.5 Add collapsible group styles using `max-height` transition (180ms ease) with `overflow: hidden`
- [x] 2.6 Add `.active` highlight style for active nav items
- [x] 2.7 Remove old journey panel styles

## 3. JavaScript — Nav State & Interaction

- [x] 3.1 Add hamburger click handler: toggle `.nav-open` on `<body>`, show/hide backdrop
- [x] 3.2 Add backdrop click handler to close mobile drawer
- [x] 3.3 Add collapse/expand toggle for Profile group (click group label → toggle `max-height`)
- [x] 3.4 Add collapse/expand toggle for Candidatures group with same pattern
- [x] 3.5 Add active item tracking: on nav item click, remove `.active` from all items, add to clicked item
- [x] 3.6 Wire nav item clicks to show the correct content panel (replacing current journey button logic)
- [x] 3.7 Auto-expand Profile group when active section is a Profile sub-item
- [x] 3.8 Auto-expand Candidatures group when active section starts with `candidature`

## 4. User Identity

- [x] 4.1 In `loadSession()`, populate sidebar footer avatar `src` and name `textContent` from `data.user`
- [x] 4.2 Show sidebar footer only when user is authenticated; hide when logged out

## 5. Accessibility

- [x] 5.1 Add `aria-expanded` attribute to collapsible group toggles, updated on expand/collapse
- [x] 5.2 Ensure all nav items are reachable and activatable via keyboard (Tab + Enter)
- [x] 5.3 Add `aria-current="page"` to the active nav item

## 6. Smoke Test & Deploy

- [x] 6.1 Run app locally with `npx tsx src/index.ts` and verify all nav items render
- [x] 6.2 Verify collapsible groups expand/collapse within 200ms
- [x] 6.3 Verify responsive breakpoints (desktop / tablet / mobile) in browser dev tools
- [x] 6.4 Verify user avatar and name appear after login
- [x] 6.5 Rebuild Docker image and push to `marisamartinserrano/workita:latest`
- [x] 6.6 Redeploy on VM and verify at `https://207.175.99.38.nip.io`
