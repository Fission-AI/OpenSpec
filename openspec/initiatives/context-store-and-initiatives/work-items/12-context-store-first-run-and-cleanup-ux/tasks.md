# Context Store First-Run And Cleanup UX Tasks

- [ ] Decide exact no-argument `context-store setup` behavior for TTY,
      non-TTY, and `--json` invocations.
- [ ] Design the interactive setup prompts for store id, target path, and Git
      initialization.
- [ ] Define target-path safety behavior for managed defaults, explicit paths,
      paths inside existing Git repos, and non-empty directories.
- [ ] Implement the interactive setup flow without changing deterministic
      non-interactive behavior.
- [ ] Decide whether the cleanup surface is `unregister`, `remove`, or both.
- [ ] Define cleanup semantics for "forget local registration" versus "delete
      local files too".
- [ ] Implement local registry cleanup with explicit confirmation before file
      deletion.
- [ ] Add human and JSON output that reports store root, metadata path, registry
      state, created files, and next commands.
- [ ] Add setup guidance for initialized Git stores that explains uncommitted
      shared files without auto-staging, committing, pushing, or creating a
      remote.
- [ ] Add focused tests for setup prompts, non-interactive failures, path
      safety, registry cleanup, and JSON output.
- [ ] Update beta docs and agent playbook references for first-run setup and
      cleanup.
