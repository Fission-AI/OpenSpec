# Context Store First-Run And Cleanup UX Evidence

## Manual Beta Source Notes

The manual beta pass found:

- no-argument `openspec context-store setup` feels like it should start an
  interactive setup;
- accidental setup previously created a store under the current repo before the
  managed default was corrected;
- cleanup had no CLI path and required deleting files plus editing the registry
  manually;
- Git initialization left shared files untracked without telling the user or
  agent what to do next.

## Initial Recommendation

Keep context-store first-run UX small and local:

- prompt only for local setup choices;
- never push, pull, commit, create remotes, or delete files implicitly;
- keep JSON output explicit enough for agents to continue safely;
- leave team sync policy to the later shared-coordination hardening work.

## Implementation Result

- `openspec context-store setup` now runs a guided setup in interactive
  terminals when no id is provided.
- Non-interactive and `--json` setup require explicit inputs and fail with a
  structured setup-id diagnostic when the id is missing.
- Explicit setup paths inside another Git repository are blocked
  non-interactively and require explicit confirmation interactively.
- `context-store unregister <id>` removes only the local registry entry.
- `context-store remove <id>` removes the local registry entry and deletes the
  local folder only after confirmation or `--yes`; it refuses to delete folders
  without matching context-store metadata.
- Human success output is intentionally compact; JSON output carries exact
  registry, file, and Git state without `next_commands`.

Verification:

- `pnpm build`
- `pnpm lint`
- `pnpm vitest run test/commands/context-store.test.ts test/core/context-store/registry.test.ts`
- `pnpm test`
