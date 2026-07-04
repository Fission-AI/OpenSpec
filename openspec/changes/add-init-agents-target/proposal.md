## Why

OpenSpec already hints at a vendor-neutral `agents` target, but `openspec init` does not let users choose it. Users who want shared AGENTS-compatible skills currently have to patch OpenSpec or hand-copy skills.

## What Changes

- Make `agents` a first-class `openspec init` target.
- Install skills to `.agents/skills/openspec-*/SKILL.md`.
- Keep this PR scoped to init/update/detection/docs for the shared target only.
- Do not migrate `.pi` or `.codex` content in this change.

## Non-Goals

- No `.pi` -> `.agents` migration logic.
- No `.codex` -> `.agents` migration logic.
- No new command adapter for `agents`.
