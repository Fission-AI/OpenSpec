# Allow Additional AI Tool Initialization After Setup

## Summary
- Let `pastelsdd init` configure new AI coding tools for projects that already contain an Pastelsdd structure.
- Keep the initialization flow safe by skipping structure creation and only generating files for tools the user explicitly selects.
- Provide clear feedback so users know which tool files were added versus already present.

## Motivation
Today `pastelsdd init` exits with an error once an `pastelsdd/` directory exists. That protects the directory layout, but it blocks
teams that start with one assistant (for example, Claude Code) and later want to add another such as Cursor. They have to create
those files by hand or rerun `init` in a clean clone, which undermines the "easy onboarding" promise. Letting the command extend
an existing installation keeps the workflow consistent and avoids manual file management.

## Proposal
1. Detect an existing Pastelsdd structure at the start of `pastelsdd init` and branch into an "extend" mode instead of exiting.
   - Announce that the base structure already exists and that the command will only manage AI tool configuration files.
   - Keep the existing guard for directories or files we must not overwrite.
2. Present the usual AI tool selection prompt even in extend mode, showing which tools are already configured.
   - Skip disabled options that remain "coming soon".
   - Mark already configured tools as such so users know whether selecting them will refresh or add files.
3. When the user selects additional tools, generate the same initialization files that a fresh run would create (e.g., Cursor
   workspace files) while leaving untouched tools intact apart from marker-managed sections.
   - Do nothing when the user selects no new tools and keep the previous error messaging to avoid silently succeeding.
4. Summarize the outcome (created, refreshed, skipped) before exiting with code 0 when work was performed.
   - Include friendly guidance that future updates to shared content still come from `pastelsdd update`.

## Out of Scope
- Changing how `pastelsdd update` discovers or updates AI tool files.
- Supporting brand-new AI tools beyond those already wired into the CLI.
- Adding non-interactive flags for selecting multiple tools in one run (follow-up if needed).

## Risks & Mitigations
- **User confusion about extend mode** → Explicitly log what will happen before prompting and summarise results afterward.
- **Accidental overwrites** → Continue using marker-based updates and skip files unless the user chooses that tool.
- **Inconsistent state if init fails mid-run** → Reuse existing rollback/transaction logic so partial writes clean up.
