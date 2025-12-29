## Why
Amp is a popular AI coding agent from Sourcegraph that uses Skills (`.agents/skills/`) to extend its capabilities. Today OpenSpec can scaffold slash commands for many IDEs but not Amp, so Amp users cannot run the proposal/apply/archive flows from their workflow.

## What Changes
- Add Amp as a selectable native tool in `openspec init` so it creates `.agents/skills/openspec-proposal/SKILL.md`, `.agents/skills/openspec-apply/SKILL.md`, and `.agents/skills/openspec-archive/SKILL.md` with YAML frontmatter containing `name` and `description` fields plus the standard OpenSpec-managed body.
- Ensure `openspec update` refreshes the body of any existing Amp skills inside `.agents/skills/` without creating missing files, mirroring the behavior of other tools.
- Share e2e/template coverage confirming the generator writes the proper directory, filename casing, and frontmatter format so Amp picks up the skills.

## Impact
- Affected specs: `specs/cli-init`, `specs/cli-update`
- Expected code: CLI init/update tool registries, slash-command configurator, associated tests
