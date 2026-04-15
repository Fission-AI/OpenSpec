## 1. Extend ProjectConfig schema

- [ ] 1.1 Add `RequireSpecDeltasSchema` as `z.union([z.enum(["error", "warn"]), z.literal(false)])` and add optional top-level `requireSpecDeltas` to `ProjectConfigSchema` in `src/core/project-config.ts`
- [ ] 1.2 Add resilient field-by-field parsing for `requireSpecDeltas` in `readProjectConfig()`, following the same safeParse pattern as other fields (warn on invalid, omit from result)
- [ ] 1.3 Add unit tests for config parsing: `"error"`, `"warn"`, `false`, missing, invalid string, invalid type

## 2. Thread config into Validator

- [ ] 2.1 Change `Validator` constructor to accept a config object `{ strictMode?: boolean; requireSpecDeltas?: 'error' | 'warn' | false }` instead of bare `strictMode`, defaulting `requireSpecDeltas` to `'error'`
- [ ] 2.2 Update `ValidateCommand.validateByType()` and `runBulkValidation()` to read project config via `readProjectConfig(process.cwd())` and pass `requireSpecDeltas` to the Validator
- [ ] 2.3 Update all existing `new Validator(...)` call sites to use the new config object shape

## 3. Implement tri-state CHANGE_NO_DELTAS behavior

- [ ] 3.1 Add `CHANGE_NO_DELTAS_ALLOWED` message constant to `src/core/validation/constants.ts`
- [ ] 3.2 In `validateChangeDeltaSpecs()`, change the `totalDeltas === 0` block: emit ERROR when `'error'`, emit WARNING when `'warn'`, emit nothing when `false`
- [ ] 3.3 Add unit test: `requireSpecDeltas: 'error'` (default) with zero deltas → existing ERROR behavior unchanged
- [ ] 3.4 Add unit test: `requireSpecDeltas: 'warn'` with zero deltas → report.valid `true`, one WARNING
- [ ] 3.5 Add unit test: `requireSpecDeltas: 'warn'` + `strictMode: true` → report.valid `false`
- [ ] 3.6 Add unit test: `requireSpecDeltas: false` with zero deltas → report.valid `true`, zero issues from this check

## 4. Synthetic completion in artifact graph

- [ ] 4.1 Add optional `options` parameter to `detectCompleted()` in `src/core/artifact-graph/state.ts` with `requireSpecDeltas` field
- [ ] 4.2 After the file-existence loop, synthetically add `'specs'` to the completed set when `requireSpecDeltas` is `'warn'` or `false` and no spec files were found
- [ ] 4.3 Update `loadChangeContext()` in `src/core/artifact-graph/instruction-loader.ts` to read project config and pass `requireSpecDeltas` to `detectCompleted()`
- [ ] 4.4 Add unit test: `requireSpecDeltas: false` → `specs` in completed set even with no files
- [ ] 4.5 Add unit test: `requireSpecDeltas: 'error'` → `specs` not in completed set without files (existing behavior)
- [ ] 4.6 Add unit test: spec files exist → `specs` in completed set regardless of config

## 5. "Skipped" status display

- [ ] 5.1 Add `'skipped'` to the `ArtifactStatus.status` type in `src/core/artifact-graph/instruction-loader.ts`
- [ ] 5.2 In `formatChangeStatus()`, check whether a completed artifact actually has files via `artifactOutputExists()` — if not, set status to `'skipped'` instead of `'done'`
- [ ] 5.3 Add `'skipped'` case to `getStatusIndicator()` (`[~]`) and `getStatusColor()` (`chalk.dim`) in `src/commands/workflow/shared.ts`
- [ ] 5.4 Add unit test: synthetically completed artifact shows `"skipped"` in JSON status output
- [ ] 5.5 Add unit test: skipped artifacts count toward completed total in progress display

## 6. Integration and verification

- [ ] 6.1 Add integration test: temp project with `requireSpecDeltas: false`, change with no specs → `openspec validate <change>` passes, `openspec status --change <change> --json` shows `specs: "skipped"` and `tasks: "ready"`
- [ ] 6.2 Verify all existing tests pass (`pnpm test`)
- [ ] 6.3 Verify Windows CI passes (no path-separator issues in config loading or state detection)
