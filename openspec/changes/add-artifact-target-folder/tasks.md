## 1. Schema Type and Validation

- [ ] 1.1 Add optional `folder?: string` to `ArtifactSchema` Zod type in `src/core/artifact-graph/types.ts`
- [ ] 1.2 Add `.refine()` rule rejecting empty/whitespace-only `folder` values
- [ ] 1.3 Add `.refine()` rule rejecting absolute paths (`path.isAbsolute`) cross-platform (POSIX `/...`, Windows `C:\\...`)
- [ ] 1.4 Add `.refine()` rule rejecting `..` segments that escape after `path.normalize`
- [ ] 1.5 Add `.refine()` rule rejecting values that start with `openspec/` or equal `openspec`
- [ ] 1.6 Confirm Zod errors include the offending artifact ID and field path in the message
- [ ] 1.7 Surface `folder` on the `Artifact` type returned from `ArtifactGraph.getArtifact()` in `src/core/artifact-graph/graph.ts`

## 2. Path Resolution Helper

- [ ] 2.1 Create `src/core/artifact-graph/paths.ts` with `resolveArtifactBaseDir(artifact, changeDir, projectRoot)` returning `changeDir` when `folder` is unset and `path.resolve(projectRoot, folder)` when set
- [ ] 2.2 Use only `path.resolve` / `path.join` / `path.normalize` — no string concatenation of separators
- [ ] 2.3 Export the helper from `src/core/artifact-graph/index.ts` (or current barrel) for consumer access

## 3. Wire Resolver into Instruction Rendering

- [ ] 3.1 In `src/core/artifact-graph/instruction-loader.ts:271`, replace direct `artifact.generates` assignment to `outputPath` with the resolved absolute path via `resolveArtifactBaseDir`
- [ ] 3.2 In `src/commands/workflow/instructions.ts:174`, replace `path.join(changeDir, outputPath)` for the `Write to:` display with the resolved path from step 3.1
- [ ] 3.3 Verify default-folder artifacts produce identical output to pre-change behavior (string equality on the path)
- [ ] 3.4 Confirm the command does not write, modify, or remove any file at the resolved external path

## 4. Wire Resolver into Completion Detection

- [ ] 4.1 In `src/core/artifact-graph/state.ts:14-29` (`detectCompleted`), call `resolveArtifactBaseDir(artifact, changeDir, projectRoot)` before invoking `artifactOutputExists`
- [ ] 4.2 Pass the resolved base dir as the first argument to `artifactOutputExists` (existing helper at `src/core/artifact-graph/outputs.ts:40-42`); leave `artifactOutputExists` signature and globbing logic unchanged
- [ ] 4.3 Thread `projectRoot` to `detectCompleted` from its callers if it is not already available

## 5. Archive Preflight Warning

- [ ] 5.1 In `src/core/archive.ts`, before the `moveDirectory(changeDir, archivePath)` call at line 284, iterate the schema's artifact list
- [ ] 5.2 For each artifact with a `folder` field, call `artifactOutputExists` with the resolved external base dir
- [ ] 5.3 If zero matching files exist, append a warning line identifying the artifact ID, its `folder`, and its resolved absolute path
- [ ] 5.4 Print warnings to stdout (not stderr) and continue; do NOT block, prompt, or modify the exit code
- [ ] 5.5 Confirm the wholesale `moveDirectory` call is unchanged and external folders are not touched

## 6. Tests

- [ ] 6.1 In `test/core/artifact-graph/schema.test.ts`, add cases for: valid `folder` values, empty `folder`, absolute POSIX path, absolute Windows path (`C:\\...`), `..` escape, nested `..` escape, `openspec/` prefix, `openspec` exact match, and `folder` omitted entirely
- [ ] 6.2 Add a new `test/core/artifact-graph/paths.test.ts` covering `resolveArtifactBaseDir` for: no folder, simple folder, nested folder, Windows path separators (use `path.join` for expected values per project rule)
- [ ] 6.3 In `test/core/artifact-graph/state.test.ts`, add scenarios for external artifact `done` (file present in resolved folder), `ready` (folder absent or empty), and `blocked` (dependency unmet regardless of folder contents)
- [ ] 6.4 In `test/core/artifact-graph/instruction-loader.test.ts`, add a case asserting `outputPath` equals the resolved external path when `folder` is set, and is unchanged for default artifacts
- [ ] 6.5 In `test/commands/artifact-workflow.test.ts`, add an integration case where a schema declares `folder: "ADR"` and verify both the human `Write to:` line and the JSON `outputPath` reflect the resolved path
- [ ] 6.6 Add an integration case asserting that running `openspec instructions` against an artifact with pre-existing files at the external path does not mutate those files
- [ ] 6.7 In `test/core/archive.test.ts`, add: external artifact with files (no warning, files preserved post-archive), external artifact without files (warning emitted, archive succeeds, exit code unchanged), and external folder outside change dir is not moved
- [ ] 6.8 Run `pnpm test` and confirm the suite passes on the local platform; confirm CI passes on Windows runner if available

## 7. Documentation

- [ ] 7.1 Update the schema authoring guide (or schema-validate spec docs page) with a new section explaining the `folder` field, the validation rules, and the "no archive, no delta" contract
- [ ] 7.2 Add a worked example showing an `adr` artifact with `folder: "ADR"`, including an `instruction:` block that tells the agent to read existing files in `ADR/` before writing
- [ ] 7.3 Cross-link the section from the proposal's Impact bullet for future readers
