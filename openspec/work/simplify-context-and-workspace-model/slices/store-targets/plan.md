# Store Targets Plan (3.4)

## Status

Spec locked 2026-06-11 after two adversarial rounds (the apply-surface
metadata flow; empty-narrowing semantics; status in JSON; remote
inheritance; the grammar cliff owned; the neutral kebab predicate).
Plan drafted 2026-06-11. Implementation not started.

The main move:

```text
One shared declaration parser, one pure assembly module, one metadata
field — and every change can say which code repos it is about.
```

## Source Of Truth

Start from `spec.md` (this folder). Keep nearby: `../../roadmap.md`
(Phase 3 locks: one id namespace, declarations-not-links, the 3.3
store.yaml constraint), `../store-references/spec.md` (the rendering
and degradation patterns this mirrors).

## Current Code Map (verified during spec review)

- **Config parser**: the references block (`project-config.ts:178-227`,
  self-contained ~50 lines) generalizes to
  `parseDeclarationList(raw, fieldName)`; `ProjectConfig` gains
  `targets?: ReferenceDeclaration[]` beside `references`.
- **Kebab predicate**: two identical regexes exist —
  `validateStoreId`'s (`store/foundation.ts:110`) and the
  `KebabIdentifierSchema` FACTORY (`change-metadata/schema.ts:3-11` —
  `(label) => z.ZodString`, currently private, imports only zod; no
  cycle risk). Export a neutral `isKebabId(value)` from there;
  foundation's `validateStoreId` DELEGATES its grammar test to it
  (messages unchanged — the store-id tests pin them), so one regex
  remains. References' `isValidStoreId` call (`references.ts:248`)
  stays — store ids ARE store ids there; targets use the neutral
  name. Schema usage needs the label call:
  `z.array(KebabIdentifierSchema('Target id')).optional()` — which
  also satisfies the "zod message naming the field" clause.
- **Change metadata**: `ChangeMetadataSchema`
  (`change-metadata/schema.ts:22`, non-strict zod) gains
  `targets: z.array(KebabIdentifierSchema('Target id')).optional()`;
  the read path (`change-metadata.ts` → `readChangeMetadata`) needs no
  changes.
- **Instruction paths**:
  - Artifact: `instructionsCommand` (`instructions.ts:117-151`) —
    `loadChangeContext` runs BEFORE the config read, so
    `context.metadata?.targets` and `projectConfig.targets` are both
    in hand at the assembly point; thread the assembled result into
    `generateInstructions` options (like references). The data shape
    lives in `instruction-loader.ts` (`ArtifactInstructions.targets?`,
    `GenerateInstructionsOptions.targets?`); the human XML block
    renders in `printInstructionsText`
    (`instructions.ts:215`, immediately after the referenced-stores
    block) — instruction-loader does NO rendering.
  - Apply: `applyInstructionsCommand` (`instructions.ts:450-470`) has
    the config but NOT the change context; `generateApplyInstructions`
    (`instructions.ts:330+`) loads it internally. Pass `storeTargets`
    AND the resolved `storeConfigPath` through
    `GenerateApplyInstructionsOptions` (the fix text needs the actual
    `.yaml`/`.yml` path, and `resolveConfigFilePath` is private —
    resolve it once at the command boundary for both surfaces);
    assemble inside where `context.metadata` exists; surface on
    `ApplyInstructions.targets` and render in
    `printApplyInstructionsText` after `### Referenced Stores`
    (`instructions.ts:487-490`).
- **Renderers/diagnostics**: mirror `references.ts` shapes
  (`renderReferencedStoresBlock/Section`, `makeStoreDiagnostic`
  warnings) in the new pure module; envelope `target: 'targets'`.
- **Tests**: `test/core/project-config.test.ts` (parser),
  new `test/core/targets.test.ts` (assembly + renderers),
  `test/commands/store-references.test.ts` sibling
  `test/commands/store-targets.test.ts` (surfaces + e2e),
  `test/utils/change-metadata.test.ts` (`describe('ChangeMetadataSchema')`
  at :15 — the zod validation home), helpers in `test/helpers/`.
  Convention: inline expected strings (`toEqual`/`toContain`) — the
  repo has no snapshot files; pin the exact `Note:`/`Fix:` lines for
  both warning codes and the provenance wording inline.

## Implementation Plan

### Checkpoint 1 — parser, metadata, assembly module (commit)

1. `project-config.ts`: extract `parseDeclarationList(raw, fieldName)`
   from the references block; wire `references` (behavior-identical —
   the 3.1/3.3 parser pins, which hardcode the word 'references' in
   warning strings, must stay green untouched: the extracted parser
   templates the field name) and the new `targets` field through it.
