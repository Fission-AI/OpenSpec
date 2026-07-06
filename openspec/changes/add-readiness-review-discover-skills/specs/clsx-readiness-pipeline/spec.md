## ADDED Requirements

### Requirement: Three-stage readiness pipeline

ClearSpec SHALL provide the project-readiness phase as three sequential, independently-invocable stages: `/clsx:check-readiness` (Phase 1), `/clsx:deep-review` (Phase 2), and `/clsx:discover` (Phase 3). Each stage SHALL be invocable both as its `/clsx:` slash command and through standard semantic skill invocation as documented in the skill. The stages are intended to run in order, with each later stage consuming the outputs of the earlier stages.

#### Scenario: Stages invocable individually

- **WHEN** the user invokes any one of `/clsx:check-readiness`, `/clsx:deep-review`, or `/clsx:discover`
- **THEN** that stage runs on its own without requiring the other stages to run in the same session
- **AND** each stage is also invocable through semantic skill invocation as documented in its skill

#### Scenario: Later stages consume earlier stage outputs

- **WHEN** a later stage runs and an earlier stage's report exists under `clearspec/reports/`
- **THEN** the later stage loads the earlier report(s) into context and continues from the recorded state
- **AND** `deep-review` consumes the readiness report, and `discover` consumes both the readiness report and the review report

### Requirement: Re-runnable and resumable stages

Each stage SHALL be re-runnable at any time without breaking or discarding existing reports or documents, and SHALL be resumable across sessions. Before doing any work, each stage SHALL load its own prior output and any prior-stage reports into context, then continue from the recorded state and update its documents in place rather than recreating them from scratch.

#### Scenario: Re-running a stage preserves existing checkpoints

- **WHEN** a stage is run again after it has already produced output
- **THEN** it loads the existing report/documents into context first
- **AND** updates them in place, preserving prior recorded understanding, open questions, and decisions rather than overwriting them wholesale

#### Scenario: Put down and pick up across sessions

- **WHEN** the user runs one stage, ends the session, and later invokes the next stage
- **THEN** the next stage loads the prior stage's report and its own prior output (if any) before asking for anything
- **AND** continues discovery from the recorded state so context persists across sessions

#### Scenario: Running a stage with no prior outputs

- **WHEN** a stage is invoked and neither its own output nor the expected prior-stage reports exist
- **THEN** the stage runs successfully and begins from scratch, gathering what it can for its phase

### Requirement: Cross-platform report and document paths

When any stage reads or writes reports under `clearspec/reports/` or requirements documents under `clearspec/requirements/` on macOS, Linux, or Windows, it SHALL resolve each path relative to the `clearspec/` directory using the platform path separator and SHALL NOT assume forward-slash separators.

#### Scenario: Resolving paths cross-platform

- **WHEN** a stage reads or writes a report or requirements document on any supported operating system
- **THEN** it resolves the path relative to the appropriate `clearspec/` sub-folder using the platform path separator

### Requirement: Inputs may be provided in multiple formats and from multiple sources

Every stage SHALL accept project inputs — including any pre-existing Product Requirements and Engineering Requirements documents — in any supported format (Markdown, Confluence pages, Google Docs, PDFs, or any combination) and from any supported source: retrieved through connected MCP servers (for example Confluence or Google Drive), placed as files under the `clearspec/` directory structure (`requirements/`, `context/`), or supplied directly in the Claude Code conversation. Each stage SHALL gather inputs from whichever of these sources are available and SHALL NOT assume inputs exist only as files under `clearspec/`.

#### Scenario: Accepting inputs in any format

- **WHEN** input documents are provided as Markdown, Confluence pages, Google Docs, PDFs, or a combination of these
- **THEN** the stage reads and uses them regardless of format

#### Scenario: Accepting inputs from any source

- **WHEN** inputs are made available through a connected MCP (such as Confluence or Google Drive), placed under `clearspec/requirements/` or `clearspec/context/`, or dropped directly into the Claude Code conversation
- **THEN** the stage gathers inputs from whichever of those sources are present
- **AND** does not assume inputs exist only as files under `clearspec/`

#### Scenario: Pre-existing requirements documents as inputs

- **WHEN** the customer or team provides existing Product Requirements or Engineering Requirements documents as inputs (in any supported format or from any supported source)
- **THEN** the stages treat them as input material, distinct from the finalised `product-requirements.md` and `engineering-requirements.md` that `/clsx:discover` produces

