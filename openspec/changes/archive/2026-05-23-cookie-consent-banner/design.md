## Context

Workita is a single-page Express app with a vanilla JS frontend (`src/public/app.js`). There are currently no cookie consent controls. The session cookie (`connect.sid`) is strictly necessary and may be set without consent; any future analytics or tracking cookies must not be set until the user has opted in.

The frontend has an existing modal pattern (used for the Google Drive consent proposal) that provides a suitable visual reference. The implementation is entirely client-side — no new backend routes or dependencies are needed.

## Goals / Non-Goals

**Goals:**
- Show a consent banner on first visit before the user interacts with any non-essential cookie.
- Persist the user's choice in `localStorage` under a key `workita_cookie_consent` with value `"accepted"` or `"declined"`.
- Suppress the banner on subsequent page loads when a stored choice is found.
- Provide a "Cookie Settings" link that clears the stored choice and re-shows the banner, enabling the user to change their mind.
- Gate any future analytics/tracking scripts on `localStorage.getItem('workita_cookie_consent') === 'accepted'`.

**Non-Goals:**
- Granular consent categories (e.g., separate toggles for analytics vs. marketing) — a simple accept/decline is sufficient for the current feature set.
- Server-side consent recording — the decision lives only in `localStorage` for now.
- Blocking the session cookie on decline — it is strictly necessary for the app to function and is exempt under ePrivacy rules.
- Integration with a Consent Management Platform (CMP) — overkill for this stage.

## Decisions

### D1 — Storage: `localStorage`, not a cookie

Consent choice is stored in `localStorage` rather than a cookie. Storing consent in a cookie is circular (you'd be setting a cookie before consent), and `localStorage` is sufficient for a single-origin web app.

*Alternative considered*: A separate `workita_consent` cookie — rejected for the circular dependency reason above.

### D2 — Banner placement: fixed bottom bar

A fixed bottom bar is less intrusive than a modal overlay and is the most common pattern recognised by users. It does not block interaction with the app while visible.

*Alternative considered*: Centred modal overlay (like the Drive consent) — rejected because cookie consent is a passive notice, not a blocking gate. The user can continue using the app while the banner is visible.

### D3 — No new dependencies

Implemented entirely in the existing `index.html` / `style.css` / `app.js` files. No cookie consent library is needed at this scale.

### D4 — "Cookie Settings" link in footer

A small footer is added to the app with a single "Cookie Settings" link. Clicking it clears `localStorage` and re-shows the banner. This satisfies the regulatory requirement to allow withdrawal of consent.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `localStorage` cleared by user wipes consent record | Banner re-appears on next visit — this is correct and expected behaviour. |
| Banner re-appears after private/incognito sessions | Expected — `localStorage` is not persisted in private mode. Acceptable. |
| Future analytics scripts added without checking consent | Document the gating pattern clearly in `CLAUDE.md`; banner already sets the standard. |

## Migration Plan

Pure frontend change — no deploy steps beyond shipping the updated static files. No rollback complexity; reverting the three frontend files is sufficient.

## Open Questions

*(none — scope is well-defined)*
