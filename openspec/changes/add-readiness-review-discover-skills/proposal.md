## Why

ClearSpec's methodology begins with **Verify Project Readiness** — surfacing gaps in Product and Engineering requirements before any context building or spec-ifying begins. Today `clearspec init` generates skills for every later phase (propose, explore, apply, sync, archive) but nothing for this first, foundational phase. Teams have no guided, repeatable way to assess whether a project is actually ready to be scoped, so incomplete requirements leak downstream into spec-packs.

Rather than deliver this as a single monolithic `check-project-ready` skill, this change splits the readiness work into **three sequential, independently-invocable stages**, each generated automatically on init:

1. `/clsx:check-readiness` — **Phase 1**, a quick, mechanical check that the *inputs* are in good enough shape to proceed. It flags missing or insufficient inputs, and captures assumptions and risks where it can, into a **readiness report**.
2. `/clsx:deep-review` — **Phase 2**, the interactive stage (user + customer + agent). It runs a relentless, one-question-at-a-time dialog to resolve the open questions and flags from Phase 1, and records findings, answers, and discoveries into a **review report** plus artifacts.
3. `/clsx:discover` — **Phase 3**, the (largely) automated stage. It builds up the whole context from the inputs and the two prior reports, cross-references the code, and produces a **discovery report** plus the finalised `product-requirements.md` and `engineering-requirements.md`.

Splitting the work keeps Phase 1 fast and mechanical (a cheap gate on input quality) before committing to the deeper, more expensive dialog in Phase 2, and clearly separates human-in-the-loop discussion from the automated context build in Phase 3. Each stage is **re-runnable at any time** and **resumable** — a user can run one stage, step away, and pick up the next stage days later, because every stage reads the prior stages' outputs and its own recorded state before doing anything.

## What Changes

- Add **three** generated workflows — `check-readiness`, `deep-review`, and `discover` — each producing a skill (`clearspec-check-readiness`, `clearspec-deep-review`, `clearspec-discover`) and a matching slash command (`/clsx:check-readiness`, `/clsx:deep-review`, `/clsx:discover`), produced by `clearspec init` using the same conventions as the existing skills/commands. Each is also invocable through standard semantic skill invocation.
- Add a new scaffolded folder, `clearspec/reports/`, to `CLEARSPEC_PROJECT_FOLDERS`, holding the three stage reports and their artifacts. The existing `requirements/`, `code/`, and `context/` folders are reused unchanged.
- **Phase 1 — `check-readiness`:** a fast, mechanical assessment of the supplied input documents (supporting docs in `requirements/`/`context/`). It checks the inputs are present and sufficient for the Product and Engineering requirements to come, flags missing or insufficient inputs as correctable issues, and captures assumptions and risks where possible. It does not inspect or cross-reference code — code is a Phase 3 (`discover`) concern. It writes/updates `clearspec/reports/readiness-report.md` with a metadata header (status, flagged issues, assumptions, risks, input completeness, what is still missing). It does **not** run the deep interview.
- **Phase 2 — `deep-review`:** loads the readiness report and inputs, then runs a guided, one-question-at-a-time dialog (in the relentless `grill-me`/`grilling` style, exploring the available input documents before asking, recommending an answer for each question) to resolve the flags and open questions across both product and engineering concerns. It does not explore or cross-reference code — that is deferred to Phase 3 (`discover`). If it finds that an **input file itself must change**, it directs the user to correct the inputs and re-run `/clsx:check-readiness` (a return to Phase 1). Once inputs are sound and the dialog is complete, it writes additional findings, answers, and discoveries to `clearspec/reports/review-report.md` plus artifacts.
- **Phase 3 — `discover`:** loads the inputs and both prior reports, builds up the whole context, requests relevant repositories be cloned into `clearspec/code/` and cross-references the requirements against that code (raising open questions and explicitly calling out conflicts or risks). It gathers **Product Requirements before Engineering Requirements**, recording unavoidable product gaps explicitly rather than silently skipping them, and works in **verification cycles**: after each batch of answers it re-assesses completeness and quality, updates its outputs, and repeats until sufficient. It produces `clearspec/reports/discovery-report.md` and finalises the substantive `clearspec/requirements/product-requirements.md` and `clearspec/requirements/engineering-requirements.md` (each with a status metadata header). This phase is *largely* automated but MAY still pause to ask clarifying questions or raise discussions when it discovers issues.
- **Cross-cutting for all three stages:** each command is idempotent and re-runnable without breaking existing reports/documents; loads any existing state (its own output and prior-stage reports) into context before acting; resolves all report/document paths cross-platform; and accepts project inputs — including any pre-existing Product/Engineering Requirements docs — in any format (Markdown, Confluence, Google Docs, PDF, or a combination) and from any source (connected MCPs such as Confluence or Google Drive, files under `clearspec/`, or dropped directly into the conversation). Provided requirements docs are treated as **inputs**, distinct from the finalised `product-requirements.md`/`engineering-requirements.md` that `discover` produces.
- Add all three workflows to the default (`core`) profile so they ship by default, and add test coverage matching the existing skill-generation/init test patterns.

