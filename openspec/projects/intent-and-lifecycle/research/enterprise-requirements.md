# Enterprise integration requirements

**Status:** Research notes, not the pilot backlog.

The [lifecycle pilot](../lifecycle/design-draft.md) covers source checks and optional feedback reviews. This inventory keeps the broader integration needs available without making all of them prerequisites.

The table describes what this **proposed actions/triggers model with Git source tracking** delivers if implemented. It does **not** claim that OpenSpec provides these capabilities today. “Partial” means the proposed model could support part of the requirement; the complete behavior still needs additional functionality. Coverage includes later integrations, not just the initial pilot. This is a boundary inventory, not a backlog for this product increment. Generation and source retrieval remain owned by the existing integration; a row marked not covered does not mean that workflow lacks the behavior.

| Upstream requirement | Coverage | What else is needed |
| --- | --- | --- |
| Detect when a Git-based source document changes after generation | **Designed to cover** at document level | Access to the upstream Git repository and an accurate file path/revision |
| Warn at OpenSpec lifecycle points without silently syncing | **Designed to cover** at configured checkpoints | Agent integrations must call the runner; verify cross-agent behavior |
| Store exact Git revision of a source document | **Designed to cover** at document level | Source pin recorded during generation |
| Keep locked upstream product specifications unchanged; store tracking outside them | **Designed to cover** by the proposed read-only approach | Do not install any write-capable upstream source handler |
| Create a well-formed change from an upstream product specification, using team schemas | **Partial** | Existing upstream-to-change generation skill, unchanged; lifecycle actions do not generate changes |
| Pull in related architecture, contracts, dependencies, and constraints | **Not covered** | Provider-specific source discovery and retrieval |
| Check readiness, promotion, and early-start overrides | **Partial** | Upstream status reader, policy rules, and recorded override |
| Trace every generated requirement to an upstream requirement and source revision | **Partial** | Item-level IDs, extraction mapping, and coverage records |
| Preserve MUST/SHALL, numbers, limits, and error codes exactly | **Not covered** | Extraction validation against original items |
| Never write code or upstream product specifications during generation | **Partial** | Upstream-to-change generation skill's permission/write rules; check runner is read-only |
| One-way upstream → OpenSpec updates, only after approval | **Not covered** | Reviewable reconciliation and controlled artifact edits |
| Skip irrelevant archived upstream product specifications when checking drift | **Not covered** | Upstream lifecycle/status awareness in source filtering |
| Show added, modified, removed, or renamed source sections | **Not covered** | Historical, item-aware diffing and rename matching |
| Classify upstream-only, OpenSpec-only, both changed, or in sync | **Not covered** | Three-way comparison of source, local work, and original baseline |
| Capture deviations and evidence during implementation | **Partial** | A feedback record and skill guidance; checks may surface findings |
| Keep feedback separate from implementation detail and route it to the upstream product team | **Not covered** | Suggested reviews can draft feedback; classification, routing, and approved submission still need a separate workflow |
| Warn upstream authors during product-requirement editing, auditing, or submission | **Not covered** | Upstream event integration or external observer calling the checks |
| Show spec approved, implementation complete, feature released separately | **Not covered** | Cross-system delivery model and status aggregation |
| Every upstream requirement gets a coverage status | **Not covered** | Item-to-change/test mapping and rollups |
| Preserve history; archived OpenSpec changes remain archived | **Partial** | Existing archive plus explicit new-change-on-drift convention and durable source evidence |
| Require explicit confirmation for every write | **Partial** | Existing workflow guards plus enforcement in each write-capable integration; no automatic writes in checks |
| Mark feedback lacking evidence as needing confirmation | **Partial** | Structured feedback workflow and evidence validation |
| Validate OpenSpec after every write | **Not covered** | Write-path validation or host/CI integration; checkpoints alone cannot observe all agent edits |

The model supplies source-version checks, warnings, and optional review guidance. Generation, item-level traceability, controlled reconciliation, upstream submission, and cross-system delivery status remain separate work.

**Source basis:** Anonymized enterprise integration requirements from the original exploration. This table preserves that analysis; the consolidation did not independently re-read the source attachment. Source filenames and customer identifiers are omitted. The anonymized inventory is included as background for the draft proposal.
