# assistant-proposal-qa Specification

## ADDED Requirements
### Requirement: Interactive Proposal Q&A Command

The system SHALL provide a `/openspec/proposal-qa` slash command that prepares users for `/openspec/proposal` by running a structured discovery interview.

#### Scenario: Launching the proposal interview
- **WHEN** the user runs `/openspec/proposal-qa Build a notifications digest`
- **THEN** acknowledge the request and restate the draft problem statement
- **AND** highlight what parts of the request are already concrete versus ambiguous (e.g., "Strong signals" and "Needs clarity")
- **AND** outline the upcoming steps: targeted questions followed by a summary hand-off.

#### Scenario: Honour non-interactive environments
- **GIVEN** slash commands are invoked in a non-interactive environment (e.g., automation requesting defaults)
- **WHEN** `/openspec/proposal-qa` is triggered with `--no-interactive`
- **THEN** skip the question loop
- **AND** produce a summary that records the request, recommended defaults, and instructions for editing manually before running `/openspec/proposal`.

### Requirement: Targeted Clarifying Questions

The interview SHALL adaptively surface 3–6 high-leverage questions that eliminate ambiguity in the proposal brief.

#### Scenario: Ask one question at a time with rationale
- **WHEN** the interview begins gathering answers
- **THEN** select the next most risky/vague aspect of the feature
- **AND** present a single question that includes:
  - A short rationale explaining why the question matters for the proposal
  - 2–4 recommended options formatted as a bulleted list with `**Default**` clearly marked
  - Guidance for when to choose each option (one sentence per option)
- **AND** wait for the user response (or `default`/`skip`) before showing another question.

#### Scenario: Provide fallbacks when users defer
- **WHEN** the user replies with `idk`, `default`, or leaves the answer empty
- **THEN** accept the default option for that question
- **AND** note in the transcript that the default was applied.

#### Scenario: Capture bespoke answers
- **WHEN** the user supplies an answer that does not match any recommended option
- **THEN** accept the custom answer
- **AND** record a short interpretation describing how it will shape the proposal.

### Requirement: Synthesis and Handoff

The interview SHALL produce an actionable summary that readies the agent to draft the formal change proposal.

#### Scenario: Summarise discoveries before exit
- **WHEN** the question loop completes (or is skipped)
- **THEN** output a structured summary containing:
  - Problem statement and scope recap
  - Table or bullet list of decisions (question → final answer → reasoning/default flag)
  - Noted risks, open questions, and assumptions to confirm in the proposal
- **AND** recommend next actions: either ask for revisions, run `/openspec/proposal` with this summary, or request further research.

#### Scenario: Provide reusable prompt snippet
- **WHEN** the summary is generated
- **THEN** include a copyable prompt block that the user can paste into `/openspec/proposal`
- **AND** ensure the prompt references the summary decisions and flags any open items for follow-up.

#### Scenario: Allow re-entry for more questions
- **WHEN** the user indicates they want to refine further (e.g., "ask more" or "another pass")
- **THEN** identify remaining ambiguous areas not yet questioned
- **AND** continue with additional questions (up to the 6-question cap) before regenerating the summary.
