## 1. Add diff dependency

- [x] 1.1 Install the `diff` npm package: `pnpm add diff` and `pnpm add -D @types/diff`

## 2. Requirement block extraction

- [x] 2.1 Create `src/utils/requirement-block.ts` with a function `extractRequirementBlock(specContent: string, requirementName: string): string | null` that finds the `### Requirement: <name>` header (case/whitespace insensitive match) and returns the raw markdown from that header through all content until the next `###` header at the same or higher level (or EOF). Returns null if no match.
- [x] 2.2 Add unit tests for `extractRequirementBlock`: exact match, case-insensitive match, whitespace-insensitive match, no match returns null, last requirement in file (no following header), requirement inside code fence is not matched

## 3. Per-requirement diff utility

- [x] 3.1 In `src/utils/requirement-block.ts`, add function `diffRequirementBlock(baseBlock: string | null, deltaBlock: string, label: string): string` that uses `createPatch` from the `diff` package to produce a unified diff. When `baseBlock` is null, diff against empty string (all additions).
- [x] 3.2 Add unit tests: base exists (expect removals + additions), base is null (all additions), identical blocks (empty/minimal diff)
- [x] 3.3 Add function `buildRenameMap(renames: Array<{ from: string; to: string }>): Map<string, string>` that returns a map from normalized TO name → normalized FROM name, for use when looking up base blocks for MODIFIED requirements that were also renamed
- [x] 3.4 Add unit tests for `buildRenameMap`: single rename, multiple renames, empty list

## 4. CLI flag registration

- [x] 4.1 In `src/cli/index.ts`, add `.option('--diff', 'Show per-requirement diffs for delta specs')` to the `show` command and the `change show` subcommand
- [x] 4.2 In `src/commands/show.ts`, add `'diff'` to the `CHANGE_FLAG_KEYS` set so it warns when used with `--type spec`

## 5. Text mode diff display

- [x] 5.1 In `src/commands/change.ts` `show()` method, when `options.diff` is set and `options.json` is not set: use `ChangeParser.parseDeltaSpecs()` to get deltas grouped by capability, then for each delta: display ADDED (green label + full text), REMOVED (red label + removal notice), RENAMED (cyan label + FROM:/TO:); for MODIFIED, read the base spec, extract the matching requirement block, compute the diff, and print colorized output (green for `+` lines, red for `-` lines, dim for headers/context lines)
- [x] 5.2 Build a rename map from the parsed RENAMED entries for the current spec. For MODIFIED requirements whose normalized name matches a RENAMED TO name, look up the base block using the RENAMED FROM name instead of the MODIFIED name
- [x] 5.3 Handle the no-delta-specs case: print a message like "No delta specs found for change '<name>'" and return (exit code 0)
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
- [ ] 7.4 Verify Windows CI passes (no path-separator issues in requirement matching or file discovery)