2. Neutral kebab predicate: export `isKebabId` from
   `change-metadata/schema.ts`; `validateStoreId` delegates its
   grammar test to it (one regex left, messages unchanged);
   `ChangeMetadataSchema.targets` =
   `z.array(KebabIdentifierSchema('Target id')).optional()`.
3. `src/core/targets.ts` (pure, no I/O):
   - `EffectiveTargets {source: 'store'|'change', repos:
     ReferenceDeclaration[], status: StoreDiagnostic[]}`.
   - `assembleTargets({storeTargets, changeTargets, storeConfigPath,
     changeMetadataPath})`: change list (non-empty) replaces store
     list with remote inheritance by id join; empty/absent change
     list → store list; `target_invalid_id` for grammar-invalid
     config-side ids (kept out of repos, warned); `target_not_declared`
     for narrowed ids outside the store vocabulary (kept IN repos,
     warned, fix naming both files); returns null when neither level
     declares.
   - `renderTargetReposBlock(effective)` (XML) and
     `renderTargetReposSection(effective)` (markdown): comment line,
     provenance line, `- id` / `- id (clone: remote)` lines, Note/Fix
     lines for status entries.
4. Tests: parser (both fields identical incl. mixed duplicates;
   references pins untouched); assembly matrix (store-only, narrowed,
   narrowed-equal-set still `source: change`, narrowed-with-remote
   inheritance, outside-vocabulary, invalid config ids, empty change
   array → store, neither → null); inline expected renderer strings
   (exact `Note:`/`Fix:` lines for both warning codes, the provenance
   wording); zod rejection of grammar-invalid change targets in
   `test/utils/change-metadata.test.ts`.

### Checkpoint 2 — surfaces, e2e, docs (commit)

1. Artifact surface: assemble in `instructionsCommand` after
   `loadConfigAndReferences`; pass through `GenerateInstructionsOptions
   .targets`; `ArtifactInstructions.targets?` (data shape in
   instruction-loader.ts); JSON spread omitted-when-null; human block
   rendered in `printInstructionsText` (`instructions.ts:215`)
   immediately after the referenced-stores block.
2. Apply surface: `GenerateApplyInstructionsOptions.storeTargets?`;
   assembly inside `generateApplyInstructions` (change context in
   hand); `ApplyInstructions.targets?`; JSON + the markdown section in
   `printApplyInstructionsText` after `### Referenced Stores`.
3. Surface tests (`test/commands/store-targets.test.ts`): JSON shape
   incl. status and omitted-when-none; human blocks both modes both
   surfaces (asserting exit 0 on warning cases); provenance lines; the
   APPLY narrowing case; warnings in JSON; e2e PM-to-dev flow (store
   with targets via `--store` and via a pointer repo — resolved
   root's config wins over cwd config; one change narrows while a
   SECOND change keeps the full store set; nearest-root sessions are
   covered by the non-e2e surface tests).
4. Byte-identity pins: new change/validate/archive/list/show AND root
   resolution (a pointer dir whose config also carries `targets:`
   resolves identically — readStorePointer ignores other fields) with
   well-formed targets vs none — stdout identical (instructions
   excluded). Plus the unknown-store pin: declare
   `targets: [api-server]`, never register `api-server`, run a command
   with `--store api-server`, assert the diagnostic is byte-identical
   to a targets-less config.
5. `docs/cli.md`: "Declaring target repos" subsection (targets vs
   affected_areas sentence included).
6. Full suite; built-binary smoke of the UX transcript.

## Risks And Guardrails

- **References regression surface**: the parser extraction touches
  3.1/3.3's most-pinned code path. The pins in
  `test/core/project-config.test.ts` and the references suites are
  the net; run them first after the extraction.
- **The apply options-bag growth**: `GenerateApplyInstructionsOptions`
  gains `storeTargets` beside `references` — keep the same
  omitted-when-none JSON discipline (spread pattern, no empty
  arrays/objects).
- **Vocabulary sweep**: 'targets' is not a banned token; new
  diagnostic codes (`target_not_declared`, `target_invalid_id`) join
  the taxonomy — the capstone inventory picks them up; no
  allowlist test touches them (verify the diagnostics-shape sweep
  patterns don't pin code lists).
- **No I/O in targets.ts**: the module takes parsed inputs only;
  storeConfigPath/changeMetadataPath arrive as strings for fix text.
- **Provenance wording**: exactly "Declared by the store config." /
  "Narrowed by this change." — pin once in a renderer test.

## Done Definition

- All spec acceptance scenarios pass; both checkpoints green on the
  full suite and committed.
- The e2e proves store-default + narrowed flows through the resolved
  root in `--store` and pointer sessions.
- Roadmap 3.4 boxes ticked through "Tests pass"; changelog updated;
  pointer moved to 3.5.
