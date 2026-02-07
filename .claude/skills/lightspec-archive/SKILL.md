---
name: lightspec-archive
description: Archive a completed change and update main specs
disable-model-invocation: true
---

Archive a completed change, merging delta specs into main specifications.

## Usage

Use this skill when:
- A change is fully implemented
- All tasks are complete
- Tests pass
- Ready to integrate changes into main specs

## What This Does

1. Validates the change (unless --no-validate)
2. Merges delta specs from the change into main specs
3. Moves the change to the archive
4. Updates spec versions

## Implementation

Use the CLI command:
```bash
lightspec archive [change-name] [options]
```

### Options

- `-y, --yes`: Skip confirmation prompts
- `--skip-specs`: Skip spec update (for infrastructure/tooling/doc-only changes)
- `--no-validate`: Skip validation (not recommended, requires confirmation)

### Example

```bash
# Archive with prompts
lightspec archive add-user-authentication

# Archive without confirmation
lightspec archive add-user-authentication -y

# Archive infrastructure change (no spec updates)
lightspec archive upgrade-dependencies --skip-specs -y
```

## Before Archiving

Ensure:
1. All code changes are committed
2. Tests pass
3. Artifacts are complete (check with `lightspec status`)
4. Delta specs are properly written

## After Archiving

The change will be moved to `lightspec/changes/archive/` and main specs will be updated with the changes.