## Capabilities

### New Capabilities
- `clsx-readiness-pipeline`: Behaviour of the three generated readiness-pipeline skills (`/clsx:check-readiness`, `/clsx:deep-review`, `/clsx:discover`) — the staged, re-runnable, resumable readiness → review → discovery flow that produces the readiness/review/discovery reports and the finalised `product-requirements.md` and `engineering-requirements.md`.

### Modified Capabilities
- `cli-init`: `clearspec init` now also generates the three readiness-pipeline skills and their `/clsx:` commands for each selected tool, scaffolds the `clearspec/reports/` folder, and includes the `check-readiness`, `deep-review`, and `discover` workflows in the default `core` profile.

## Impact

- Code:
  - `src/core/config.ts` — add `reports` to `CLEARSPEC_PROJECT_FOLDERS`.
  - `src/core/templates/workflows/check-readiness.ts`, `deep-review.ts`, `discover.ts` — three new skill + command templates.
  - `src/core/templates/skill-templates.ts` — re-export the new template getters.
  - `src/core/shared/skill-generation.ts` — register the three new entries in `getSkillTemplates()` and `getCommandTemplates()`.
  - `src/core/shared/tool-detection.ts` — add the three skill dir names to `SKILL_NAMES` and the three command ids to `COMMAND_IDS`.
  - `src/core/profiles.ts` — add `check-readiness`, `deep-review`, `discover` to both `ALL_WORKFLOWS` and the `CORE_WORKFLOWS` list.
- Tests:
  - `test/core/shared/skill-generation.test.ts` — template count/structure, filtering, frontmatter for the three new workflows.
  - `test/core/init.test.ts` — skill + command files generated under `.<tool>/skills/` and `.<tool>/commands/clsx/`, core-profile inclusion, the new `reports/` folder scaffolded, cross-platform paths.
- Spec: `openspec/specs/cli-init/spec.md` — Directory Creation, Skill Generation, and Slash Command Generation updated via delta (folder set, 9 → 12 skills/commands), plus profile coverage.
- Runtime folders consumed by the skills: `clearspec/requirements/`, `clearspec/code/`, and `clearspec/context/` already exist from `clearspec init`; this change adds `clearspec/reports/`.
- No breaking changes; existing skills, commands, folders, and behaviour are preserved.

## Non-Goals (future pipeline stages)

This change delivers only the first three stages. The later ClearSpec pipeline stages discussed alongside this work are explicitly out of scope here and recorded only for context:

- `/clsx:specify` — turning the discovery outputs into spec-packs (likely itself broken into smaller commands).
- `/clsx:plan-and-cost` — planning and costing.
- Optional `/clsx:execute` and `/clsx:release` — only if building the software is in scope (usually it is not).
- A single `/clsx:deliver` orchestrator that drives all stages automatically, issuing the sub-commands as needed. For now the stages are run by invoking each command explicitly.