### Requirement: Readiness check (Phase 1)

The `/clsx:check-readiness` stage SHALL perform a quick, mechanical assessment of whether the project inputs are in good enough shape to proceed to a deeper review. It SHALL inspect the supplied input documents (supporting documents under `clearspec/requirements/` and `clearspec/context/`, plus any inputs provided via connected MCPs or directly in the conversation, in any supported format), assess their presence and sufficiency against what the later Product and Engineering requirements will need, flag missing or insufficient inputs as correctable issues, and capture assumptions and risks where possible. This stage SHALL NOT inspect, explore, or cross-reference code — code is a `/clsx:discover` (Phase 3) concern. It SHALL write or update `clearspec/reports/readiness-report.md` with a metadata header recording status, flagged issues, assumptions, risks, input completeness, and what is still missing. This stage SHALL NOT run the deep, one-question-at-a-time interview.

#### Scenario: Flagging missing or insufficient inputs

- **WHEN** the readiness check finds that expected inputs are absent or too thin to support the later requirements
- **THEN** it records those as flagged issues in the readiness report as items the user can correct
- **AND** does not silently treat missing inputs as acceptable

#### Scenario: Capturing assumptions and risks

- **WHEN** the readiness check can infer assumptions or identify risks from the available inputs
- **THEN** it records them in the readiness report

#### Scenario: Re-running after correcting inputs

- **WHEN** the user corrects or adds inputs and re-runs `/clsx:check-readiness`
- **THEN** the stage re-assesses the inputs and updates `readiness-report.md` in place, reflecting the corrected inputs

#### Scenario: Remaining mechanical

- **WHEN** the readiness check runs
- **THEN** it assesses input presence and sufficiency without conducting the relentless clarifying-question dialog reserved for `/clsx:deep-review`

### Requirement: Deep review (Phase 2)

The `/clsx:deep-review` stage SHALL run a guided, interactive dialog to resolve the open questions and flags raised by the readiness check, across both product and engineering concerns, and SHALL record the resulting findings, answers, and discoveries to `clearspec/reports/review-report.md` plus any artifacts under `clearspec/reports/`. The dialog SHALL follow the relentless one-question-at-a-time style: asking a single question at a time, waiting for the answer before the next, providing a recommended answer for each, and exploring the available input documents (under `clearspec/requirements/` and `clearspec/context/`, or provided via MCP or directly in the conversation, in any supported format) to answer a question itself rather than asking when the answer can be determined from that material. This stage SHALL NOT explore or cross-reference code — code cross-referencing is deferred to `/clsx:discover` (Phase 3).

#### Scenario: Asking one question at a time with a recommendation

- **WHEN** the stage needs information from the user
- **THEN** it asks a single question at a time and waits for the answer before asking the next
- **AND** it provides its recommended answer for each question
- **AND** it does not present multiple questions in one batch as a single bewildering block

#### Scenario: Exploring available material before asking

- **WHEN** a question could be answered from the provided input documents (under `clearspec/requirements/` and `clearspec/context/`, or provided via MCP or directly in the conversation, in any supported format)
- **THEN** the stage inspects those documents to answer the question itself
- **AND** only asks the user when the answer cannot be determined from the available documents
- **AND** it defers code cross-referencing to `/clsx:discover` rather than exploring code itself

#### Scenario: Input files need to change

- **WHEN** the deep review determines that an input file itself must be changed for the project to be reviewable
- **THEN** the stage directs the user to correct the inputs and re-run `/clsx:check-readiness`
- **AND** does not attempt to finalise the review over inputs it has judged unsound

#### Scenario: Recording review findings

- **WHEN** the inputs are sound and the dialog has resolved the outstanding questions
- **THEN** the stage writes the additional findings, answers, and discoveries to `review-report.md` plus any supporting artifacts
- **AND** records outstanding questions and concerns in the report's metadata section so they persist across sessions

### Requirement: Discovery builds full context and cross-references code (Phase 3)

The `/clsx:discover` stage SHALL build up the whole context for the project using the inputs and both prior reports, and SHALL request that repositories of interest be cloned into `clearspec/code/` and cross-reference the requirements against that code. This is the stage that brings code into the pipeline: code exploration and cross-referencing are owned by `discover`, not by the earlier `check-readiness` or `deep-review` stages. This stage is largely automated but MAY pause to ask clarifying questions or raise discussions when it discovers issues.

