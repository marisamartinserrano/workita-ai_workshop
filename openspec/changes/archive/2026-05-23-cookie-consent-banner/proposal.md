## Why

Workita sets session cookies and may use analytics or tracking technologies, which requires informed user consent under GDPR, ePrivacy Directive, and similar regulations. Without a cookie consent banner, the app is non-compliant and exposes users and operators to legal risk.

## What Changes

- A cookie consent banner is displayed at the bottom of the page on first visit (before any non-essential cookies are set).
- The banner explains that Workita uses cookies for session management and, if enabled, for analytics.
- The user can accept all cookies or decline non-essential ones.
- The user's choice is stored in `localStorage` so the banner is not shown again on subsequent visits.
- If the user declines, only strictly necessary cookies (session cookie) are set; no analytics or tracking scripts are loaded.
- A "Cookie Settings" link in the footer allows the user to revisit and change their consent at any time.

## Capabilities

### New Capabilities

- `cookie-consent`: Display a cookie consent banner on first visit; record and respect the user's choice; expose a settings entry point to change consent.

### Modified Capabilities

*(none — no existing spec-level requirements change)*

## Impact

- **Frontend only**: HTML (`src/public/index.html`), CSS (`src/public/style.css`), JS (`src/public/app.js`).
- No backend changes required — cookie consent decision is stored client-side in `localStorage`.
- If analytics scripts are added in future, they must gate on the stored consent value before loading.
