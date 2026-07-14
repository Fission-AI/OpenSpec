Create specification files that define WHAT should be true — testable
requirements with scenarios, written from the actor's perspective. Cover the
primary success path AND meaningful edge/failure cases.

Create one spec file per capability listed in the proposal's Capabilities
section:
- New capabilities: `specs/<capability>/spec.md` with the exact kebab-case
  name from the proposal.
- Modified capabilities: use the existing folder name from
  `openspec/specs/<capability>/`.

Delta operations (use `##` headers): **ADDED Requirements**, **MODIFIED
Requirements** (MUST include the full updated requirement block), **REMOVED
Requirements** (MUST include **Reason** and **Migration**), **RENAMED
Requirements** (FROM:/TO:).

Format:
- Each requirement: `### Requirement: <name>`, SHALL/MUST language.
- Each scenario: `#### Scenario: <name>` with GIVEN/WHEN/THEN.
- **CRITICAL**: scenarios use exactly 4 hashtags (`####`); every requirement
  needs at least one scenario.

Specs should be testable — each scenario is a potential acceptance check for
the downstream work that serves this change. Every requirement MUST trace to
something the proposal states; a requirement that traces to nothing is scope
creep — flag it instead of writing it.

This is the final artifact: there is no design or tasks phase here. Once the
specs are approved, archive the change to sync them into `specs/`.