#### Scenario: Requesting and cross-referencing code

- **WHEN** the discovery stage runs
- **THEN** it asks for the relevant repositories to be cloned into `clearspec/code/`
- **AND** once code is present, cross-references the requirements against the code at the key areas to be modified
- **AND** confirms the requirements line up with the code

#### Scenario: Open questions and conflicts surfaced

- **WHEN** cross-referencing raises open questions
- **THEN** the stage raises those questions to the user for answering
- **AND** when a question cannot be answered, or a conflict or inherent risk between the code and the requirements is found, the stage explicitly records it in the engineering requirements document

#### Scenario: Largely automated with clarifying questions allowed

- **WHEN** the discovery stage encounters an issue it cannot resolve from the available material
- **THEN** it MAY pause to ask a clarifying question or start a discussion before continuing
- **AND** otherwise proceeds automatically through the context build

### Requirement: Product requirements gathered before engineering requirements

During discovery the stage SHALL consolidate Product Requirements before Engineering Requirements. Product Requirements SHALL describe the current state, the desired outcome and what must change to achieve it, risks, assumptions, the number of teams involved, and dependencies, framed in product/customer/team outcome terms rather than technical implementation; for full-stack or frontend work the stage SHALL mention UX designs and request them when appropriate, treating them as optional. Engineering Requirements SHALL cover the current architecture and what must change technically: the broad architectural approach, affected services and how they interact, data contracts between services, whether the service configuration must change, the deployment and rollout process, current and required levels of testing/monitoring/alerting, the source-control and rollout strategy during development (such as feature flags), risks, upstream consumers of anything being changed, technical implementations of business rules from the Product Requirements, and any prior design or architectural decisions and alternatives that must be upheld.

#### Scenario: Product phase precedes engineering phase

- **WHEN** discovery consolidates requirements
- **THEN** it works through Product Requirements before starting Engineering Requirements

#### Scenario: Prompting for UX designs when relevant

- **WHEN** the project involves full-stack or frontend changes
- **THEN** the stage mentions UX designs and asks for them if appropriate
- **AND** treats their absence as acceptable rather than blocking

#### Scenario: Product requirements cannot be completed

- **WHEN** the Product Requirements cannot be fully completed before engineering work must continue
- **THEN** the stage records the missing product information clearly in the documentation as known gaps
- **AND** carries those gaps into the validity and completeness assessment of every subsequent verification cycle

### Requirement: Verification cycles and finalisation

Discovery SHALL proceed in verification cycles: after each batch of answers it SHALL re-assess the validity, completeness, and quality of the gathered requirements, and if information is still insufficient it SHALL list the outstanding questions and ask them one at a time, repeating until the requirements are sufficient. Each cycle it SHALL update `clearspec/reports/discovery-report.md` and the substantive `clearspec/requirements/product-requirements.md` and `clearspec/requirements/engineering-requirements.md`, each with a structured breakdown of the requirements plus a metadata section at the top recording status, open questions, completeness, quality, and what remains to reach a satisfactory state. When both the Product and Engineering Requirements are assessed as complete and of sufficient quality, the stage SHALL update both documents to indicate a finalised status.

#### Scenario: Running a verification cycle

- **WHEN** a batch of answers has been provided
- **THEN** the stage re-assesses the validity, completeness, and quality of the gathered requirements
- **AND** if information is still insufficient, it lists the outstanding questions and asks them one by one
- **AND** repeats the cycle until the requirements are sufficient

#### Scenario: Documents updated every cycle

- **WHEN** a verification cycle completes
- **THEN** the stage writes or updates `discovery-report.md`, `product-requirements.md`, and `engineering-requirements.md`
- **AND** each requirements document contains both the current understanding of the requirements and the outstanding questions and concerns in its metadata section

#### Scenario: Seeding requirements from prior reports

- **WHEN** discovery begins and the readiness and review reports exist
- **THEN** the stage uses those reports as the basis for the product and engineering requirements documents rather than starting from nothing
- **AND** incorporates any Product or Engineering Requirements documents provided as inputs (in any supported format or from any supported source) as seed material

#### Scenario: Marking requirements finalised

- **WHEN** both the Product and Engineering Requirements are assessed as complete and of sufficient quality
- **THEN** the stage updates both documents to indicate a finalised status
