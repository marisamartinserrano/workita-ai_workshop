# Spec: Onboarding AI

### Requirement: Step 0 — Greeting

The AI SHALL greet the candidate on first load and ask for their name.

#### Scenario: Initial greeting

- **WHEN** the chat is opened with no prior messages
- **THEN** the AI introduces itself as Workita
- **AND** asks for the candidate's name

### Requirement: Step 1 — Collect Name and Role

The AI SHALL collect the candidate's name and the role they are applying for.

#### Scenario: Name provided

- **WHEN** the candidate provides their name
- **THEN** the AI addresses them by name
- **AND** asks what role or position they are applying for

#### Scenario: Role provided

- **WHEN** the candidate provides their role
- **THEN** the AI asks them to upload their CV using the upload button

### Requirement: Step 1 — CV Upload Acknowledgement

The AI SHALL acknowledge the CV upload and confirm next steps.

#### Scenario: CV uploaded

- **WHEN** the candidate uploads their CV
- **THEN** the AI acknowledges receipt of the CV
- **AND** informs the candidate it will guide them through the selection process
