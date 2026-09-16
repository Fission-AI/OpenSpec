# Design: add-review-workflow

## Context

See proposal.md - Why for motivation. Verified current state that shapes the approach:

- `skills/` is generator-owned: `scripts/generate-skillssh.mjs` calls `cleanSkillSubdirectories()` then writes one `SKILL.md` per entry of `getSkillTemplates()`, via `generateSkillContent(template, 'skills.sh', transformToSkillReferences)` wrapped in `stripVolatileFrontmatter`. A directory in `skills/` that is not template-backed is deleted on the next run.
- `test/core/templates/skillssh-parity.test.ts` asserts (a) each committed file equals freshly generated content and (b) the committed directory set equals the template set. It is red today because `skills/openspec-review/` exists while no template does.
- Workflow templates follow the `verify-change.ts` pattern: one module under `src/core/templates/workflows/` exporting both the skill template factory and its paired opsx command template factory, re-exported through `src/core/templates/skill-templates.ts`.
- Bodies are authored with canonical `/opsx:<id>` references; `src/utils/command-references.ts` rewrites them per delivery channel using `COMMAND_TO_SKILL_NAME` (skills.sh channel: `/openspec-<skill>`; init channel: the tool's command invocation form).
- The reference definition (`docs/openspec-review/SKILL.md`, byte-identical to the committed copy) contains two self-references already spelled in the skills.sh flavor: `/openspec-review add-auth` and `/openspec-review <other>`.
- The multi-agent roles in the brief are prose instructions inside the skill body; subagent spawning is the executor's capability, not an openspec CLI feature. The skill body explicitly degrades to sequential self-execution of the briefs when spawning is unavailable.

## Goals / Non-Goals

**Goals:**
- The template is the single source of truth for the review skill's content in every delivery channel.
- `pnpm build && pnpm generate:skills` regenerates `skills/openspec-review/SKILL.md` byte-for-byte; the parity guard turns green and stays green.
- `openspec init` delivers the skill and command for workflow selections that include `review`; core selections do not receive it.
- Every registry, catalog, map, and test guard that pins the workflow set is updated in lockstep.

**Non-Goals:**
- No change to the review loop semantics defined by the reference briefs (roles, verdict vocabularies, consensus conditions are shipped as authored).
- No per-role tool-gating mechanism; no change to how any other workflow is generated.
- No repair of pre-existing staleness in unrelated spec enumerations (noted below, not touched).

## Decisions

### D1: Ship the paired `/opsx:review` command template
Every workflow in the catalog has both a skill template and a command template; `COMMAND_IDS`, the init/update test expectations, and the config UI metadata encode the 1:1 pairing. Alternative considered: skill-only delivery — rejected, it would require weakening several guards that pin the pairing invariant and diverges from every sibling workflow.

### D2: `review` is available but not core
Add `'review'` to `ALL_WORKFLOWS` in `src/core/profiles.ts`; do not add it to `CORE_WORKFLOWS`. Rationale: core is the lean new-user path (propose/explore/apply/update/sync/archive); a multi-agent review–fix loop is a power workflow with real compute cost, so it is opt-in via `openspec config` custom workflow selection. Alternative considered: core inclusion — rejected to keep default installs lean and because no requirement asks for it.

### D3: Author the template body from the reference definition with canonical references
The skill body is the reference definition's instructions verbatim, except the two self-references are authored as `/opsx:review add-auth` and `/opsx:review <other>`, and `'review': 'openspec-review'` is added to `COMMAND_TO_SKILL_NAME`. The skills.sh transform then rewrites them to the `/openspec-review` spellings present in the committed copy, so generated output equals the committed bytes. The command template body follows the same content, adapted to the command channel per sibling command templates. Alternative considered: hardcoding `/openspec-review` in the body — rejected because it bypasses the per-channel reference transform every other template relies on.

### D4: Frontmatter is generator-shaped, not hand-shaped
`generateSkillContent()` emits the frontmatter; the template only supplies `name`, `description`, `license`, `compatibility`, `metadata`. The committed copy already matches the generator's shape once `stripVolatileFrontmatter` removes `generatedBy`, so no frontmatter special case is needed. The `allowed-tools: Bash(openspec:*)` value stays as in every sibling skill: it is house boilerplate for the openspec CLI surface, while the write-capable IMPLEMENTER/SIMPLIFIER roles are governed by the prose boundaries inside the role briefs themselves (read-only roles never write; fixers are surgical and test-gated). A per-role tool-gating mechanism would be a separate change.

### D5: Remove `docs/openspec-review/SKILL.md` when the template lands
The reference copy has no home in the docs tree (no page references it) and would drift from the template. Its content survives in git history and in `src/core/templates/workflows/review.ts`. Alternative considered: keep as documentation — rejected, a second unowned copy of generated content is exactly what the parity guard exists to prevent.

### D6: Delta specs make minimal surgical edits to existing enumerations
The `cli-init` delta adds `openspec-review/SKILL.md` and `/opsx:review` to the two generated-set enumerations and adds one review-availability scenario, keeping the surrounding requirement text as-is. The pre-existing staleness of those enumerations (they list 9 entries while the pipeline today generates 12) is observed, recorded here, and deliberately not addressed in this change.

### D7: Coordinate with `unify-template-generation-pipeline`
That in-progress change (0 tasks complete) plans to replace this registration layer with a `WorkflowManifest`. This change lands first through the current pipeline; a coordination note is added to that change's tasks.md requiring the manifest to carry `review` with its skill/command pair, so the workflow is not silently dropped when the unification is implemented.

## Risks / Trade-offs

- [Byte-parity drift between hand-placed copy and generator output] → The parity test is the oracle: after authoring, run `pnpm build && pnpm generate:skills` and `git diff skills/`; an empty diff is the acceptance criterion. If output and the committed copy disagree, the template is corrected until the generated bytes match the reference definition — never the reverse.
- [Template-literal escaping: the body contains fenced code blocks, backticks, and `|` table pipes] → Escape as the sibling workflow modules do (`\`` inside template literals); verify via the byte-diff, not by eye.
- [Count/enumeration drift in test guardrails] (`init.test.ts`, `update.test.ts`, `skill-generation.test.ts`, `tool-detection.test.ts`, `config-profile.test.ts`, `command-references.test.ts`) → Update in the same commit; run the full suite; the parity hashes in `skill-templates-parity.test.ts` are regenerated by the test's own hashing routine for the two new factories.
- [Two channels, one body] → The skill and command templates share content; a later edit to one without the other is caught by the function-payload parity tests only for the pairs they cover — reviewers should diff both templates when either is changed.
- [Cross-platform] → No new path logic; the generator already composes paths with `node:path`. No platform-specific behavior is introduced; the generated tree is plain text written with UTF-8 encoding on all platforms.

## Migration Plan

Additive: existing installs are unaffected unless `review` is selected. Rollback is a clean revert of the registration commit; `skills/openspec-review/SKILL.md` and `docs/openspec-review/SKILL.md` are both recoverable from git history, and the generated tree is restorable with `pnpm build && pnpm generate:skills`.

## Open Questions

- Whether the stale 9-entry enumerations in the main `cli-init` spec should be refreshed to the current 12 (plus `review`) — deferred to a future docs/specs housekeeping change; it does not affect the specs, approach, or task breakdown here.
