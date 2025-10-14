## 1. Templates
- [x] 1.1 Add a shared stub template that renders the root agent instructions hand-off message.
- [x] 1.2 Ensure the stub covers both `AGENTS.md` and `CLAUDE.md` variants.

## 2. Init Flow
- [x] 2.1 Update `createInitArtifacts` to write the stub to the project root instead of the full instructions.
- [x] 2.2 Preserve the managed block markers so future updates can overwrite the stub safely.

## 3. Update Flow
- [x] 3.1 Make the update command refresh the root stub rather than the full instructions.
- [x] 3.2 Confirm the update log output still reflects the files that changed.

## 4. Tests & Docs
- [x] 4.1 Adjust CLI/init tests to match the new root content.
- [x] 4.2 Document the stub message in `openspec/specs/cli-init` and `openspec/specs/cli-update` (and any relevant README snippets).
