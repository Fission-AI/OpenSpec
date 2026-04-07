## Why

The README and the `enpalspec init` startup screen were inherited from the upstream OpenSpec fork but this repository is the enpalspec fork with its own binary, skills, and workflow. Both still reference `opsx:*` commands, `OpenSpec` branding, and upstream links where enpalspec-specific content should be used, which is confusing for users of this fork.

## What Changes

- Replace all `/opsx:propose`, `/opsx:apply`, `/opsx:archive` command references with `/enpalspec:propose`, `/enpalspec:apply`, `/enpalspec:archive`
- Update the "See it in action" example to use `enpalspec:*` skill commands
- Update the Quick Start section to reference the enpalspec default workflow
- Update the tip callout to reference the enpalspec workflow instead of opsx
- Add a shoutout to OpenSpec as the upstream base project in the README
- Update `src/ui/welcome-screen.ts`: fix "Welcome to OpenSpec" title and `/opsx:*` command references to use `enpalspec:*`
- Update `src/core/init.ts`: fix "OpenSpec Setup Complete", "OpenSpec configured:" labels and the upstream GitHub links to reflect enpalspec

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- No spec-level requirement changes — this is purely a documentation/text update -->

## Impact

- `README.md`
- `src/ui/welcome-screen.ts`
- `src/core/init.ts`
