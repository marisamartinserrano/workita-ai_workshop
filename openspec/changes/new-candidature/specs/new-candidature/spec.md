## ADDED Requirements

### Requirement: Job posting URL is required to create a candidature
The system SHALL require a job posting URL when creating a new candidature. All other fields (company, role, seniority, location, work mode, industry, labels, status, additional info) SHALL be optional. When optional fields are left blank, the AI SHALL fill them from the job description.

#### Scenario: Submit with URL only
- **WHEN** user submits the new candidature form with only a URL
- **THEN** the server fetches the job description, AI fills missing fields, runs full analysis, and saves the candidature

#### Scenario: Submit without URL
- **WHEN** user submits the new candidature form without a URL
- **THEN** a validation error is shown and no API call is made

---

### Requirement: AI analyses the job description against the candidate profile
The system SHALL run a Genkit AI flow that produces a structured analysis including: company overview (name, products/services, industry, financial health, recent news), role requirements (required skills, experience level, expected salary), % match score (0–100), strengths, gaps, key differentiators, ATS keywords with incorporation tips, CV optimisation recommendations, LinkedIn profile recommendations, and networking guidance.

#### Scenario: Full analysis with complete profile
- **WHEN** a candidate with a complete profile (CV + preferences) submits a job URL
- **THEN** all analysis sections are populated and a % match score is shown

#### Scenario: Analysis without candidate profile
- **WHEN** a user without a saved profile submits a job URL
- **THEN** the AI still performs the analysis and a dismissible banner informs the user that results would be more personalised with a complete profile; % match is shown as N/A

#### Scenario: Analysis completes within time limit
- **WHEN** the user submits a job URL
- **THEN** the full AI analysis completes within 15 seconds

---

### Requirement: Candidature and analysis are persisted in the database
The system SHALL save the candidature record (job title, company, job URL, seniority, location, work mode, industry, labels, status, match %, additional info, and full analysis JSON) to the `candidatures` table.

#### Scenario: Candidature saved after analysis
- **WHEN** AI analysis completes successfully
- **THEN** the candidature row exists in the database with all extracted and user-provided fields and the full analysis JSON

---

### Requirement: Ten selection process stages are auto-created per candidature
The system SHALL automatically create 10 selection process stages for each new candidature in the `candidature_stages` table: Application submitted (status: completed), CV screening, Phone screen, Technical assessment, First interview, Second interview, Case study / assignment, Final interview, Offer received, Decision made (all status: pending).

#### Scenario: Stages created on save
- **WHEN** a new candidature is created
- **THEN** exactly 10 rows exist in `candidature_stages` for that candidature, with "Application submitted" marked completed and all others pending

---

### Requirement: User can navigate to the Selection Process tracker after analysis
The system SHALL provide a "Track Selection Process" action after analysis that navigates the user to the Selection Process view for the newly created candidature.

#### Scenario: Navigation after creation
- **WHEN** the user clicks "Track Selection Process" after analysis completes
- **THEN** the user is taken to the Selection Process page for this candidature with all 10 stages visible

---

### Requirement: New candidature form is embedded in the Candidatures hub
The system SHALL embed the new candidature form and results within the existing `#myCandidaturesSection` page, not on a standalone page.

#### Scenario: Form renders inside hub
- **WHEN** the user navigates to "My Candidatures"
- **THEN** the new candidature form is visible within the same section, alongside existing candidatures
