# Add .gitkeep Files to Empty Folders

## Why

Git does not track empty directories. When `openspec init` creates the directory structure with empty `specs/`, `changes/`, and `changes/archive/` folders, these directories disappear after a commit if no files exist in them.

This causes workflow issues:
- After cloning a fresh repository, running `openspec list` fails because the expected directories don't exist
- New team members encounter errors when trying to use OpenSpec commands
- Users must manually recreate directories or remember to add placeholder files

## What Changes

Modify the `openspec init` command to create `.gitkeep` files in the three empty directories that need to persist in Git:
- `openspec/specs/`
- `openspec/changes/`
- `openspec/changes/archive/`

The `.gitkeep` file is a widely-used convention to force Git to track empty directories. It's an empty file (or a file with a simple comment) that ensures the directory structure is preserved across clones.

## Impact

**Users Affected**: All users who run `openspec init`

**Breaking Changes**: None

**Migration Required**: No - existing projects work as-is, but will benefit from running `openspec init` again in extend mode to add .gitkeep files

**Dependencies**: None

**Timeline**: Quick fix - can be completed in one implementation session
