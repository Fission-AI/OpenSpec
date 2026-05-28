# Context Store First-Run And Cleanup UX Tasks

- [x] Decide exact no-argument `context-store setup` behavior for TTY,
      non-TTY, and `--json` invocations.
- [x] Design the interactive setup prompts for store id, target path, and Git
      initialization.
- [x] Define target-path safety behavior for managed defaults, explicit paths,
      paths inside existing Git repos, and non-empty directories.
- [x] Implement the interactive setup flow without changing deterministic
      non-interactive behavior.
- [x] Decide whether the cleanup surface is `unregister`, `remove`, or both.
- [x] Define cleanup semantics for "forget local registration" versus "delete
      local files too".
- [x] Implement local registry cleanup with explicit confirmation before file
      deletion.
- [x] Add human output that stays small and JSON output that reports exact setup
      and cleanup state without `next_commands`.
- [x] Keep Git initialization scoped to local `git init` with no auto-staging,
      committing, pushing, remote creation, or team policy.
- [x] Add focused tests for setup prompts, non-interactive failures, path
      safety, registry cleanup, and JSON output.
- [x] Update beta docs and agent playbook references for first-run setup and
      cleanup.
