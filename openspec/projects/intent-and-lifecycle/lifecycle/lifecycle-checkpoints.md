# Lifecycle checkpoints: actions and triggers

**Status:** Actions/triggers model selected November 5, 2026; technical details proposed, not implemented.
**Purpose:** Define one model for automatic checks and optional agent reviews at OpenSpec lifecycle moments.

This document consolidates the older checks/checkpoints design. It owns the lifecycle model and its constraints. The [roadmap](../direction/roadmap.md) owns sequencing; the [imagined launch](lifecycle-checkpoints-launch.md) illustrates the experience. Examples below are proposed syntax, not supported configuration or commands.

## Decision and scope

Use **actions and triggers**. A check is one kind of action. Keep **lifecycle checkpoints** as the feature name: a checkpoint is a named moment where a skill, CLI operation, or external caller explicitly invokes the system.

A source-drift check produces findings. An optional feedback review offers useful work that the developer can decline. Treating both as pending checks would confuse an unaccepted suggestion with missing verification.

The dispatcher stays small and synchronous. It resolves matching triggers, runs supported checks, and returns findings and suggested actions separately. The existing artifact graph continues to determine artifact dependencies. This model does not schedule implementation work, watch files, or automatically synchronize sources.

## Concepts

| Concept | Meaning |
| --- | --- |
| Source | Information a change used; optional revision metadata enables a deterministic comparison. |
| Action | Reusable work: initially a built-in check or agent guidance. |
| Check | An action that executes and returns structured findings. |
| Suggested review | Agent guidance offered for the developer to accept or skip in the current session. |
| Event / checkpoint | An explicitly invoked lifecycle moment, such as before Apply. |
| Trigger | Binds an event to an action and its supported execution mode. |
| Finding | An observed result with action/source identity, evidence, uncertainty, and a useful next step. |
| Policy | How to handle executed check results; warning-only in the initial pilot. |

## Configuration and supported combinations

Use the existing project configuration file. Validate action kind, mode, and policy together rather than allowing every possible combination.

```yaml
# openspec/config.yaml — proposed
schema: spec-driven

actions:
  source-drift:
    uses: builtin/git-file-drift
  upstream-feedback:
    uses: agent-guidance
    instructions: |
      Review the pinned requirements, implementation decisions, and evidence.
      Draft feedback with source references. Mark unsupported claims as uncertain.
      Do not change sources or submit feedback without approval.

triggers:
  - on: openspec.apply.before
    run: source-drift
    mode: auto
    policy: warn
  - on: openspec.apply.completed
    run: upstream-feedback
    mode: suggest
```

The pilot supports built-in checks with explicit `mode: auto` and `policy: warn`, and agent guidance with `mode: suggest` and no policy. Reject automatic agent guidance, blocking suggestions, and unsupported action kinds. Exact schema and command spelling remain design work.

Offering or accepting a review does not pass a check. Skipping it leaves no failed check or outstanding verification obligation. The CLI returns guidance; it does not launch an agent. The active agent uses its existing tools and permissions only after the developer chooses the review. Coming back later means requesting it again; no persistent review inbox or resume guarantee is promised.

## Sources and findings

Ordinary links and explanations remain sufficient for the existing-context workflow. Structured pins are optional and serve the narrower need for deterministic Git drift checks. They remain separate from project-level `references:` to registered OpenSpec Stores.

```yaml
# openspec/changes/ios-checkout/.openspec.yaml — proposed
schema: spec-driven
sources:
  - id: checkout-requirements
    type: git-file
    repository: https://github.com/example/product-requirements.git
    path: features/checkout.md
    revision: 6a81f32
    track: main
```

Compare the specific file's contents at the pinned revision with the resolved tracked revision. Unrelated commits do not count as drift; edits anywhere in the file do. Report the actual revisions compared. Missing files, inaccessible repositories, and unrecoverable revisions produce `unknown`, never `unchanged` or a pass. The pilot must define whether it uses local refs or explicitly authorized fetching, and report the freshness limit.

A pin stays unchanged until someone explicitly accepts a new baseline. Reviewing a warning does not repin it. Keep the prior revision recoverable through change history. Checks read sources; they do not rewrite sources, plans, or code. An archived change remains historical; later work belongs in a new change.

Return check findings separately from suggested actions. Findings need an identity, action/source identity, result, evidence or revisions, and next step. Git comparison outcomes are `unchanged`, `changed`, or `unknown`; the shared result schema is still to be finalized. A changed file is evidence of drift, not proof that the implementation is wrong. Semantic review is a separate action.

Initial policy is warning-only, including unknown/error reporting. Blocking is deferred until failure semantics are explicit. Allowing an operation to continue on `unknown` is fail-open; it must not be described as successful verification or a conservative blocking default.

## Invocation and enforcement

| Entry point | Caller and scope |
| --- | --- |
| `openspec.apply.before` | Apply skill explicitly invokes it when starting or resuming implementation. |
| `openspec.apply.completed` | Apply skill invokes it after confirming tracked tasks are complete. This is not verification or release. |
| Manual invocation | A developer or custom caller requests the same check/review behavior; exact CLI remains proposed. |
| `openspec.archive.before` | Follow-up integration: the CLI invokes it before archive mutations. |
| Propose, Verify, custom artifact milestones | Add only when a concrete use case establishes the event and its inputs. Before Propose, a change and its source metadata may not exist. |

