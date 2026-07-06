# Review Workspace Beta Compatibility Before Public Release

## Goal

Before workspaces become public/stable, decide what beta workspace
compatibility behavior is actually worth carrying forward.

This is intentionally late-stage work. Workspaces have not been publicly
released yet, so unpublished beta internals should not automatically become a
permanent compatibility contract.

## Background

The beta currently contains a few compatibility paths:

- Legacy split workspace state readers for `.openspec-workspace/workspace.yaml`
  and `.openspec-workspace/local.yaml`.
- Managed workspace registry fallback behavior.
- `codex` to `codex-cli` opener normalization.
- Generated `.gitignore` cleanup for old workspace `.code-workspace` ignore
  rules.
- Empty or deprecated helper shims that exist only because previous workspace
  slices exposed them internally.

Some of these may be useful for local beta testers. Others may be safer to
delete before public release.

## Scope

Review workspace compatibility only. Do not use this item to reopen unrelated
legacy migration systems such as old slash-command cleanup, telemetry config
migration, or deprecated `change`/`spec` command aliases.

## Decisions To Make

- Which workspace compatibility paths are part of the public contract?
- Which paths are beta-only migration helpers and can be removed after one
  release note or cleanup pass?
- Which paths are only test compatibility and can be deleted before release?
- Should beta workspace roots be migrated automatically, left readable, or
  intentionally unsupported?
- Should old generated `.gitignore` cleanup exist at all, given workspaces are
  managed local folders rather than repos?

## Implementation Notes

- Prefer deletion over preserving compatibility for unpublished intermediate
  beta states.
- If a compatibility path remains, document why it exists and what would allow
  it to be removed later.
- Keep user-owned files safe. Do not clean or rewrite ambiguous local files
  unless OpenSpec can prove it owns them.
- Update tests so they describe the chosen public contract rather than the
  accidental beta history.

## Done When

- Workspace compatibility code is inventoried and classified.
- Low-value beta-only shims are removed.
- Remaining compatibility behavior has focused tests and release-note language.
- Public docs and generated agent guidance do not mention unsupported beta
  internals.
