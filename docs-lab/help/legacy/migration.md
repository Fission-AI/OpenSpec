# Migrating from the legacy workflow

> Moving from the legacy `/openspec:*` commands to OPSX.

<!-- WIP, on the todo list: this page is not written yet and is held back from the
site (its section is commented out in website/docs.sync.config.mjs, 2026-08-21). The
file stays so the structure and inbound links survive; re-list it in the sync config
once the prose lands. -->

<!-- Skeleton: headings only. -->

## What changed and why

## Command mapping

## Migrating a project

### Back up custom content before cleanup

Files listed under **Files to remove** are deleted entirely. Back up any custom content before accepting cleanup.

- **`openspec/AGENTS.md`**: detected by existence alone; cleanup does not inspect its contents.
- **Root-level `AGENTS.md`, `CLAUDE.md`, and other config files**: cleanup removes OpenSpec marker blocks and preserves content outside those blocks.
- **Legacy command directories**: cleanup preserves files it does not recognize as generated commands.

## Behavior differences
