## ADDED Requirements

### Requirement: Job Preferences form
The Job Preferences section SHALL display a form with seven fields: Target Role (text), Seniority (select), Industry (text), Location (text), Preferred Work Mode (select), Salary Expectations (text), Preferred Companies (text). All fields SHALL be optional. A Save button SHALL persist data via POST /api/profile (upsert).

#### Scenario: User saves job preferences
- **WHEN** an authenticated user fills in any fields and clicks Save
- **THEN** the data is persisted to the profiles table and a confirmation is shown

#### Scenario: User reopens Job Preferences
- **WHEN** an authenticated user who has previously saved preferences navigates to Job Preferences
- **THEN** all previously saved values are pre-filled in the form

### Requirement: CV text area and Analyse button
The CV & Analysis section SHALL display a textarea for pasting CV text and an "Analyse CV" button. The button SHALL be disabled with the hint "Save your CV first to run analysis" when no CV text is saved. Clicking the enabled button SHALL call POST /api/profile/analyze-cv and display results inline.

#### Scenario: User pastes CV and analyses it
- **WHEN** a user pastes their CV, saves, and clicks "Analyse CV"
- **THEN** a loading indicator appears, then results display: extracted skills, experience summary, identified gaps, and ATS feedback

#### Scenario: Analyse button disabled without CV
- **WHEN** a user opens CV & Analysis with no CV text saved
- **THEN** the "Analyse CV" button is disabled and shows the hint "Save your CV first to run analysis"

### Requirement: LinkedIn URL and AI recommendations
The LinkedIn section SHALL display a URL input for the user's LinkedIn profile. Clicking "Get Recommendations" SHALL call POST /api/profile/analyze-linkedin and display recommendations inline. If no LinkedIn URL is saved, analysis SHALL still run from CV content with a note that results would be more specific with a URL.

#### Scenario: User gets LinkedIn recommendations with URL
- **WHEN** a user has provided a LinkedIn URL and clicks "Get Recommendations"
- **THEN** AI recommendations are shown with rationale for each suggestion

#### Scenario: LinkedIn recommendations without URL
- **WHEN** a user with no LinkedIn URL clicks "Get Recommendations"
- **THEN** recommendations are generated from CV content with a note that a LinkedIn URL would improve specificity

### Requirement: How LinkedIn works collapsible explainer
The LinkedIn section SHALL display a collapsible "How LinkedIn works for candidates" section above the recommendations, covering profile completeness, keyword matching, and recruiter search behaviour.

#### Scenario: User expands the explainer
- **WHEN** a user clicks "How LinkedIn works for candidates"
- **THEN** the explainer section expands to show the content

### Requirement: Profile persistence
All onboarding data (preferences, CV text, LinkedIn URL, analysis results) SHALL be persisted in the profiles table linked to the authenticated user. Re-saving SHALL upsert (not duplicate).

#### Scenario: User updates their profile
- **WHEN** a user who already has a saved profile changes their target role and saves
- **THEN** the existing record is updated and only one record exists for that user
