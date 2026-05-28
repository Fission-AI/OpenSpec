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
