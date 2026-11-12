## 1. Home layout

- [x] 1.1 Table of each tool's home skills folder from the skills CLI 1.8.1, with env overrides; pinned by a test
- [x] 1.2 The 2.0 installer takes a layout (shared folder, link folder per tool, root that bounds every write); the project layout is byte-for-byte unchanged

## 2. `--global`

- [x] 2.1 `openspec init --global [--tools]`: global profile's workflows into `~/.agents/skills/`, links per D2, refuse tools with no home folder
- [x] 2.2 `openspec update --global [--dry-run]`: refresh the tools listed in `~/.agents/skills/.openspec-target`
- [x] 2.3 Neither touches the current folder, project or not

## 3. Switching a project

- [x] 3.1 `skills: global | project` in `openspec/config.yaml`
- [x] 3.2 Interactive `update` asks once when a global install covers the project's tools; yes removes unedited project skills and links and saves `global`, no saves `project`
- [x] 3.3 Non-interactive note and `--use-global-skills`; dry run lists what would go
- [x] 3.4 With `skills: global`, `init` and `update` write no project skills and name `openspec init --global` when it's missing

## 4. Proof and docs

- [ ] 4.1 Tests: every 2.0 project command unchanged without `--global`; global install, refresh, edited and `npx skills` copies kept, linked home folders refused, switch and decline
- [x] 4.2 Real `npx skills` side by side: no path collision, nothing of theirs removed
- [x] 4.3 Upgrade matrix and release upgrades still pass
- [x] 4.4 docs-lab: setup, supported tools, CLI reference, project config; changeset (minor)
