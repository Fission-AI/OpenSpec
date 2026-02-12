## ADDED Requirements

### Requirement: Skill template generation
The system SHALL provide a `getClarifyChangeSkillTemplate()` function that returns a complete agent skill template for the clarification workflow.

#### Scenario: Template accessed by agent
- **WHEN** an AI agent needs clarification instructions
- **THEN** the function returns the full skill template with metadata and step-by-step instructions

#### Scenario: Template includes required metadata
- **WHEN** the template is generated
- **THEN** it includes name, description, license, compatibility, author, version, and generatedBy fields

### Requirement: Change selection workflow
The system SHALL support auto-detection of the current change from conversation context when no change name is provided.

#### Scenario: Change name provided explicitly
- **WHEN** agent invokes skill with a specific change name
- **THEN** the workflow uses the specified change without prompting

#### Scenario: Change name omitted with clear context
- **WHEN** agent invokes skill without a change name and context suggests a specific change
- **THEN** the workflow infers the change from context

#### Scenario: Change name omitted without context
- **WHEN** agent invokes skill without a change name and context is ambiguous
- **THEN** the workflow lists available changes and prompts for selection

### Requirement: Status validation
The system SHALL verify that the change has spec artifacts before proceeding with clarification.

#### Scenario: Change has spec artifacts
- **WHEN** status check runs on a change with completed specs
- **THEN** the workflow proceeds to ambiguity scanning

#### Scenario: Change lacks spec artifacts
- **WHEN** status check runs on a change without specs
- **THEN** the workflow reports that specs must be created first and terminates

### Requirement: Spec artifact loading
The system SHALL load all spec artifacts from the change directory for analysis.

#### Scenario: Multiple spec files present
- **WHEN** specs directory contains multiple capability specs
- **THEN** all spec files are loaded and combined for ambiguity scanning

#### Scenario: Single spec file present
- **WHEN** specs directory contains one capability spec
- **THEN** that spec is loaded for ambiguity scanning

### Requirement: Ambiguity scanning with taxonomy
The system SHALL scan spec artifacts for ambiguities using a structured 10-category taxonomy.

#### Scenario: Functional scope ambiguities detected
- **WHEN** specs contain vague verbs, missing input/output details, or incomplete flows
- **THEN** these are flagged under the functional scope category

#### Scenario: Data model ambiguities detected
- **WHEN** specs reference undefined types, unclear relationships, or missing validation rules
- **THEN** these are flagged under the domain/data model category

#### Scenario: UX flow ambiguities detected
- **WHEN** specs describe user interactions with missing feedback states or navigation
- **THEN** these are flagged under the UX flow category

#### Scenario: Non-functional ambiguities detected
- **WHEN** specs lack performance targets, security requirements, or accessibility criteria
- **THEN** these are flagged under the non-functional attributes category

#### Scenario: Integration ambiguities detected
- **WHEN** specs reference external systems without defining protocols or error handling
- **THEN** these are flagged under the integration points category

#### Scenario: Edge case ambiguities detected
- **WHEN** specs don't specify behavior for empty inputs, concurrent operations, or failure modes
- **THEN** these are flagged under the edge cases category

#### Scenario: Constraint ambiguities detected
- **WHEN** specs lack limits, quotas, or resource boundaries
- **THEN** these are flagged under the constraints category

#### Scenario: Terminology ambiguities detected
- **WHEN** specs use overloaded terms, abbreviations without definitions, or context-dependent language
- **THEN** these are flagged under the terminology category

#### Scenario: Completion ambiguities detected
- **WHEN** specs don't define acceptance criteria or success metrics
- **THEN** these are flagged under the completion signals category

#### Scenario: Placeholder ambiguities detected
- **WHEN** specs contain TODO, TBD, or "to be determined" markers
- **THEN** these are flagged under the misc/placeholders category

### Requirement: Question prioritization
The system SHALL generate up to 5 prioritized questions based on ambiguity severity and implementation impact.

#### Scenario: More than 5 ambiguities found
- **WHEN** ambiguity scanning identifies more than 5 issues
- **THEN** the top 5 are prioritized by blocking potential and selected for Q&A

