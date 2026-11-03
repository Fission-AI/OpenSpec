## Why

Amp reads project skills from `.agents/skills/`, but OpenSpec does not list Amp in its tool picker or accept `amp` through `--tools`. Amp users can select the universal `.agents` target, but only if they already know how Amp discovers skills.

## What Changes

- Add Amp as a supported skills-only tool with `amp` as its tool id.
- Generate Amp's OpenSpec skills through the existing shared `.agents/skills/` pipeline.
- Detect Amp projects from `.amp/` and recognize Amp-owned OpenSpec skill trees during update.
- Document Amp's paths and invocation syntax in the docs-lab supported-tools reference.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define Amp's shared Agent Skills path and skills-only behavior.

## Impact

- `src/core/config.ts`: add the Amp tool metadata.
- `test/core/init.test.ts`, `test/core/update.test.ts`, and `test/core/available-tools.test.ts`: cover generation, refresh, and detection.
- `docs-lab/reference/supported-tools.md`: add Amp to the support matrix and shared-folder notes.

## Non-Goals

- Adding an Amp command adapter. Amp's supported project extension surface is Agent Skills.
- Adding a second Amp-specific skill generator or template set.
