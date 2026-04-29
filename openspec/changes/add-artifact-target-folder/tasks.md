## 1. Schema Type and Validation

- [x] 1.1 Add optional `folder?: string` to `ArtifactSchema` Zod type in `src/core/artifact-graph/types.ts`
- [x] 1.2 Attach a `.refine()` to the `folder` field with these checks (Node stdlib only — no bespoke cross-platform code):
  - non-empty after `trim()`
  - `!path.isAbsolute(folder)` (handles POSIX `/…` and Windows `C:\…` natively)
  - after `path.resolve(stubProjectRoot, folder)`, result remains under `stubProjectRoot` (rejects `..` escapes in any form)
  - normalized value (`path.normalize`) does not start with `openspec/` and is not equal to `openspec`
- [x] 1.3 Confirm Zod errors include the offending artifact ID and field path in the message
- [x] 1.4 Surface `folder` on the `Artifact` type returned from `ArtifactGraph.getArtifact()` in `src/core/artifact-graph/graph.ts`

## 2. Path Resolution Helper

- [x] 2.1 Create `src/core/artifact-graph/paths.ts` exporting `resolveArtifactBaseDir(artifact, changeDir)` — returns `changeDir` when `folder` is unset, otherwise `path.resolve(path.resolve(changeDir, '../../..'), folder)`. Derives `projectRoot` internally; no caller needs to thread it.
- [x] 2.2 Use only `path.resolve` / `path.join` / `path.normalize` — no string concatenation of separators
- [x] 2.3 Export the helper from `src/core/artifact-graph/index.ts` (or current barrel) for consumer access

## 3. Wire Helper into `resolveArtifactOutputs` (single touch point)

- [x] 3.1 In `src/core/artifact-graph/outputs.ts:19`, replace the inline `path.join(changeDir, generates)` with `path.join(resolveArtifactBaseDir(artifact, changeDir), generates)`. Adjust the function signature to accept the artifact (or the resolved base dir) so callers don't need to know whether `folder:` is set.
- [x] 3.2 Update the two callers of `resolveArtifactOutputs()` in `src/commands/workflow/instructions.ts:269/277` and the `artifactOutputExists` wrapper in `src/core/artifact-graph/outputs.ts` to pass the artifact through. **Do not modify** `src/core/artifact-graph/state.ts` or `src/core/artifact-graph/instruction-loader.ts` beyond what the signature change forces — the behavior change flows through transitively.
- [x] 3.3 In `src/commands/workflow/instructions.ts:162` and `:174`, route the display-only `path.join(changeDir, …)` lines through `resolveArtifactBaseDir` so the printed `Write to:` path matches the actual write target.
- [x] 3.4 Verify default-folder artifacts produce identical output to pre-change behavior (string equality on the path).
- [x] 3.5 Confirm the command does not write, modify, or remove any file at the resolved external path.

## 4. Archive: no code changes

- [x] 4.1 Confirm `src/core/archive.ts` is untouched. The wholesale `moveDirectory(changeDir, archivePath)` call physically cannot reach files at external `folder:` paths, so no skip logic, no preflight warning, and no flag is required.

## 5. Tests

- [x] 5.1 In `test/core/artifact-graph/schema.test.ts`, add cases for: valid `folder` values, empty `folder`, absolute POSIX path, absolute Windows path (`C:\\...`), `..` escape, nested `..` escape, `openspec/` prefix, `openspec` exact match, and `folder` omitted entirely
- [x] 5.2 Add a new `test/core/artifact-graph/paths.test.ts` covering `resolveArtifactBaseDir` for: no folder, simple folder, nested folder, derivation of `projectRoot` from a representative `changeDir`. Use `path.join` for expected values per project rule.
- [x] 5.3 In `test/core/artifact-graph/state.test.ts`, add scenarios for external artifact `done` (file present in resolved folder), `ready` (folder absent or empty), and `blocked` (dependency unmet regardless of folder contents)
- [x] 5.4 In `test/core/artifact-graph/instruction-loader.test.ts`, add a case asserting `outputPath` equals the resolved external path when `folder` is set, and is unchanged for default artifacts
- [x] 5.5 In `test/commands/artifact-workflow.test.ts`, add an integration case where a schema declares `folder: "ADR"` and verify both the human `Write to:` line and the JSON `outputPath` reflect the resolved path
- [x] 5.6 Add an integration case asserting that running `openspec instructions` against an artifact with pre-existing files at the external path does not mutate those files
- [x] 5.7 Run `pnpm test` and confirm the suite passes on the local platform; confirm CI passes on Windows runner if available

## 6. Documentation

- [x] 6.1 Update the schema authoring guide (or schema-validate spec docs page) with a new section explaining the `folder` field, the validation rules, and the "no archive, no delta" contract — including a note that no preflight warning will fire if an author forgets to write the external file before archiving (use `openspec status` to verify).
- [x] 6.2 Add a worked example showing an `adr` artifact with `folder: "ADR"`, including an `instruction:` block that tells the agent to read existing files in `ADR/` before writing
- [x] 6.3 Cross-link the section from the proposal's Impact bullet for future readers
