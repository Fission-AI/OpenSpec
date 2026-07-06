## Context

ClearSpec generates skills and slash commands through a hard-coded registry. The relevant pieces:

- `src/core/shared/tool-detection.ts` — `SKILL_NAMES` and `COMMAND_IDS` constants enumerate every skill directory name and command id (the "track it by name in a constant" rule).
- `src/core/templates/workflows/*.ts` — one module per workflow, each exporting a `get<Name>SkillTemplate(): SkillTemplate` and a `get<Name>CommandTemplate(): CommandTemplate` (or command content) function. Skill metadata uses `author: 'clearpoint', version: '1.0'`.
- `src/core/templates/skill-templates.ts` — a facade that re-exports the per-workflow getters.
- `src/core/shared/skill-generation.ts` — `getSkillTemplates(workflowFilter?)` returns `{ template, dirName, workflowId }[]`; `getCommandTemplates()`/`getCommandContents()` return the command entries keyed by id. Both filter by the active profile's workflow list. `generateSkillContent()` wraps a template in YAML frontmatter (`name`, `description`, `license`, `compatibility`, `metadata.author/version/generatedBy`).
- `src/core/profiles.ts` — defines `ALL_WORKFLOWS` (the full set) and `CORE_WORKFLOWS` (the `core` profile list). `WorkflowId` is derived from `ALL_WORKFLOWS`, so a new workflow id must be added there as well as to `CORE_WORKFLOWS` to ship by default.
- `src/core/command-generation/` — adapter registry that maps a command id to per-tool file paths (e.g. Claude `.claude/commands/clsx/<id>.md`, Cursor `.cursor/commands/clsx-<id>.md`). Adding a command id requires no adapter changes.
- `src/core/init.ts` — `InitCommand.generateSkillsAndCommands()` iterates the filtered templates and writes files for each selected tool; `createDirectoryStructure()` scaffolds the project folders from `CLEARSPEC_PROJECT_FOLDERS` (in `src/core/config.ts`), currently `requirements`, `context`, `code`, `spec-packs`.

This change adds **three** workflows — `check-readiness`, `deep-review`, `discover` — following the exact pattern of the existing eleven, and adds one scaffolded folder (`reports`). The bulk of the work is authoring the three skill instruction bodies so runtime behaviour matches the `clsx-readiness-pipeline` spec; the wiring is mechanical registry and constant additions.

### Why three commands instead of one

The original proposal modelled readiness as a single `check-project-ready` skill that ran artifact-gathering → product requirements → engineering requirements (with code cross-referencing) → iterative verification → persistent documents, end to end. Feedback from a colleague reshaped this into three explicit phases so that:

1. A **quick, mechanical** input check (Phase 1) can gate the more expensive work — we confirm the input docs are in good shape *before* starting a deep dialog.
2. The **interactive, human-in-the-loop** dialog (Phase 2, involving user + customer + agent) is cleanly separated from the mechanical gate and from the automated build.
3. The **largely automated** context build (Phase 3) has a clear, dedicated entry point that consumes the two prior reports. It is only "largely" automated because the agent may still surface clarifying questions or discussions when it discovers issues.

The full intent of the original POC is preserved and redistributed across the three skills: artifact-first prompting and input sufficiency live in Phase 1; the relentless `grill-me`/`grilling`-style one-question-at-a-time dialog lives in Phase 2; and product-then-engineering ordering, code cross-referencing, verification cycles, and the finalised `product-requirements.md`/`engineering-requirements.md` live in Phase 3.

## Goals / Non-Goals

**Goals:**
- Add three workflows (`check-readiness`, `deep-review`, `discover`) that generate the corresponding skills and `/clsx:` commands using the existing conventions, with zero special-casing in the generation pipeline.
- Ship all three by default by adding them to `ALL_WORKFLOWS` and `CORE_WORKFLOWS`.
- Scaffold a `clearspec/reports/` folder for the stage reports and their artifacts.
- Author skill instructions that implement the three phases and, critically, make every stage **re-runnable without breaking existing checkpoints** and **resumable across sessions** by loading prior state first.
- Add test coverage that mirrors the existing skill-generation and init tests.
- Keep all path handling cross-platform via `path.join()`.

**Non-Goals:**
- No new CLI subcommand or runtime code that reads/writes the reports or requirements documents — the documents are produced by the agent following the skill instructions, exactly as the other skills operate.
- No changes to the command-generation adapter mechanism (adding ids needs no adapter edits).
- Not implementing the later ClearSpec pipeline stages (`specify`, `plan-and-cost`, `execute`, `release`) or the `/clsx:deliver` orchestrator that would drive all stages automatically.

