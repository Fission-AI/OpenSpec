## ADDED Requirements

### Requirement: Research Source Extraction
The promotion workflow SHALL extract contract candidates from explicit research or spec source material before treating them as reviewable product contracts.

#### Scenario: Source claim is promoted from research or spec material
- **GIVEN** a research or spec document contains a recurring governance or behavior claim
- **WHEN** the claim starts guiding implementation, review, or sequencing decisions
- **THEN** the promotion artifact SHALL cite the source document path
- **AND** the artifact SHALL identify the specific source claim being promoted
- **AND** the artifact SHALL explain why the claim is mature enough for contract-candidate review

#### Scenario: Promotion source remains auditable
- **GIVEN** a contract-candidate artifact cites a source document
- **WHEN** reviewers inspect the promotion
- **THEN** the cited source SHALL be sufficient to recover the original research/spec context
- **AND** the promotion SHALL NOT rely on uncited conversation memory as its only evidence

### Requirement: Contract Candidate Promotion Record
Exploration notes that repeatedly describe shared behavior SHALL be promoted into an explicit contract-candidate record before they become canonical requirements.

#### Scenario: Repeated planning insight gets a reviewable candidate
- **GIVEN** an exploration note describes shared behavior that may become a long-lived contract
- **WHEN** the same behavior starts guiding implementation or review decisions
- **THEN** the team SHALL create a contract-candidate change artifact
- **AND** the artifact SHALL cite the source exploration note
- **AND** the artifact SHALL state whether it changes product behavior or only records planning intent

#### Scenario: Candidate does not become canonical automatically
- **GIVEN** a contract-candidate artifact exists
- **WHEN** reviewers have not assigned ownership for the shared behavior
- **THEN** the candidate SHALL NOT be treated as a canonical product spec
- **AND** follow-up work SHOULD either assign ownership or leave the candidate as exploratory planning context

### Requirement: Evidence Gate Mapping
A promoted contract candidate SHALL map to an automated test or documented evidence gate before it is considered ready for implementation or archival.

#### Scenario: Candidate maps to executable validation
- **GIVEN** a contract-candidate artifact defines expected behavior
- **WHEN** the behavior can be validated automatically
- **THEN** the artifact SHALL name the automated test or validation command that should prove the contract
- **AND** the artifact SHALL define the observable pass condition

#### Scenario: Candidate maps to documented evidence when automation is not ready
- **GIVEN** a contract-candidate artifact defines expected behavior
- **AND** no automated test exists yet
- **WHEN** reviewers evaluate the candidate
- **THEN** the artifact SHALL name the documented evidence gate instead
- **AND** the evidence gate SHALL specify the artifact, transcript, checklist, or review record required to prove the contract
- **AND** the artifact SHALL state what future work would convert the evidence gate into an automated test

#### Scenario: Candidate without evidence gate remains exploratory
- **GIVEN** a contract-candidate artifact has no automated test and no documented evidence gate
- **WHEN** validation or review summarizes the candidate
- **THEN** the candidate SHALL remain exploratory planning context
- **AND** the candidate SHALL NOT be presented as ready for implementation or archival