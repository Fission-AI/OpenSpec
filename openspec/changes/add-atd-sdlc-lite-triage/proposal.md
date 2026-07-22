# Add ATD SDLC Lite Schema and Change Triage

## Why

The full `atd-sdlc` pipeline (six artifacts) is right for feature work but is disproportionate ceremony for small, low-risk corrections — a null guard, a log fix, a config correction. Forcing every ticket through specs, design, and solution-doc threatens adoption. OpenSpec schemas are static DAGs, so one schema cannot conditionally skip artifacts; the right mechanism is routing between two schemas at change creation via the existing `--schema` option.

Depends on `add-atd-sdlc-schema` (shares its ticket and analysis instruction content).

## What Changes

- Add a built-in schema `schemas/atd-sdlc-lite/` with the pipeline `ticket → analysis → tasks` (apply tracks tasks.md; closure is a task).
- Lite `ticket` is the compact form: Jira source, problem statement, acceptance criteria, confirmation that the change restores existing intended behavior.
- Lite `analysis` is a short impact assessment: root cause, target files, the existing specification/test covering intended behavior, risk assessment, and why the change qualifies for lite processing.
- Lite `tasks` follows a standard shape: implement correction, add/update regression test, run verification, verify applicable coding standards, record that no new solution document or durable documentation set is needed, apply any localized correction to existing documentation, and add an idempotent Jira closure comment.
- Add an `atd-change-triage` skill: given a Jira ticket, evaluate the documented eligibility decision table, recommend lite or full with reasons, and create the change with the chosen `--schema` only after developer confirmation. Confirmation is monotonic — a lite recommendation may be strengthened to full, but a full recommendation cannot be weakened to lite; declines quote the failed or uncertain conditions. Triage rationale is written to a non-artifact `triage.md` sidecar (never a partial `ticket.md`, which would falsely complete the ticket artifact and skip intake/grilling); the ticket artifact folds the record into `ticket.md`, and escalations append to `triage.md`.
- Eligibility is risk-based, never line-count-based: all conditions must pass (single repo/component, localized impact, restores specified behavior, no API/data/security/integration/dependency/infra impact, straightforward regression test, trivial rollback, and no need for a new solution document or durable functional/technical documentation set). Localized corrections to existing documentation remain lite-eligible when they do not reveal a full-workflow impact. Any failure or uncertainty → full.
- Triage performs a bounded codebase preflight before classifying — owning component, entry points and call path, covering tests/specs, contract/data/security/dependency/integration/deployment impact — because these conditions cannot be reliably determined from Jira text alone. Unverifiable from ticket or code → uncertain → full. Lighter than analysis.md: only enough to classify safely.
- One-way escalation applies whenever a full-workflow trigger is discovered. Before tasks exist, update `.openspec.yaml` to `schema: atd-sdlc` and retain the full-compatible ticket and analysis. After `tasks.md` exists or during apply, stop lite work, move `tasks.md` to `tasks.lite.md` so it cannot falsely satisfy the full schema, append the escalation record, update ticket/analysis for the wider scope, switch schemas, and generate specs → design → solution-doc → a new full `tasks.md` that reconciles any partial implementation. Downgrading full to lite after planning begins is not supported.

## Capabilities

### New Capabilities

- `atd-sdlc-lite-workflow`: the three-artifact lite pipeline, its compact artifact rules, and the one-way escalation to the full schema.
- `atd-change-triage`: the entry-point skill that classifies a ticket against the eligibility table and creates the change with the confirmed schema.

## Impact

- New: `schemas/atd-sdlc-lite/schema.yaml` + templates. Shared instruction text is duplicated from `atd-sdlc` (schemas cannot include content) and guarded by a parity test.
- Modified: `schemas/atd-sdlc/schema.yaml` — the full schema's ticket instruction reads `triage.md` when present and includes the routing record in `ticket.md` (proceeds normally when absent).
- New: `atd-change-triage` delivered through both generation paths — skill template and `/opsx:atd-triage` command template — requiring additive TypeScript source changes (workflow template exports, skill and command generation registries, profile/selection mappings, init/update synchronization, parity tests, committed generated artifacts). Added to the fork's CORE_WORKFLOWS so init installs triage by default. Eligibility decision table in `docs/atd/`.
- No artifact-graph or CLI behavior changes; routing uses the existing `--schema` flag and escalation uses the supported schema-metadata reread.
- Pilot metrics extended with lite/full selection rate and lite→full escalation rate.
