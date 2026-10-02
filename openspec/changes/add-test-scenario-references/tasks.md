# Tasks

## 1. Reference grammar and canonical form

- [ ] 1.1 Add the canonical fold (NFKC, lowercase, non letter/mark/digit runs to a single `-`, trimmed) as one exported function, with the reason it is separate from a name documented beside `foldRequirementName`.
- [ ] 1.2 Add a reference parser that splits on `#`, accepts two or three parts, keeps `/` in the capability segment, and rejects any segment that does not already equal its own fold.
- [ ] 1.3 Make every rejection carry its repair: the canonical spelling for a non-canonical segment, and the offending characters for a token that is not a reference at all.
- [ ] 1.4 Cover the fold and the parser with cases for case, double hyphens, leading and trailing hyphens, NFKC and decomposed accents, non-ASCII letters, a name containing `#`, a name that folds to empty, nested capabilities, and part counts below two and above three.

## 2. Spec index and resolution

- [ ] 2.1 Build the index from `openspec/specs/**/spec.md` using `extractRequirementsSection`, `normalizeRequirementName`, `scenarioNameFromHeaderText` and `SCENARIO_HEADER`, with no second reading of the Markdown.
- [ ] 2.2 Resolve a reference to exactly one of `resolved`, `malformed`, `unresolved` or `ambiguous`, and report which part of an unresolved reference was not found.
- [ ] 2.3 Report an ambiguous short reference with the expanded reference for each candidate, and an ambiguous expanded reference against the capability and requirement that declare the colliding scenarios.
- [ ] 2.4 Compute the canonical reference for every indexed scenario, short where the scenario segment is unique in its capability and expanded otherwise.
- [ ] 2.5 Report a scenario whose fold is empty as unreferenceable rather than indexing it under the empty segment.
- [ ] 2.6 Prove resolution ignores `openspec/changes/` and the archive, and prove a renamed scenario invalidates its references with no similarity fallback.
- [ ] 2.7 Prove the index agrees with `show --json` on requirement and scenario names for a spec containing a closed ATX heading, a `####` header without the `Scenario:` label, and a `####` inside a fenced block.

## 3. Annotation scanner

- [ ] 3.1 Recognize `@openspec` at line start or after a character that is not a letter, digit or underscore, take the first whitespace-delimited token as the reference, and ignore the remainder of the line.
- [ ] 3.2 Test the raw buffer for the literal token before decoding or splitting lines, so a file without it costs one substring search.
- [ ] 3.3 Report each reference as a file, a line and a token, with no test framework or language parsing.
- [ ] 3.4 Cover the comment syntaxes in the spec, a token merely containing the word, a trailing comment closer with and without a separating space, two annotations above one test, CRLF files, and a UTF-8 BOM.

## 4. Scan boundaries

- [ ] 4.1 Enumerate candidates with `git ls-files -co --exclude-standard` in a git work tree, running git through `execFile` as `src/core/store/git.ts` does, and treating a missing git, a non-zero exit and an empty result as separate outcomes.
- [ ] 4.2 Fall back to a directory walk excluding `node_modules` and `.git` when git is unavailable or the root is not a work tree, and record which enumeration ran.
- [ ] 4.3 Exclude `openspec/` and `.git/` unconditionally, with no configuration path that can reach either.
- [ ] 4.4 Skip and count files with a NUL byte in the first 8 KiB, files above 2 MiB, unreadable files, and paths resolving outside the root including through a directory symlink.
- [ ] 4.5 Apply `coverage.include` and `coverage.exclude` from the project config as narrowing only, and record when a narrowing configuration applied.
- [ ] 4.6 Verify boundary behavior on Windows: `path.join` throughout, a directory symlink leaving the root, a junction, and two candidate paths differing only by case on a case-insensitive file system read once.

## 5. The coverage command

- [ ] 5.1 Add the `coverage` definition to `src/cli/index.ts` importing nothing heavy, with the implementation in `src/commands/coverage.ts` loaded inside the action.
- [ ] 5.2 Add `coverage` to the list in `test/cli-e2e/startup-modules.test.ts` so the definition cannot start pulling in the implementation.
- [ ] 5.3 Emit the human report in the order the spec gives: scan scope, then findings with their repairs, then a summary with unreferenced scenarios counted per capability.
- [ ] 5.4 Emit one `schemaVersion: 1` JSON document with `root`, `scan`, `references`, `scenarios` and `summary`, paths relative to the root with `/` separators.
- [ ] 5.5 Exit 1 when any reference is malformed, unresolved or ambiguous, and exit 0 when only scenarios are unreferenced.
- [ ] 5.6 Reuse the existing missing-root diagnostic and exit status, scanning nothing when no root resolves.
- [ ] 5.7 Prove JSON runs emit exactly one document on stdout with no human text, telemetry notice, completion tip or color sequence.

## 6. Completions and configuration

- [ ] 6.1 Register `coverage` and its `--json` option in the command registry so all four shell generators pick it up.
- [ ] 6.2 Add `coverage.include` and `coverage.exclude` to the project config schema, rejecting an unknown key under `coverage` the way the existing schema rejects one.

## 7. Verify nothing else moved

- [ ] 7.1 Prove `validate`, `archive`, `status` and the workflows are unchanged, and that none of them collects or resolves references.
- [ ] 7.2 Measure the scan on this repository and record the enumeration cost, the files read and the total, so the documented figures come from a run rather than an estimate.

## 8. Document and release

- [ ] 8.1 Document the annotation, the canonical form, and both reference forms in `docs-lab/`, with the first line saying this counts scenarios and not lines of code.
- [ ] 8.2 Document `openspec coverage`, its scan boundaries, its exit status and its JSON envelope in `docs-lab/reference/cli.md` using the current docs-lab format; do not update the legacy `docs/` tree.
- [ ] 8.3 Document `coverage.include` and `coverage.exclude` in `docs-lab/reference/configuration/`.
- [ ] 8.4 Add a minor changeset for `@fission-ai/openspec`.

## 9. Final verification

- [ ] 9.1 Run `pnpm build`, `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm lint`.
- [ ] 9.2 Run `openspec validate add-test-scenario-references --strict` and confirm every planning artifact is complete.
- [ ] 9.3 Run `openspec coverage` against this repository and confirm it reports 36 capabilities, 251 requirements and 747 scenarios, zero references, and exit 0.
