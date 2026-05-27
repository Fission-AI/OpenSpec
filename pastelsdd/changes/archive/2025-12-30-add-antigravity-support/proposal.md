## Why
Google is rolling out Antigravity, a Windsurf-derived IDE that discovers workflows from `.agent/workflows/*.md`. Today Pastelsdd can only scaffold slash commands for Windsurf directories, so Antigravity users cannot run the proposal/apply/archive flows from the IDE.

## What Changes
- Add Antigravity as a selectable native tool in `pastelsdd init` so it creates `.agent/workflows/pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md` with YAML frontmatter containing only a `description` field plus the standard Pastelsdd-managed body.
- Ensure `pastelsdd update` refreshes the body of any existing Antigravity workflows inside `.agent/workflows/` without creating missing files, mirroring the Windsurf behavior.
- Share e2e/template coverage confirming the generator writes the proper directory, filename casing, and frontmatter format so Antigravity picks up the workflows.

## Impact
- Affected specs: `specs/cli-init`, `specs/cli-update`
- Expected code: CLI init/update tool registries, slash-command templates, associated tests
