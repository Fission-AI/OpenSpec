## 1. CLI Option Registration
- [x] 1.1 Replace the multiple flag design with a single `--tools <value>` option supporting `all|none|a,b,c` and keep strict argument validation.
- [x] 1.2 Populate the `--tools` help text dynamically from the `AI_TOOLS` registry.

## 2. InitCommand Modifications
- [x] 2.1 Accept the single tools option in the InitCommand constructor and plumb it through existing flows.
- [x] 2.2 Update tool selection logic to shortcut prompts for `all`, `none`, and explicit lists.
- [x] 2.3 Fail fast with exit code 1 and a helpful message when the parsed list contains unsupported tool IDs.

## 3. Specification Updates
- [x] 3.1 Capture the non-interactive scenarios (`all`, `none`, list, invalid) in the change delta without modifying `specs/cli-init/spec.md` directly.
- [x] 3.2 Document that CLI help reflects the available tool IDs managed by `AI_TOOLS`.

## 4. Testing
- [x] 4.1 Add unit coverage for parsing `--tools` values, including invalid entries.
- [x] 4.2 Add integration coverage ensuring non-interactive runs generate the expected files and exit codes.
- [x] 4.3 Verify the interactive flow remains unchanged when `--tools` is omitted.
