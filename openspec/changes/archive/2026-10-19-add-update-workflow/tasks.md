# Tasks: `/opsx:update` — a thin update skill

> The whole feature is one new skill template over the existing `openspec status` / `openspec list` commands. No changes to the graph engine, the `status` command, or the metadata schema.

## 1. The `/opsx:update` skill

- [x] 1.1 Create `src/core/templates/workflows/update-change.ts` with `getUpdateChangeSkillTemplate()` (skill) and `getOpsxUpdateCommandTemplate()` (command), mirroring `continue-change.ts`. The skill name is `openspec-update-change` — change-scoped, per the `openspec-<verb>-change` convention (see design, Naming).
- [x] 1.2 Instruction body (see design "The skill, written by hand"): resolve the change (infer / `openspec list --json` / ask) → `openspec status --change <id> --json` → read the relevant artifacts → apply the requested edit → reconcile the change's other existing artifacts in any direction → confirm and apply one artifact at a time → end with next-step guidance (`/opsx:continue` / `/opsx:apply` / `/opsx:archive` based on the change's state; see design Decision 6), never acting on it. Read artifact ids from the status JSON only, and write to `artifactPaths.<id>.existingOutputPaths` (never to a glob `resolvedOutputPath`).
- [x] 1.3 Encode the guardrails: (a) planning artifacts only — never edit code, hand off to `/opsx:apply`; (b) schema-driven — no branching on literal `proposal`/`specs`/`design`/`tasks`; ids/paths come from `openspec status`; (c) revise only existing files (`existingOutputPaths`) — defer not-yet-created artifacts, and new files under a glob artifact, to `/opsx:continue`; (d) intent change → recommend `/opsx:new` (the "Update vs. Start Fresh" heuristic in `docs/opsx.md`).
- [x] 1.4 Register the skill/command and add `update` to `ALL_WORKFLOWS` **and the default `core` profile** in `src/core/profiles.ts` (maintainer call: default install, not expanded-only).

## 2. Docs & supersede the stub

- [x] 2.1 Add a `/opsx:update` row to the command table in `docs/opsx.md`, plus a short "Updating a change" usage note.
- [x] 2.2 Remove (or fold) `openspec/changes/add-artifact-regeneration-support/` so the tree has a single update proposal.
- [x] 2.3 Update any generated-skill manifests/fixtures that enumerate workflow skills so `openspec-update-change` is included.

## 3. Tests

- [x] 3.1 Template generation snapshot for the skill and command templates.
- [x] 3.2 Assert the template's control flow contains NO hardcoded artifact-name branching (the anti-#777 guard): artifact ids must be read from `openspec status` JSON.
- [x] 3.3 Assert the template instructs planning-artifacts-only with a hand-off to `/opsx:apply` for code, and never advances the build frontier.
- [x] 3.4 Assert the template instructs writing to `existingOutputPaths` (the glob-expanded concrete files) and not to a glob `resolvedOutputPath`.
- [x] 3.5 Assert the template ends with next-step guidance (`/opsx:continue`/`/opsx:apply`/`/opsx:archive`) and instructs the agent never to act on it.
- [x] 3.6 Assert `update` is included in the `core` profile's workflows (profiles test).

## 4. End-to-end verification

- [x] 4.1 `openspec validate add-update-workflow --strict` passes; `openspec status --change add-update-workflow` shows all artifacts complete.
- [x] 4.2 Manual walk-through: on a `spec-driven` change, edit `design`, run `/opsx:update`, confirm it proposes coherence edits to other existing artifacts (including upstream where warranted) and never touches code.
