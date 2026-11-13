## 1. The `skills` package

- [x] 1.1 Add `skills` and check it bundles into the standalone binary and runs on Node 22.12
- [x] 1.2 `global-skills.ts`: install the published skills, read what is installed, remove what the profile dropped
- [x] 1.4 Clone the repository at the CLI's version, with a plain error when git is missing and a fallback when the tag isn't published
- [x] 1.5 One skill text for every workflow profile, and published skills that match it
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
- [x] 3.4 Note each project init and update run in, and name the ones that still have their own skills

## 3b. Project installs

- [x] 3b.1 Install a project's `.agents/skills` through the `skills` package, recorded in `skills-lock.json`
- [x] 3b.2 Write the skills from the CLI when they can't be fetched, so a project install never needs git
- [x] 3b.3 Decide "up to date" from the installed text, which carries no version line
- [x] 3b.4 Keep the lock file right when skills are removed, and delete it when it records none

## 4. Proof and docs

- [x] 4.1 Tests that run the real CLI in a throwaway home
- [x] 4.2 Project installs compared with 2.0, case by case
- [x] 4.3 Docs: setup, CLI reference, global config, supported tools
