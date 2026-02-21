## Why

OpenSpec currently assumes command delivery maps directly to command adapters. That assumption does not hold for all tools.

Trae is a concrete example: it invokes OpenSpec workflows via skill entries (for example `/openspec-new-change`) rather than adapter-generated command files. In this model, skills are the command surface.

Today, this creates a behavior gap:

- `delivery=commands` can remove skills
- tools without adapters skip command generation
- result: selected tools like Trae can end up with no invocable workflow artifacts

This is more than a prompt UX issue because non-interactive and CI flows bypass interactive guidance. We need a capability-aware model in core generation logic.

## What Changes

### 1. Add explicit command-surface capability metadata

Add an optional field in tool metadata to describe how a tool exposes commands:

- `adapter`: command files are generated through a command adapter
- `skills-invocable`: skills are directly invocable as commands
- `none`: no OpenSpec command surface

Field should be optional. Default behavior is inferred from adapter registry presence: tools with a registered adapter resolve to `adapter`; tools with no adapter registration and no explicit annotation resolve to `none`.
Capability values use kebab-case string tokens for consistency with serialized metadata conventions.

Initial explicit override:

- Trae -> `skills-invocable`

### 2. Make delivery behavior capability-aware

Update `init` and `update` to compute effective artifact actions per tool from:

- global delivery (`both | skills | commands`)
- tool command surface capability

Behavior matrix:

- `both`:
  - generate skills for all tools with `skillsDir` (including `skills-invocable`)
  - generate command files only for `adapter` tools
  - `none`: no artifact action; MAY emit compatibility warning
- `skills`:
  - generate skills for all tools with `skillsDir` (including `skills-invocable`)
  - remove adapter-generated command files
  - `none`: no artifact action; MAY emit compatibility warning
- `commands`:
  - `adapter`: generate commands, remove skills
  - `skills-invocable`: generate (or keep if up-to-date) skills as command surface; do not remove them
  - `none`: fail fast with clear error

### 3. Add preflight validation and clearer output

Before writing/removing artifacts, validate selected/configured tools against delivery mode:

- interactive flow: show clear compatibility note before confirmation
- non-interactive flow: fail with deterministic error listing incompatible tools and supported alternatives

Update summaries to show effective delivery outcomes per tool (for example, when commands mode still installs skills for skills-invocable tools).

### 4. Update docs and tests

- document capability model and Trae behavior under delivery modes
- ensure CLI docs and supported-tools docs reflect effective behavior
- add test coverage for:
  - `init --tools trae` with `delivery=commands`
  - `update` with Trae configured under `delivery=commands`
  - mixed selections (`claude + trae`) across all delivery modes
  - explicit error path for tools with no command surface under `delivery=commands`

### 5. Coordinate with install-scope behavior

When combined with `add-global-install-scope`, init/update planning must compose:

- install scope (`global | project`)
- delivery mode (`both | skills | commands`)
- command surface capability (`adapter | skills-invocable | none`)

Implementation tests should cover mixed-tool matrices to ensure deterministic behavior when both changes are active.

## Capabilities

### New Capabilities

- `tool-command-surface`: Capability model that classifies tools as `adapter`, `skills-invocable`, or `none` to drive delivery behavior

### Modified Capabilities

- `cli-init`: Delivery handling becomes tool-capability-aware with preflight compatibility validation
- `cli-update`: Delivery sync becomes tool-capability-aware with consistent compatibility validation and messaging
- `supported-tools-docs`: Documents command-surface semantics for non-adapter tools

## Impact

- `src/core/config.ts` - add optional command-surface metadata and Trae override
- `src/core/command-generation/registry.ts` (or shared helper) - capability inference from adapter presence
- `src/core/init.ts` - capability-aware generation/removal planning + compatibility validation + summary messaging
- `src/core/update.ts` - capability-aware sync/removal planning + compatibility validation + summary messaging
- `src/core/shared/tool-detection.ts` - include capability-aware detection so `skills-invocable` tools remain detectable under `delivery=commands`, and `none` tools are excluded from command-surface artifact detection
- `docs/supported-tools.md` and `docs/cli.md` - document delivery behavior and compatibility notes
- `test/core/init.test.ts` and `test/core/update.test.ts` - add coverage for skills-invocable behavior and mixed-tool delivery scenarios

## Sequencing Notes

- This change is intended to stack safely with `simplify-skill-installation` by introducing additive, capability-specific requirements for init/update.
- If `simplify-skill-installation` merges first, this change should be rebased and keep the capability-aware rule as the source of truth for `delivery=commands` behavior on `skills-invocable` tools.
- If this change merges first, the `simplify-skill-installation` branch should be rebased to avoid re-introducing a global "commands-only means no skills for all tools" assumption.
- If `add-global-install-scope` merges first, this change should be rebased to compose capability-aware behavior on top of scope-resolved path decisions from that change.
- If this change merges first, `add-global-install-scope` should be rebased to preserve Section 5 composition rules (`install scope` + `delivery mode` + `command surface capability`) without overriding capability-aware command-surface outcomes.
