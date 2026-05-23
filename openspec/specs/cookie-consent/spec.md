# Specification: Cookie Consent

## Requirement: Banner Shown on First Visit

The system SHALL display a cookie consent banner at the bottom of the page on first visit when no consent choice is recorded in `localStorage`.

### Scenario: No prior consent — banner visible

- **WHEN** the page loads
- **AND** `localStorage` does not contain the key `workita_cookie_consent`
- **THEN** the cookie consent banner is visible at the bottom of the viewport

### Scenario: Prior consent recorded — banner hidden

- **WHEN** the page loads
- **AND** `localStorage` contains `workita_cookie_consent` with value `"accepted"` or `"declined"`
- **THEN** the cookie consent banner is not displayed

## Requirement: Banner Content

The cookie consent banner SHALL include a plain-language explanation of cookie usage, an "Accept" button, and a "Decline" button.

### Scenario: Banner displays required elements

- **WHEN** the cookie consent banner is visible
- **THEN** it contains a text description mentioning cookies and their purpose
- **AND** it contains a clearly labelled "Accept" button
- **AND** it contains a clearly labelled "Decline" button

## Requirement: Accept Consent

The system SHALL record the user's acceptance and hide the banner when the user clicks "Accept".

### Scenario: User accepts cookies

- **WHEN** the user clicks the "Accept" button on the cookie consent banner
- **THEN** `localStorage` is set with key `workita_cookie_consent` and value `"accepted"`
- **AND** the banner is removed from view

## Requirement: Decline Consent

The system SHALL record the user's decline and hide the banner when the user clicks "Decline".

### Scenario: User declines cookies

- **WHEN** the user clicks the "Decline" button on the cookie consent banner
- **THEN** `localStorage` is set with key `workita_cookie_consent` and value `"declined"`
- **AND** the banner is removed from view

## Requirement: Cookie Settings Entry Point

The system SHALL display a "Cookie Settings" link that allows the user to re-open the consent banner and change their choice at any time.

### Scenario: Cookie Settings link resets and re-shows banner

- **WHEN** the user clicks the "Cookie Settings" link
- **THEN** the `workita_cookie_consent` entry is removed from `localStorage`
- **AND** the cookie consent banner is displayed again

## Requirement: Non-Essential Cookie Gating

The system SHALL NOT load any non-essential scripts or set any non-essential cookies until the user has accepted consent.

### Scenario: Non-essential scripts not loaded on decline

- **WHEN** `localStorage` contains `workita_cookie_consent` with value `"declined"`
- **THEN** no analytics or tracking scripts are loaded or executed

### Scenario: Non-essential scripts may load on accept

- **WHEN** `localStorage` contains `workita_cookie_consent` with value `"accepted"`
- **THEN** any analytics or tracking scripts gated on consent are permitted to load
