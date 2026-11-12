## 1. The `skills` package

- [x] 1.1 Add `skills` and check it bundles into the standalone binary and runs on Node 22.12
- [x] 1.2 `global-skills.ts`: write the skill text, install it, read what is installed, remove what the profile dropped
- [x] 1.3 Map OpenSpec tool ids to the package's agent ids

## 2. Init

- [x] 2.1 `--scope global|project`
- [x] 2.2 Pick the scope from the project, the saved answer, or the global install, and ask once at a terminal
- [x] 2.3 Set up a project that uses the global skills: `openspec/` only
- [x] 2.4 Move a project to the global skills, stopping on edited skills

## 3. Update

- [x] 3.1 Refresh the global skills on every `openspec update`, from any folder
- [x] 3.2 Show the refresh in `--dry-run`
- [x] 3.3 Point out a project that has both copies

## 4. Proof and docs

- [x] 4.1 Tests that run the real CLI in a throwaway home
- [x] 4.2 Project installs compared with 2.0, case by case
- [x] 4.3 Docs: setup, CLI reference, global config, supported tools
