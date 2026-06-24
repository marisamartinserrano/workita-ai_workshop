## ADDED Requirements

### Requirement: CV analysis flow
The system SHALL provide a cvAnalysisFlow that accepts CV text and returns: extracted skills list, experience summary, education summary, identified profile gaps, and ATS optimisation feedback.

#### Scenario: CV analysis returns structured results
- **WHEN** cvAnalysisFlow is called with CV text
- **THEN** it returns a structured object with skills, experience, education, gaps, and atsFeedback fields

### Requirement: LinkedIn analysis flow
The system SHALL provide a linkedinAnalysisFlow that accepts CV text, optional LinkedIn URL, target role, and seniority, and returns a list of LinkedIn improvement recommendations each with a title, rationale, and priority.

#### Scenario: LinkedIn analysis with URL
- **WHEN** linkedinAnalysisFlow is called with CV text and a LinkedIn URL
- **THEN** it returns targeted recommendations referencing the profile URL

#### Scenario: LinkedIn analysis without URL
- **WHEN** linkedinAnalysisFlow is called with CV text and no LinkedIn URL
- **THEN** it returns recommendations based on CV content with a note that a URL would improve specificity
