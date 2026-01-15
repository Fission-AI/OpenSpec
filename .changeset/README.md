# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).

## Quick Start

```bash
pnpm changeset
```

Follow the prompts to select version bump type and describe your changes.

## Workflow

1. **Add a changeset** — Run `pnpm changeset` locally before or after your PR
2. **Version PR** — CI opens/updates a "Version Packages" PR when changesets merge to main
3. **Release** — Merging the Version PR triggers npm publish and GitHub Release

> **Note:** Contributors only need to run `pnpm changeset`. Versioning (`changeset version`) and publishing happen automatically in CI.

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
| `patch` | Bug fixes, small improvements | Fixed crash when config missing |
| `minor` | New features, non-breaking additions | Added `--verbose` flag |
| `major` | Breaking changes, removed features | Renamed `init` to `setup` |

## When to Create a Changeset

**Create one for:**
- New features or commands
- Bug fixes that affect users
- Breaking changes or deprecations
- Performance improvements users would notice

**Skip for:**
- Documentation-only changes
- Test additions/fixes
- Internal refactoring with no user impact
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
