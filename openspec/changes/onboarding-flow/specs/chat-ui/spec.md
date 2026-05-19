# Spec: Chat UI

## ADDED Requirements

### Requirement: Chat Interface

The web app SHALL display a chat interface when the candidate opens the browser.

#### Scenario: Initial load

- **WHEN** the candidate opens the app in the browser
- **THEN** a chat window is displayed
- **AND** the AI greeting message appears automatically

#### Scenario: Sending a message

- **WHEN** the candidate types a message and clicks Send (or presses Enter)
- **THEN** the message appears in the chat as a user bubble
- **AND** the AI responds in a model bubble

### Requirement: CV Upload

The UI SHALL provide a file upload control for the candidate to submit their CV.

#### Scenario: CV upload

- **WHEN** the candidate selects a file and clicks Upload CV
- **THEN** the file is sent to the server
- **AND** a confirmation message is sent automatically to the AI
