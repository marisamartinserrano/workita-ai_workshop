## 1. HTML Structure

- [x] 1.1 Add the cookie consent banner element to `src/public/index.html` (fixed bottom bar, hidden by default) with explanatory text, "Accept" button, and "Decline" button
- [x] 1.2 Add a page footer to `src/public/index.html` containing a "Cookie Settings" link

## 2. Styles

- [x] 2.1 Add banner styles to `src/public/style.css`: fixed bottom bar, background, text, button styles for Accept and Decline
- [x] 2.2 Add footer styles to `src/public/style.css`: subtle, unobtrusive, consistent with the app design

## 3. JavaScript Logic

- [x] 3.1 Add `initCookieConsent()` function to `src/public/app.js` that reads `localStorage.getItem('workita_cookie_consent')` on page load and hides the banner if a value is already stored
- [x] 3.2 Add click handler for the "Accept" button: sets `localStorage` key `workita_cookie_consent` to `"accepted"` and hides the banner
- [x] 3.3 Add click handler for the "Decline" button: sets `localStorage` key `workita_cookie_consent` to `"declined"` and hides the banner
- [x] 3.4 Add click handler for the "Cookie Settings" link: removes `workita_cookie_consent` from `localStorage` and re-displays the banner
- [x] 3.5 Call `initCookieConsent()` at page load (alongside `loadSession()`)

## 4. Verification

- [x] 4.1 Open the app in a fresh browser profile (no `localStorage`) and confirm the banner appears at the bottom
- [x] 4.2 Click "Accept" and confirm the banner disappears and `localStorage` contains `workita_cookie_consent = "accepted"`
- [x] 4.3 Reload the page and confirm the banner does not reappear
- [x] 4.4 Click "Cookie Settings" and confirm the banner reappears and `localStorage` key is cleared
- [x] 4.5 Click "Decline" and confirm the banner disappears and `localStorage` contains `workita_cookie_consent = "declined"`
