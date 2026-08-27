# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

## Quick Start

```bash
pnpm changeset
```

Follow the prompts to select version bump type and describe your changes.

## Workflow

1. **Choose the release path**: Maintainers decide whether a PR follows the normal release cadence or gets dedicated release tracking.
2. **Add dedicated release tracking**: When a maintainer asks for a changeset, run `pnpm changeset` locally before or after your PR.
3. **Version PR**: CI opens/updates a "Version Packages" PR when changesets merge to main.
4. **Release**: Merging the Version PR triggers npm publish and GitHub Release.

> **Note:** The default path is the normal release cadence. Add a changeset when a maintainer or release owner wants dedicated release notes and version tracking for the PR. Versioning (`changeset version`) and publishing happen automatically in CI.

## Template

Use this structure for your changeset content:

```markdown
---
"@fission-ai/openspec": patch
---

### New Features

- **Feature name** — What users can now do

### Bug Fixes

- Fixed issue where X happened when Y

### Breaking Changes

- `oldMethod()` has been removed, use `newMethod()` instead

### Deprecations

- `legacyOption` is deprecated and will be removed in v2.0

### Other

- Internal refactoring of X for better performance
```

Include only the sections relevant to your change.

## Version Bump Guide

| Type | When to use | Example |
|------|-------------|---------|
| `patch` | Release-tracked bug fixes, small improvements | Fixed crash when config missing |
| `minor` | New features, non-breaking additions | Added `--verbose` flag |
| `major` | Breaking changes, removed features | Renamed `init` to `setup` |

## When to Create a Changeset

**Use dedicated release tracking for:**
- New features or commands selected for release
- Notable bug fixes or hotfixes requested by a maintainer/release owner
- Breaking changes or deprecations
- Performance improvements users would notice and that are planned for release

**Use the normal release cadence for:**
- Routine bug fixes that fit the normal release cadence
- Documentation-only changes
- Test additions/fixes
- Internal refactoring that preserves user behavior
- CI/tooling changes

## Writing Good Descriptions

**Do:** Write for users, not developers
```markdown
- **Shell completions** — Tab completion now available for Bash, Fish, and PowerShell
```

**Don't:** Write implementation details
```markdown
- Added ShellCompletionGenerator class with Bash/Fish/PowerShell subclasses
```

**Do:** Explain the impact
```markdown
- Fixed config loading to respect `XDG_CONFIG_HOME` on Linux
```

**Don't:** Just reference the fix
```markdown
- Fixed #123
```
