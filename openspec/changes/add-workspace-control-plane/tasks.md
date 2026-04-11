## 1. Workspace Command Surface

- [ ] 1.1 Add `src/commands/workspace.ts` with `init`, `sync`, and `doctor` subcommands
- [ ] 1.2 Register the workspace command group in `src/cli/index.ts`
- [ ] 1.3 Add CLI help text and examples for workspace commands

## 2. Workspace Manifest

- [ ] 2.1 Define manifest types and validation for `openspec-workspace.yaml`
- [ ] 2.2 Implement manifest read/write helpers with cross-platform relative path handling
- [ ] 2.3 Add validation for duplicate repo names, duplicate paths, and invalid control-plane paths
- [ ] 2.4 Add tests for manifest parsing and validation

## 3. Discovery and Scaffolding

- [ ] 3.1 Implement sibling repo discovery for immediate child directories
- [ ] 3.2 Detect candidate instruction files such as `AGENTS.md`
- [ ] 3.3 Implement reviewed selection flow before persisting discovered repos
- [ ] 3.4 Scaffold control-plane repo boilerplate when missing
- [ ] 3.5 Add tests for discovery confidence and path normalization

## 4. Router Generation

- [ ] 4.1 Implement manifest-driven `.agents.md` generation at workspace root
- [ ] 4.2 Ensure generation never overwrites repo-local instruction files
- [ ] 4.3 Add drift detection for generated router files
- [ ] 4.4 Add tests for router rendering and sync behavior

## 5. Diagnostics and Docs

- [ ] 5.1 Implement `openspec workspace doctor` validation and warnings
- [ ] 5.2 Document the control-plane workspace pattern in CLI/docs
- [ ] 5.3 Clarify ownership boundaries between generated router files and user-authored local instructions
- [ ] 5.4 Add end-to-end tests for init → sync → doctor on a sample sibling-repo workspace