An event declaration alone cannot make an event happen. Custom skills can invoke the same interface; they do not need to use the built-in OpenSpec skills. Skills that never invoke it do not run its actions.

Keep status and instruction generation observational. Apply currently refreshes its instructions after each task. Executing actions as a side effect of those reads would repeat checks and suggestions. Use explicit lifecycle calls and suppress duplicate findings/offers within an invocation. Completion retries and later resumes need a defined rule before shipping; no durable orchestration is implied.

OpenSpec can enforce a future gate only at CLI operations it controls. Agent skills can request checks and follow guidance, but cannot prevent edits through other tools. Initially even CLI integrations warn. Defer validation hooks until there is a demonstrated need and a rule preventing recursive checks when an action itself invokes validation.

## Trust and future team reuse

Start with a built-in Git check and suggested agent guidance. Retrieved documents are data, not authority to override the user or workflow. A repository cannot authorize command execution merely by containing configuration.

External executable actions need an explicit trust decision, bounded inputs, timeouts, permissions, and an output/error contract. Demonstrate a second real integration before freezing the extension interface.

The future distribution model separates publishing, installing, enabling, and trusting. Multiple independently maintained plugins can contribute namespaced actions and triggers. Developers may install plugins globally while projects enable selected versions. Versioned team profiles can supply shared defaults while retaining the project's artifact schema. Resolve collision, ordering, override, and provenance rules before shipping this layer.

Defer arbitrary commands, plugin distribution, custom event families, scheduling, chained actions, fresh agents, persistent approvals, and background observation beyond the initial pilot. None is required to prove a source check and optional review.

## Existing implementation and proposed changes

Checked against local OpenSpec `2bd5bc3b`; these are repository observations, not remote release claims.

| Surface | Existing behavior and proposed change |
| --- | --- |
| `src/core/change-metadata/schema.ts` | No generic `sources` field; add validated optional pins. |
| `src/core/project-config.ts` | Context, artifact rules, Store references, and advisory Apply/Archive guidance exist; actions/triggers do not. |
| New lifecycle dispatcher | Resolve explicit events, run built-ins, and return findings and suggestions separately. |
| `src/core/templates/workflows/apply-change.ts` | Refreshes instructions during the task loop; add explicit lifecycle invocations outside those reads. |
| `src/commands/workflow/instructions.ts` | Supplies workflow instructions and operation guidance; keep it observational. |
| `src/core/archive.ts` | Owns archive mutations; integrate a warning there after the pilot proves useful. |
| `src/core/artifact-graph/types.ts` | Owns artifact dependencies; leave that responsibility unchanged. |

Actions/triggers do not solve implementing an existing external contract without local deltas. That needs coordinated planning, validation, verification, and archive design; see the [design gaps](../launch/imagined-launch-design-gaps.md). `skip_specs` remains for work with no spec-level behavior changes.

## Enterprise requirements coverage


The table describes what this **proposed actions/triggers model with Git source tracking** delivers if implemented. It does **not** claim that OpenSpec provides these capabilities today. “Partial” means the proposed model could support part of the requirement; the complete behavior still needs additional functionality. Coverage includes later integrations, not just the initial pilot.

| Upstream requirement | Coverage | What else is needed |
| --- | --- | --- |
| Detect when a Git-based source document changes after generation | **Designed to cover** at document level | Access to the upstream Git repository and an accurate file path/revision |
| Warn at OpenSpec lifecycle points without silently syncing | **Designed to cover** at configured checkpoints | Agent integrations must call the runner; verify cross-agent behavior |
| Store exact Git revision of a source document | **Designed to cover** at document level | Source pin recorded during generation |
| Keep locked upstream product specifications unchanged; store tracking outside them | **Designed to cover** by the proposed read-only approach | Do not install any write-capable upstream source handler |
| Create a well-formed change from an upstream product specification, using team schemas | **Partial** | Existing or improved upstream-to-change generation skill; checkpoints don't generate changes |
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

**Source basis:** Anonymized enterprise integration requirements from the original exploration. This table preserves that analysis; the consolidation did not independently re-read the source attachment. Source filenames and customer identifiers are omitted. Keep this material local pending a separate publication review.

## Pilot questions and acceptance

Use one real Git document, one OpenSpec change, and a deliberate source edit. Test a built-in Apply caller and a custom caller against the same interface.

- Does a relevant file edit produce drift while an unrelated commit does not?
- Do missing sources and revisions report unknown with a useful explanation?
- Can the developer accept or skip the post-Apply review without changing check results?
- Do repeated instruction reads remain read-only and avoid repeated prompts?
- Do checks leave pins, source files, code, and accepted plans unchanged?
- Are file-level pins useful enough, or is finer granularity necessary?
- Who can accept a new baseline, and how is the old one retained?
- Which additional lifecycle moments add value without duplicate warnings?

Before implementation, settle Git ref freshness, the result schema, manual invocation, duplicate suppression, and caller inputs. The selected model does not settle those contracts or authorize feature implementation.
