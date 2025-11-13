## Why
The Cline implementation was architecturally incorrect. According to Cline's official documentation, Cline uses workflows for on-demand automation and rules for behavioral guidelines. The OpenSpec slash commands are procedural workflows (scaffold → implement → archive), not behavioral rules, so they should be placed in `.clinerules/workflows/` instead of `.clinerules/`.

## What Changes
- Update ClineSlashCommandConfigurator to use `.clinerules/workflows/` paths instead of `.clinerules/` paths
- Update all tests to expect the correct workflow file locations
- Update README.md documentation to reflect workflows instead of rules
- **BREAKING**: Existing Cline users will need to re-run `openspec init` to get the corrected workflow files

## Impact
- Affected specs: cli-init (corrected Cline workflow paths)
- Affected code: `src/core/configurators/slash/cline.ts`, test files, README.md
- Modified files: `.clinerules/workflows/openspec-*.md` (moved from `.clinerules/openspec-*.md`)
