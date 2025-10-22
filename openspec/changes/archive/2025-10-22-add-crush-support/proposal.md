## Why
Add support for Crush AI assistant in OpenSpec to enable developers to use Crush's enhanced capabilities for spec-driven development workflows.

## What Changes
- Add Crush slash command configurator for proposal, apply, and archive operations
- Add Crush-specific AGENTS.md configuration template 
- Update tool registry to include Crush configurator
- **BREAKING**: None - this is additive functionality

## Impact
- Affected specs: cli-init (new tool option)
- Affected code: src/core/configurators/slash/crush.ts, registry.ts
- New files: .crush/commands/openspec/ (proposal.md, apply.md, archive.md)