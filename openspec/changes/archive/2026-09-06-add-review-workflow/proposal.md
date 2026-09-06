# Proposal: add-review-workflow

## Why

The review workflow definition exists as a hand-authored file (`docs/openspec-review/SKILL.md`) and a hand-placed copy in the generated distribution tree (`skills/openspec-review/SKILL.md`), but the template pipeline knows nothing about it. `skills/` is generator-owned: the committed copy fails the skills.sh parity guard today (verified red), and the next `pnpm build && pnpm generate:skills` run will delete it. Only source templates can make the review skill durable, installable through `openspec init`, and byte-consistent across every delivery channel (init-generated skills, opsx commands, and the skills.sh distribution).

## What Changes

- Add `review` as a new workflow: an `openspec-review` skill template plus its paired `/opsx:review` command template, authored in the established per-workflow module pattern (like `verify-change.ts`).
- Register the workflow through the generation pipeline: skill/command template registries, skill-name and command-id catalogs, the workflow catalog (available workflows; not in the core profile — opt-in via custom workflow selection), the init and profile-sync-drift workflow maps, the command-reference map, and the config UI workflow metadata.
- The committed skills.sh copy `skills/openspec-review/SKILL.md` becomes generator-owned: `pnpm build && pnpm generate:skills` reproduces it byte-for-byte from the template, and the skills.sh parity guard turns green.
- `openspec init` installs the `openspec-review` skill and `/opsx:review` command for tools when the effective workflow selection includes `review`; the default core profile does not include it.
- Update the test guardrails that pin the workflow/skill/command set (template parity hashes, expected install sets, catalog enumerations).
- Update docs pages that enumerate skills and workflows.
- Remove the reference copy `docs/openspec-review/SKILL.md` once the template is the source of truth (its content is preserved in git history and in the template).

## Capabilities

### New Capabilities

- `opsx-review-skill`: user-facing contract for the review workflow — the `/opsx:review` command and `openspec-review` skill behavior (change selection, the review–critique–implement loop with read-only and write-capable roles, the four-condition consensus gate, the cycle report), its availability as an opt-in workflow, and the requirement that the committed skills.sh copy equals the generator's output for the review template.

### Modified Capabilities

- `cli-init`: the Skill Generation and Slash Command Generation requirements gain the `openspec-review/SKILL.md` skill directory and the `/opsx:review` command file when the effective workflow selection includes `review`.

## Impact

- **Source (registration points):** `src/core/templates/workflows/review.ts` (new), `src/core/templates/skill-templates.ts`, `src/core/shared/skill-generation.ts`, `src/core/config.ts`, `src/core/profiles.ts`, `src/core/init.ts`, `src/core/profile-sync-drift.ts`, `src/core/shared/tool-detection.ts`, `src/utils/command-references.ts`, `src/commands/config.ts`
- **Generated distribution:** `skills/openspec-review/SKILL.md` (regenerated; generator-owned thereafter)
- **Tests:** `test/core/templates/skill-templates-parity.test.ts`, `test/core/templates/skillssh-parity.test.ts` (currently red → green), `test/core/shared/skill-generation.test.ts`, `test/core/shared/tool-detection.test.ts`, `test/core/init.test.ts`, `test/core/update.test.ts`, `test/utils/command-references.test.ts`, `test/commands/config-profile.test.ts`
- **Docs:** `docs/supported-tools.md`, `docs-lab/reference/skills.md`, `docs-lab/reference/glossary.md`, `docs-lab/customize/profiles.md`
- **Coordination:** the in-progress change `unify-template-generation-pipeline` rewrites the same registration layer into a `WorkflowManifest`; it must carry the `review` workflow (see design.md)
- **No breaking changes:** additive workflow registration; existing profiles and installs are unaffected unless `review` is explicitly selected
