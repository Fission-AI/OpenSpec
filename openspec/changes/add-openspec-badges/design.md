## Context

The OpenSpec README currently displays standard project badges (CI status, npm version, license, Discord) in a centered paragraph block. We want to add OpenSpec-specific metric badges using the weAretechnative/openspec-badge-action GitHub Action.

The action generates SVG badges and publishes them to the gh-pages branch. Badges are then referenced via raw.githubusercontent.com URLs.

## Goals / Non-Goals

**Goals:**
- Add three OpenSpec metric badges to README: number_of_specs, number_of_open_changes, number_of_open_tasks
- Configure GitHub Action workflow to generate badges on push to main
- Use classic style with labels enabled for visual consistency

**Non-Goals:**
- Modifying existing badge styling or arrangement
- Adding all available badge types (number_of_requirements, tasks_status)
- Custom badge colors or branding

## Decisions

### 1. Badge Selection

**Decision:** Use `number_of_specs`, `open_changes` (for open changes), and `tasks_status` (shows open tasks ratio)

**Rationale:** These three metrics provide meaningful insight into project health:
- `number_of_specs` - shows specification coverage
- `open_changes` - shows active development work
- `tasks_status` - shows completion progress (displays as X/Y format)

**Alternative considered:** Include `number_of_requirements` - decided against to keep the badge row concise.

### 2. Badge Placement

**Decision:** Add a new `<p align="center">` block after the existing badges section (line 15), creating a distinct row for OpenSpec-specific badges.

**Rationale:** Keeps OpenSpec metrics visually grouped and separate from standard project badges (CI, npm, license, Discord).

**Alternative considered:** Inline with existing badges - would make the line too long and mix different badge categories.

### 3. Workflow Trigger

**Decision:** Trigger badge generation on push to main branch only.

**Rationale:** Badges should reflect the current state of the main branch. Running on PRs would be wasteful since those badges wouldn't be used.

### 4. Badge Style

**Decision:** Use `classic` style with `show_label: true`

**Rationale:** Classic style provides gradient appearance matching the shield.io badges used elsewhere. Labels provide context for what each metric represents.

## Risks / Trade-offs

**[gh-pages branch required]** → The action publishes to gh-pages branch. If the branch doesn't exist, the action will create it. This is expected behavior.

**[Badge URLs depend on repository path]** → Badge image URLs are hardcoded to the repository path. If the repo is forked, badge URLs would point to the original repo. → This is acceptable for the main repository; forks can update URLs if needed.

**[Action permissions]** → Workflow requires `contents: write` permission. → Standard for actions that commit to branches.
