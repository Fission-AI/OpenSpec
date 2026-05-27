# Add AGENTS.md Standard Support To Init/Update

## Summary
- Teach `pastelsdd init` to manage a root-level `AGENTS.md` file using the same marker system as `CLAUDE.md`.
- Allow `pastelsdd update` to refresh or scaffold that root `AGENTS.md` so AGENTS-compatible tools always receive current instructions.
- Keep the existing `pastelsdd/AGENTS.md` template as the canonical source while ensuring assistants that read `AGENTS.md` opt-in instructions get the latest guidance automatically.

## Motivation
The README now points teams to AGENTS.md-compatible assistants, but the CLI only manages `CLAUDE.md`. Projects must hand-roll a root `AGENTS.md` file to benefit from the standard, and updates will drift unless maintainers remember to copy content manually. Extending `init` and `update` closes that gap so Pastelsdd actually delivers on the promise of first-class AGENTS support.

## Proposal
1. Extend the `pastelsdd init` selection flow with an "AGENTS.md standard" option that creates or refreshes a root `AGENTS.md` file wrapped in Pastelsdd markers, mirroring the existing CLAUDE integration.
2. When generating the file, pull the managed content from the same template used in `pastelsdd/AGENTS.md`, ensuring both locations stay in sync.
3. Update `pastelsdd update` so it always refreshes the root `AGENTS.md` (creating it if missing) alongside `pastelsdd/AGENTS.md` and any other configured assistants.
4. Document the new behavior in CLI specs and verify marker handling (no duplicates, preserve user content outside the block) with tests for both commands.

## Out of Scope
- Adding additional AGENTS-specific prompts or workflows beyond the shared instructions block.
- Non-interactive flags or bulk configuration for multiple standards in one run.
- Broader restructuring of how templates are stored or loaded.

## Risks & Mitigations
- **Risk:** Accidentally overwriting user-edited content surrounding the managed block.
  - **Mitigation:** Reuse the existing marker-update helper shared with `CLAUDE.md`, and add tests that cover files containing custom text before and after the block.
- **Risk:** Divergence between `pastelsdd/AGENTS.md` and the root file.
  - **Mitigation:** Source the root file content from the canonical template rather than duplicating strings inline.
- **Risk:** Confusion about when the file is created.
  - **Mitigation:** Log creation vs update, and ensure help text references the AGENTS option during `init`.