#### Scenario: Fewer than 5 ambiguities found
- **WHEN** ambiguity scanning identifies 3 ambiguities
- **THEN** all 3 are included in the question queue

#### Scenario: No ambiguities found
- **WHEN** ambiguity scanning finds no issues
- **THEN** the workflow reports that specs are clear and terminates successfully

### Requirement: Question format with recommendations
The system SHALL support two question formats: multiple-choice with recommendations and short-answer with suggestions.

#### Scenario: Multiple-choice question generation
- **WHEN** a question has enumerable options
- **THEN** it is formatted as a multiple-choice table with option, description, and pros/cons columns

#### Scenario: Multiple-choice includes recommendation
- **WHEN** a multiple-choice question is generated
- **THEN** one option is marked as "(Recommended)" with reasoning

#### Scenario: Short-answer question generation
- **WHEN** a question requires free-form input
- **THEN** it is formatted with example suggestions and guidance

#### Scenario: Short-answer includes suggestions
- **WHEN** a short-answer question is generated
- **THEN** it includes 2-3 example answers for context

### Requirement: Interactive Q&A loop
The system SHALL present questions one at a time and capture user answers incrementally.

#### Scenario: User answers question
- **WHEN** a question is presented and user provides an answer
- **THEN** the answer is validated and the next question is shown

#### Scenario: User defers question
- **WHEN** user responds with "skip" or "defer"
- **THEN** that question is marked deferred and the next question is shown

#### Scenario: User requests early termination
- **WHEN** user responds with "done" or "stop" before all questions answered
- **THEN** the workflow integrates answers collected so far and terminates

#### Scenario: All questions answered
- **WHEN** user answers all questions in the queue
- **THEN** the workflow proceeds to spec integration

### Requirement: Incremental spec updates
The system SHALL write each answer back into the appropriate spec artifact immediately after capture.

#### Scenario: Answer written to single spec
- **WHEN** an answer relates to one capability spec
- **THEN** it is written to that spec's Clarifications section with timestamp and category

#### Scenario: Answer applies to multiple specs
- **WHEN** an answer relates to multiple capabilities
- **THEN** it is written to all relevant spec Clarifications sections

#### Scenario: Clarifications section creation
- **WHEN** a spec artifact lacks a Clarifications section
- **THEN** the section is added with `## Clarifications` header before writing the answer

#### Scenario: Clarifications section exists
- **WHEN** a spec artifact already has a Clarifications section and the current session header exists  
- **THEN** the new answer is appended under that session header 

### Requirement: Spec section updates based on clarifications
The system SHALL update relevant spec sections to reflect clarified requirements.

#### Scenario: Clarification resolves ambiguous requirement
- **WHEN** an answer clarifies a vague requirement
- **THEN** the requirement text is updated to incorporate the answer

#### Scenario: Clarification adds missing scenario
- **WHEN** an answer defines a new edge case
- **THEN** a new scenario is added to the relevant requirement

#### Scenario: Clarification defines terminology
- **WHEN** an answer clarifies a term
- **THEN** a glossary entry or definition is added to the spec

### Requirement: Coverage summary reporting
The system SHALL generate a final report showing resolved, deferred, and outstanding ambiguities by category.

#### Scenario: All ambiguities resolved
- **WHEN** all questions have been answered
- **THEN** the report shows 100% resolution rate with breakdown by category

#### Scenario: Some ambiguities deferred
- **WHEN** user skips some questions
- **THEN** the report lists deferred items by category and suggests re-running clarify

#### Scenario: Additional ambiguities discovered
- **WHEN** spec updates reveal new ambiguities
- **THEN** the report notes outstanding items and recommends another clarification pass

### Requirement: Template export and access
The system SHALL export the skill template function from the templates module for agent access.

#### Scenario: Function exported from index
- **WHEN** templates module is imported
- **THEN** `getClarifyChangeSkillTemplate` is available as a named export

#### Scenario: Template compatible with agent systems
- **WHEN** an AI agent requests the template
- **THEN** it receives valid Markdown with frontmatter and structured instructions
