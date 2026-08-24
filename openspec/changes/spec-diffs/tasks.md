## 1. Add diff dependency

- [x] 1.1 Install the `diff` npm package: `pnpm add diff` (v9 ships its own types, so no `@types/diff`)

## 2. Requirement block extraction

- [x] 2.1 In `src/utils/requirement-diff.ts`, add `extractRequirementBlock(specContent, requirementName): MatchedRequirementBlock | null`. Match exactly first, then report a folded case/whitespace match as inexact, and return raw markdown through the next peer or higher header.
- [x] 2.2 Add unit tests for `extractRequirementBlock`: exact match, case-insensitive match, whitespace-insensitive match, no match returns null, last requirement in file (no following header), requirement inside code fence is not matched

## 3. Per-requirement diff utility

- [x] 3.1 In `src/utils/requirement-diff.ts`, add `diffRequirementBlock(baseBlock, deltaBlock): string` using `structuredPatch()` from `diff`, rendering only unified-diff hunks.
- [x] 3.2 Add unit tests: base exists (expect removals + additions), base is null (all additions), identical blocks (empty/minimal diff)
- [x] 3.3 Add function `buildRenameMap(renames: Array<{ from: string; to: string }>): Map<string, string>` that returns a map from normalized TO name → normalized FROM name, for use when looking up base blocks for MODIFIED requirements that were also renamed
- [x] 3.4 Add unit tests for `buildRenameMap`: single rename, multiple renames, chained renames, empty list

## 4. CLI flag registration

- [x] 4.1 In `src/cli/index.ts`, add `.option('--diff', 'Show per-requirement diffs for delta specs')` to the `show` command and the `change show` subcommand
- [x] 4.2 In `src/commands/show.ts`, add `'diff'` to the `CHANGE_FLAG_KEYS` set so it warns when used with `--type spec`

## 5. Text mode diff display

- [x] 5.1 In `src/commands/change.ts` `show()` method, discover files with `discoverSpecFiles()` and parse them with `parseDeltaSpec()`. Display ADDED, REMOVED, and RENAMED content directly; for MODIFIED, read the selected root's main spec, extract the matching block, and print a colorized unified diff.
- [x] 5.2 Build a rename map from the parsed RENAMED entries for the current spec. For MODIFIED requirements whose normalized name matches a RENAMED TO name, look up the base block using the RENAMED FROM name instead of the MODIFIED name
- [x] 5.3 Handle the no-delta-specs case: print "No delta specs to diff for change '<name>'" and return (exit code 0)
- [x] 5.4 Handle the MODIFIED-no-base-match case: print the full MODIFIED requirement text with a warning that no matching base requirement was found
- [x] 5.5 Add integration test: text mode diff with a change that has one MODIFIED and one ADDED requirement
- [x] 5.6 Add integration test: text mode RENAMED + MODIFIED on the same requirement — shows both the rename label and the body diff, with the base block looked up by the old name
- [x] 5.7 Add integration test: text mode MODIFIED with no matching base requirement — shows warning and full text

## 6. JSON mode diff output

- [x] 6.1 In `src/commands/change.ts` `show()` method, when `options.diff` and `options.json` are both set: for each MODIFIED delta, compute the diff (using rename map for base lookup) and add a `diff` string field to the delta object in the JSON output
- [x] 6.2 Add integration test: JSON mode diff output includes `diff` field on MODIFIED deltas only (not on ADDED/REMOVED/RENAMED)
- [x] 6.3 Add integration test: JSON mode RENAMED + MODIFIED — `diff` field on the MODIFIED delta shows changes relative to the old-name base block

## 7. Cross-platform and CI verification

- [x] 7.1 Ensure all path operations in new code use `path.join()` or `path.resolve()`; display paths normalize to forward slashes
- [x] 7.2 Ensure unit tests use `path.join()` for expected path values, not hardcoded slash strings
- [x] 7.3 Verify all existing tests pass (`pnpm test`)
- [x] 7.4 Verify Windows CI passes (no path-separator issues in requirement matching or file discovery)

## 8. Review follow-ups

- [x] 8.1 Keep `openspec show <change>` without `--diff` a raw proposal passthrough; `--diff` is purely additive
- [x] 8.2 Print the no-delta-specs message instead of returning silently, and cover it with a test
- [x] 8.3 Keep the authored Reason/Migration body of a REMOVED requirement: `parseDeltaSpec` now returns `removedBlocks` alongside `removed`
- [x] 8.4 Resolve main specs through the command's root (`--store <id>`), not `process.cwd()`, with a store-scoped regression test
- [x] 8.5 Collect text-mode and JSON-mode diffs in one shared pass so the two surfaces cannot drift
- [x] 8.6 Drive the CLI in tests with `execFileSync`/`spawnSync` argv arrays from a `mkdtemp` project instead of interpolated shell strings and an in-repo temp directory
- [x] 8.7 Register `--diff` in the completion command registry so shell completions offer it
- [x] 8.8 Drop the stray `package-lock.json`; the repo is pnpm-only
- [x] 8.9 Enumerate delta specs with the shared `discoverSpecFiles()` so nested capabilities (`specs/<area>/<id>/spec.md`) are diffed, with a regression test
- [x] 8.10 Warn instead of rendering all-additions when a MODIFIED requirement's capability has no main spec — that combination is an authoring error archive will reject, not a new capability
- [x] 8.11 Match requirement headers exactly first and fall back to the shared case/whitespace fold, reporting a folded match as inexact so the diff still shows but the mismatch is named
- [x] 8.12 Preserve both `diff` and `warning` in JSON when a folded match provides both diagnostics
- [x] 8.13 Propagate discovery, delta-read, and non-`ENOENT` main-read failures instead of returning partial output
- [x] 8.14 Resolve chained renames back to the original main requirement
- [x] 8.15 Distinguish a textually empty MODIFIED diff from a missing main block in text and JSON output
- [x] 8.16 Document `--diff` in the canonical `docs-lab` CLI reference and leave the legacy CLI page unchanged
