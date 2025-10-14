## 1. Factory tool registration
- [x] 1.1 Add Factory/Droid metadata to the native tool registry used by init/update (ID, display name, command paths, availability flags).
- [x] 1.2 Surface Factory in interactive prompts and non-interactive `--tools` parsing alongside existing slash-command integrations.

## 2. Slash command templates
- [x] 2.1 Create shared templates for Factory's `openspec-proposal`, `openspec-apply`, and `openspec-archive` custom commands following Factory's CLI format.
- [x] 2.2 Wire the templates into init/update so generation happens on create and refresh respects OpenSpec markers.

## 3. Verification
- [x] 3.1 Update or add automated coverage that ensures Factory command files are scaffolded and refreshed correctly.
- [x] 3.2 Document the new option in any user-facing copy (help text, README snippets) if required by spec.