## Decisions

**Model the pipeline as three workflows in the registry, not one and not a bespoke feature.** For each of `check-readiness`, `deep-review`, `discover`: add the skill dir name to `SKILL_NAMES`, the command id to `COMMAND_IDS`, create `src/core/templates/workflows/<id>.ts` with `get<Name>SkillTemplate()` and the matching command-template getter, re-export from `skill-templates.ts`, and register both in `skill-generation.ts`. This reuses the entire generation, filtering, frontmatter, and adapter pipeline three times over.
- *Alternative considered:* keep a single `check-project-ready` workflow whose instruction body internally branches across the three phases. Rejected — the whole point of the split is three separately invocable, separately resumable commands; one skill cannot be entered "at Phase 2".
- *Alternative considered:* a standalone/one-off generation path. Rejected — it would duplicate the generation machinery and violate the single-registry convention.

**One capability spec (`clsx-readiness-pipeline`) covering all three stages, not three specs.** The three commands form one coherent pipeline and share cross-cutting behaviour (re-runnability, resumability, cross-platform paths, invocation modes). A single capability keeps that shared behaviour DRY, with per-stage requirements delineating each command's distinct responsibilities.
- *Alternative considered:* one capability per skill. Rejected — it would triplicate the shared cross-cutting requirements and obscure that these are one feature delivered in three parts.

**Reports per stage; requirements documents are `discover`'s finalised output.** Each stage owns a report under `clearspec/reports/`: `readiness-report.md` (Phase 1), `review-report.md` (Phase 2), `discovery-report.md` (Phase 3). The substantive `clearspec/requirements/product-requirements.md` and `clearspec/requirements/engineering-requirements.md` are produced and finalised by Phase 3, seeded from the two prior reports. This cleanly separates *process/checkpoint state* (reports) from the *substantive requirement artifacts* (requirements docs).
- *Alternative considered:* build the two requirements documents progressively from Phase 1 onward, with the reports as thin status logs. Rejected — it blurs the mechanical/interactive/automated separation and forces early stages to own documents they are not yet equipped to complete.
- *Alternative considered:* drop the two requirements documents entirely and keep only the three reports. Rejected — it loses the explicit product-vs-engineering requirement split that the POC and the downstream spec-ifying phase depend on.

**Add a `reports` folder to `CLEARSPEC_PROJECT_FOLDERS`.** The three reports (and their artifacts) need a home distinct from the substantive `requirements/` documents. Appending `reports` to the existing constant scaffolds it in fresh mode, extend mode, and `--tools none` with no further `init.ts` logic change, since both directory arrays already derive from the constant.
- *Alternative considered:* place reports inside `requirements/`, or add three per-stage folders. Rejected — mixing process reports with substantive docs is confusing, and three extra folders is heavier than the single grouped `reports/` folder.

**Add the three workflows to both `ALL_WORKFLOWS` and `CORE_WORKFLOWS`.** Project readiness is the first phase of the ClearSpec methodology, so all three ship by default. `WorkflowId` is derived from `ALL_WORKFLOWS`, so the ids must be added there too, not only to the core list.
- *Alternative considered:* expose them only via `custom` profiles. Rejected — the readiness phase precedes everything else; hiding it by default undercuts the workflow.

**Encode behaviour in each skill instruction body, following the `grill-me`/`grilling` style where interactive.** The three bodies drive, respectively:
- *`check-readiness`:* load any existing `readiness-report.md`; inspect supplied input documents (docs under `requirements/`/`context/`); assess presence and sufficiency of inputs against what the Product and Engineering requirements will need; flag missing/insufficient inputs as correctable issues; capture assumptions and risks; does not inspect or cross-reference code (a `discover` concern); write/update `reports/readiness-report.md` with a metadata header. No deep interview.
- *`deep-review`:* load `readiness-report.md`, any existing `review-report.md`, and inputs; run a one-question-at-a-time dialog with a recommended answer per question, exploring the input documents before asking (no code cross-referencing — deferred to `discover`); if an input file itself must change, direct the user back to `/clsx:check-readiness`; otherwise write findings/answers/discoveries to `reports/review-report.md` plus artifacts.
- *`discover`:* load inputs and both prior reports; request repos in `code/` and cross-reference requirements against code, surfacing open questions/conflicts/risks; gather Product Requirements before Engineering Requirements, recording unavoidable product gaps explicitly and carrying them into every cycle; run verification cycles (re-assess validity/completeness/quality, update outputs, repeat until sufficient); produce `reports/discovery-report.md` and finalise `requirements/product-requirements.md` and `requirements/engineering-requirements.md` with status metadata headers; may still pause to ask questions.
This mirrors how `clearspec-verify-change` encodes a multi-step procedure entirely in instructions.

