## 1. Hook Discovery

- [ ] 1.1 Create `src/core/hooks.ts` with `discoverHooks(projectRoot, phase)` function
- [ ] 1.2 Scan `openspec/hooks/*/` for integration folders
- [ ] 1.3 Parse filenames: extract timing (before/after) and phase name from `{timing}-{phase}.md`
- [ ] 1.4 Concatenate hooks from all folders (alphabetical order by folder name)
- [ ] 1.5 Add file content loading with 50KB size limit per file
- [ ] 1.6 Warn on duplicate files within same integration folder

## 2. Template Integration

- [ ] 2.1 Update `slash-command-templates.ts` to accept hooks parameter
- [ ] 2.2 Create `injectHooks()` function for before/after positioning
- [ ] 2.3 Modify `getSlashCommandBody()` to discover and inject hooks
- [ ] 2.4 Add integration folder name as section header when injecting (e.g., `## linear: Before Proposal`)

## 3. Testing

- [ ] 3.1 Add unit tests for hook discovery across multiple integration folders
- [ ] 3.2 Add unit tests for filename parsing (valid/invalid patterns)
- [ ] 3.3 Add unit tests for custom phase names (e.g., `before-review.md`)
- [ ] 3.4 Add unit tests for hook concatenation ordering (alphabetical by folder)
- [ ] 3.5 Add integration test: hooks folder → generated template includes hook content

## 4. Documentation

- [ ] 4.1 Document hook folder structure and naming convention in AGENTS.md
- [ ] 4.2 Add example integration package structure
- [ ] 4.3 Document how to create and distribute integrations
