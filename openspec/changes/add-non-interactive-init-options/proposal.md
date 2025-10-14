## Why
The current `openspec init` command requires interactive prompts, preventing automation in CI/CD pipelines and scripted setups. Adding non-interactive options will enable programmatic initialization for automated workflows while maintaining the existing interactive experience as the default.

## What Changes
- Replace the multiple flag design with a single `--tools` option that accepts `all`, `none`, or a comma-separated list of tool IDs
- Update InitCommand to bypass interactive prompts when `--tools` is supplied and apply single-flag validation rules
- Document the non-interactive behavior via the CLI init spec delta (scenarios for `all`, `none`, list parsing, and invalid entries)
- Generate CLI help text dynamically from `AI_TOOLS` so supported tools stay in sync

## Impact
- Affected specs: `specs/cli-init/spec.md`
- Affected code: `src/cli/index.ts`, `src/core/init.ts`
