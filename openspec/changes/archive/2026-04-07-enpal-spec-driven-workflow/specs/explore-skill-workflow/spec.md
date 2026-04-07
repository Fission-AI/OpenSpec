## ADDED Requirements

### Requirement: Explore skill creates exploration doc at session start
The explore skill SHALL create the exploration document at the correct path at the start of every session, before any Q&A or free-form exploration begins. The topic SHALL be derived from the user's input argument.

#### Scenario: Doc created on invocation
- **WHEN** user invokes `/enpalspec:explore auth-redesign`
- **THEN** the skill creates `openspec/explorations/<yyyy-mm>/exploration-<date>-auth-redesign.md`
- **AND** fills in the heading, date metadata, and a Context section summarising the topic
- **AND** begins Phase 1 free-form exploration

#### Scenario: Doc created when no argument provided
- **WHEN** user invokes `/enpalspec:explore` without arguments
- **THEN** the skill asks the user what they want to explore
- **AND** derives a kebab-case topic from their response
- **AND** creates the exploration doc before proceeding

### Requirement: Phase 1 — open-ended exploration
The explore skill SHALL begin every session with a free-form open-ended Phase 1 that acts as a thinking partner: asking clarifying questions, exploring the codebase, drawing diagrams, comparing options, and surfacing hidden complexity — without any fixed structure or question sequence.

#### Scenario: Codebase exploration in Phase 1
- **WHEN** the topic involves existing code
- **THEN** the skill reads relevant files, maps architecture, and uses ASCII diagrams to visualise current state before asking what to change

#### Scenario: No forced structure in Phase 1
- **WHEN** the user wants to think out loud about a vague idea
- **THEN** the skill follows the thread, asks open questions, and does not force the conversation into a Q&A format

### Requirement: Phase 1 to Phase 2 transition
The explore skill SHALL transition from free-form Phase 1 to structured Q&A Phase 2 when concrete design decisions surface during exploration. The transition SHALL be signalled explicitly to the user.

#### Scenario: Natural transition when decisions emerge
- **WHEN** the exploration reaches concrete design choices (e.g. "which storage approach", "how should auth tokens be stored")
- **THEN** the skill explicitly signals the transition: "I'm seeing some concrete decisions here — let me capture them with a few focused questions"
- **AND** begins Round 1 of Q&A

#### Scenario: Transition does not happen for purely investigative explorations
- **WHEN** the exploration is purely investigative (understanding existing code, no decisions to make)
- **THEN** the skill stays in Phase 1 and does not force a transition to Q&A rounds

### Requirement: Phase 2 — structured Q&A rounds
The explore skill SHALL conduct structured Q&A rounds in Phase 2, where each round covers one theme and contains 2–5 focused questions. The skill SHALL stop after each round and wait for the user to reply before proceeding.

#### Scenario: Round asks 2-5 questions on one theme
- **WHEN** a Q&A round begins
- **THEN** the skill presents 2–5 questions all related to a single theme (e.g. "Data Storage", "Auth Approach")
- **AND** each question includes 2–4 options with one option marked as recommended with a reason
- **AND** the skill stops and waits for the user's reply

#### Scenario: Skill supports as many rounds as needed
- **WHEN** the user answers a round and significant ambiguity remains
- **THEN** the skill identifies the next theme and starts another round
- **AND** continues until all significant design decisions are captured
- **AND** does NOT artificially limit to 2 or 3 rounds

#### Scenario: Q&A log appended after each round
- **WHEN** the user answers a round
- **THEN** the skill appends that round's Q&A log to the exploration doc before asking the next round
- **AND** the log records each question title, all options, and the selected answer

### Requirement: Explore skill ends with summary and propose offer
The explore skill SHALL end the session by completing the exploration doc (writing Insights & Decisions and Open Questions) and offering to transition to the propose workflow.

#### Scenario: End-of-session wrap-up
- **WHEN** all Q&A rounds are complete and the user signals they are done
- **THEN** the skill writes the Insights & Decisions section to the doc
- **AND** writes the Open Questions section for any unresolved items
- **AND** offers: "Ready to propose? Run `/enpalspec:propose`"

#### Scenario: Open questions preserved
- **WHEN** some questions were raised but not resolved during exploration
- **THEN** the Open Questions section lists them explicitly so they can be addressed during proposal or design