**Every stage is re-runnable and resumable by construction.** Each instruction body MUST, before doing anything else, load its own prior output and the prior stages' reports into context, then continue from the recorded state and update its documents in place rather than recreating them. This is what lets a user run one stage, leave, and pick up the next stage (or re-run the same stage after correcting inputs) without losing or corrupting existing checkpoints. Re-running Phase 1 after input corrections is an explicit supported loop, as is Phase 2 sending the user back to Phase 1.

**Accept inputs in any format and from any channel.** The stages consume project inputs — including any pre-existing Product Requirements and Engineering Requirements documents the customer/team already has — as Markdown, Confluence pages, Google Docs, PDFs, or any combination, provided via connected MCP servers (e.g. Confluence, Google Drive), as files under `clearspec/requirements/`/`clearspec/context/`, or dropped directly into the Claude Code conversation. The skill bodies instruct the agent to gather from whichever sources are present rather than assuming files under `clearspec/`. Provided requirements docs are treated strictly as *inputs*, distinct from the finalised `product-requirements.md`/`engineering-requirements.md` that `discover` writes — so a customer PRD/ERD becomes seed material, not the output artifact.
- *Alternative considered:* require all inputs to be copied into `clearspec/` as Markdown first. Rejected — it adds a manual conversion/staging step and ignores that the source of truth often lives in Confluence/Drive reachable via MCP.

**Define the report and requirements-document filenames as named constants.** Per the "if we generate it, we track it by name in a constant" rule, `readiness-report.md`, `review-report.md`, `discovery-report.md`, `product-requirements.md`, and `engineering-requirements.md`, along with the `reports/`/`requirements/`/`code/` folder references, are referenced through constants rather than inlined string literals, so any future rename is single-sourced. The skill bodies reference them by their canonical names.

**Mirror existing tests rather than introduce snapshots.** The repo uses vitest with explicit assertions and no snapshot tests. Extend `test/core/shared/skill-generation.test.ts` (template count, structure, frontmatter, filtering includes the three new workflows) and `test/core/init.test.ts` (skill + command files generated for a tool, all three included in the `core` profile, absent when filtered out, the `reports/` folder scaffolded, cross-platform paths via `path.join`).

## Risks / Trade-offs

- **Hard-coded template/registry count assertions break.** Tests asserting a fixed skill-template total and the "9 skill directories" / "9 slash command files" spec scenarios will need updating to the new count (adding three) → update those assertions and the cli-init delta, and prefer asserting presence of specific `workflowId`s over a brittle total where practical.
- **Adding to `core` changes default init output.** Existing init tests that enumerate the exact `core` skill set will fail until updated → add the three skills to the `core` skill-set expectations and remove them from any non-core "should not exist" lists in `test/core/init.test.ts`.
- **New scaffolded folder changes init output.** Tests that iterate `CLEARSPEC_PROJECT_FOLDERS` pick up `reports/` automatically, but the cli-init Directory Creation spec scenarios enumerate the folder tree explicitly → update those scenarios to include `reports/`.
- **Instruction-body behaviour cannot be unit-tested directly.** The interview and staging logic lives in prose executed by an agent → tests cover that each skill/command is generated with correct names, frontmatter, and paths; behavioural fidelity is governed by the `clsx-readiness-pipeline` spec scenarios.
- **Stage coupling via reports.** Phase 2 and Phase 3 depend on the prior reports existing and being well-formed. The skill bodies must degrade gracefully when a prior report is missing (e.g. `deep-review` run before `check-readiness`) — the spec requires each stage run successfully whether or not prior outputs exist, gathering what it can rather than erroring.
- **Cross-platform paths.** Any path the skill instructions reference or that tests assert must use the platform separator → tests use `path.join()`; the skill instructions describe folder locations relative to `clearspec/` rather than hardcoding separators.
- **Input sources beyond the filesystem depend on MCP availability.** Inputs from Confluence/Google Docs are only reachable when the corresponding MCP server is connected; the skill bodies must degrade gracefully — using whatever inputs are present (files under `clearspec/`, conversation attachments) and flagging expected-but-unreachable sources rather than erroring. No runtime code depends on any MCP; the multi-source behaviour lives entirely in the instruction prose, so there is nothing extra to unit-test beyond generation.
