## Why
Add support for Cline (VS Code extension) in OpenSpec to enable developers to use Cline's AI-powered coding capabilities for spec-driven development workflows.

## What Changes
- Add Cline slash command configurator for proposal, apply, and archive operations
- Add Cline root CLINE.md configurator for project-level instructions
- Add Cline template exports
- Update tool and slash command registries to include Cline
- Add comprehensive test coverage
- **BREAKING**: None - this is additive functionality

## Impact
- Affected specs: cli-init (new tool option)
- Affected code: src/core/configurators/slash/cline.ts, src/core/configurators/cline.ts, registry files
- New files: .clinerules/openspec-*.md, CLINE.md
