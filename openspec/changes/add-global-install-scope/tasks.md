## 1. Global Config Provenance and Validation

- [ ] 1.1 Consolidate the runtime `GlobalConfig`/`TelemetryConfig` types, `InstallScope`, Zod schema, known-key validation, and one canonical current-default object containing `installScope: global`
- [ ] 1.2 Implement one side-effect-free global-config document reader that returns missing/valid/invalid storage state, safely available raw data, the validated effective view, diagnostics, and install-scope value/source (`explicit`, `new-default`, `legacy-default`)
- [ ] 1.3 Initialize a command-scoped config session before telemetry `preAction` writes, keeping initial install-scope provenance stable across background patches while tracking the latest raw document and refreshing scope after explicit foreground scope mutations
- [ ] 1.4 Implement one validated patch protocol: seed missing files sparsely with `installScope: global` plus the requested patch, patch valid raw documents without materializing unrelated defaults, preserve unknown fields, reject writes over invalid documents, and reserve complete-default replacement for confirmed reset and initial editor creation
- [ ] 1.5 Route config set/unset/profile/preset, profile migration, init/update reads, telemetry gating, and telemetry state updates through the shared document protocol; retain telemetry domain helpers only as delegates and remove their duplicate config interface, parser, and whole-file writer
- [ ] 1.6 Move legacy telemetry import onto the shared patch protocol so missing current config writes only `installScope: global` plus migrated telemetry, valid legacy config preserves absent `installScope`, and invalid current config is never overwritten
- [ ] 1.7 Update config list/get/set/unset/profile/reset behavior to use raw-field presence for provenance, preserve telemetry written earlier in the invocation, emit repair guidance for rejected invalid-file mutations, and allow confirmed reset to recover with current defaults
- [ ] 1.8 Add focused global-config and telemetry tests for missing/legacy/explicit/schema-invalid/malformed/unreadable states, sparse first writes, side-effect-free reads, unknown-field preservation, background-then-foreground patches, rejected writes preserving original bytes, reset recovery, and both legacy telemetry migration branches
- [ ] 1.9 Add CLI integration tests proving telemetry-first creation leaves `profile`, `delivery`, and `workflows` absent, does not suppress the existing profile migration, reports `new-default` for the current invocation and `explicit` on the next invocation, and gives init/update the same command-scoped install-scope result

## 2. Tool Scope Metadata and Skill Resolution

- [ ] 2.1 Add per-surface `scopeSupport.skills` / `scopeSupport.commands` metadata; default existing `skillsDir` surfaces and registered adapters to global/project unless the complete matrix explicitly narrows them
- [ ] 2.2 Redefine `skillsDir` as the default relative skill container, `globalSkillsDir` as an optional differing global-container override rather than an implicit global-only marker, and `globalSkillsBase` as the exceptional home/user-config base selector with XDG and Windows `%APPDATA%` handling
- [ ] 2.3 Migrate MiniMax to `skillsDir: '.minimax'` with global-only skills support without changing its effective target
- [ ] 2.4 Declare Codex and `agents` skills support for global/project, and declare GitHub Copilot's global/project skills, global/project adapter commands, and `.copilot` global skill override
- [ ] 2.5 Encode and test the complete 37-tool matrix: MiniMax remains global-only skill-only, every other existing skill target supports global/project, all 28 registered adapters support global/project, tools without adapters keep their current command-surface capability, and Amazon Q/Continue/iFlow compatibility layouts remain unchanged
- [ ] 2.6 Implement a shared per-surface scope-decision resolver returning requested/effective scope, fallback state, and reason without constructing paths
- [ ] 2.7 Make the skill target resolver the sole producer of scoped skill roots and containment roots from project/home/platform/env context
- [ ] 2.8 Add canonical project/global containment validation, dangling/escaping symlink rejection, and allowed-root collision checks before mutation
- [ ] 2.9 Add scope-decision and skill-target tests for every matrix row, same/override containers, MiniMax global-only fallback, compatibility layouts without fallback, invalid targets, mixed surfaces, Windows paths, home inputs, and symlink escapes

## 3. Shared Skill Ownership and Filesystem Detection

- [ ] 3.1 Refactor shared-skill marker helpers to read/write an already resolved physical skills root instead of assuming `projectPath + skillsDir`
- [ ] 3.2 Reconcile Codex and `agents` writers by canonical resolved root, keeping independent ownership markers for project and global `.agents/skills`
- [ ] 3.3 Make available/configured tool detection enumerate exact managed skills and commands in every declared scope using the surface-specific target planners
- [ ] 3.4 Make version status and command-content freshness checks accept the effective install context
- [ ] 3.5 Extend profile/delivery drift detection to include requested/effective scope, exact managed artifacts at non-effective targets, and whether a run-only override requires those copies to be preserved
- [ ] 3.6 Update migration scanning and legacy Codex skill reconciliation to write/verify the effective scoped target before eligible legacy cleanup
- [ ] 3.7 Add tests for global-only configuration detection, duplicate project/global copies, independent shared markers, Codex/agents dual selection, divergent legacy copies, and idempotent repeated detection

## 4. Command Generation Install Context

- [ ] 4.1 Add the shared `InstallContext` contract and update `ToolCommandAdapter` with context-aware `getInstallRoot` and `getFilePath` methods returning concrete absolute paths
- [ ] 4.2 Update every registered adapter to be the sole producer of both project and global installation roots and file paths while preserving formatting and invocation names; use documented user-level overrides where listed and otherwise retain the adapter's current relative layout below the selected user root
- [ ] 4.3 Pass install context through `generateCommand`, `generateCommands`, invocation derivation, and generated skill/getting-started command reference transformation
- [ ] 4.4 Pass and reuse the same adapter-returned installation root/path pair through configured-command detection, freshness comparison, drift checks, reporting, and cleanup lookup without caller-side path reconstruction
- [ ] 4.5 Add adapter contract tests for absolute project/global roots and paths, platform-correct user bases, containment, invocation parity, and compatibility layouts without project fallback or unsupported/unresolved diagnostics
- [ ] 4.6 Add focused tests proving GitHub Copilot and every other registered adapter receive global context in global mode, while MiniMax and tools without adapters do not invent command files

## 5. Shared Scope Planning, Cleanup Authority, and Transition Safety

- [ ] 5.1 Build one planning pipeline that resolves profile workflows, delivery, and command-surface capability before classifying each surface as desired, cleanup-only, or preserved
- [ ] 5.2 Resolve effective scope only for desired surfaces, and build deterministic exact cleanup targets for cleanup-only surfaces without turning them into generation compatibility requirements
- [ ] 5.3 Model cleanup authority explicitly: persisted/default runs may plan cleanup of authorized non-effective scopes after confirmation, while run-only overrides preserve every other scope and limit cleanup-only work to the override's effective target
- [ ] 5.4 Validate all desired mutations and every authorized existing cleanup-only target in a complete preflight, then build a symmetric project/global transition preview with exact destination and cleanup paths before any write or removal begins
- [ ] 5.5 Build generation and cleanup plans from explicit workflow-to-skill names, `COMMAND_IDS`, and surface-specific target lookup without broad filename matching
- [ ] 5.6 Add a default-No interactive confirmation gate for cross-scope migration cleanup, reuse `--force` as non-interactive authorization, and fail non-interactive unconfirmed transitions before mutation
- [ ] 5.7 Preserve old targets after write/verification failure, retain new targets after cleanup failure, and return actionable path lists for both cases
- [ ] 5.8 Verify all desired new-target artifacts before confirmed non-effective-scope cleanup, and add unit tests for both transition directions, confirmation accept/decline, forced/non-interactive behavior, split scopes, all three surface classifications, override preservation, partial writes, cleanup failure, and repeat-run recovery

## 6. Init Scope Support

- [ ] 6.1 Add `openspec init --scope global|project`, Commander validation, help text, and shell completion metadata
- [ ] 6.2 Resolve the run-only option or source-aware persisted preference without mutating global config
- [ ] 6.3 Replace direct skill/command path construction in init with the shared scoped plan and validated targets
- [ ] 6.4 For runs without a scope override, preview and confirm cross-scope cleanup before writing scoped skills/commands and ownership markers in write-verify-clean order
- [ ] 6.5 Report transition direction, concrete destination/cleanup paths, shared-global warnings, per-surface fallback, split scopes, and other-scope copies preserved by a run-only override
- [ ] 6.6 Preserve GitHub Copilot cloud-agent opt-in behavior and tool setup notes independently from install scope
- [ ] 6.7 Add init tests for new/legacy/explicit defaults, both persisted transition directions, confirmation accept/decline, `--force` and non-interactive refusal, run-only overrides preserving other scopes, cleanup-only targets, global Codex/agents, MiniMax fallback, global Copilot prompt generation, compatibility adapters without fallback, mixed-tool preflight, symlink safety, and idempotency

## 7. Update Scope Support

- [ ] 7.1 Add `openspec update --scope global|project`, Commander validation, help text, and shell completion metadata
- [ ] 7.2 Forward the scope override through CLI self-upgrade reruns together with path and force options
- [ ] 7.3 Use scoped configured-tool detection, version status, profile/delivery drift, and non-effective-copy drift plus cleanup authority to decide whether update work is required
- [ ] 7.4 Replace direct update paths with the shared preflight, transition preview/confirmation, and per-surface generation/cleanup plan
- [ ] 7.5 Report transition direction, concrete destination/cleanup paths, shared-global warnings, per-surface fallback, split scopes, override-preserved other-scope paths, preserved old paths after failures, and cleanup leftovers
- [ ] 7.6 Keep allowlisted legacy global Codex prompt cleanup separate and replacement-gated, and never recreate a Codex command surface
- [ ] 7.7 Preserve global-only shared skills under existing delivery rules so one project does not remove artifacts shared by other projects
- [ ] 7.8 Add update tests for global-only configured tools, project/global duplicates, both persisted transition directions, confirmation accept/decline, `--force` and non-interactive refusal, override preservation, adapter-backed global commands, compatibility layouts without fallback, cleanup-only surfaces, commands-only installs, shared ownership, interrupted transitions, cleanup failures, self-upgrade forwarding, and repeat-run idempotency

## 8. Config UX

- [ ] 8.1 Add effective install scope and source to the `config profile` current-state header
- [ ] 8.2 Add a scope-only action and scope picker with current-value marking/preselection, old/new direction, and a pre-save warning about later durable cleanup while preserving existing delivery/workflow actions
- [ ] 8.3 Save install scope independently without mutating tool artifacts, preserve it in profile preset shortcuts, and retain no-op/apply-current-project behavior
- [ ] 8.4 Extend human-readable `config list` with scope source and keep JSON output machine-readable and consistent with other effective defaults
- [ ] 8.5 Verify direct `config get/set/unset installScope` and reset behavior, including old/new cleanup warnings without tool-artifact mutation, and keep the config command's existing config-store `--scope` semantics distinct
- [ ] 8.6 Add interactive and non-interactive config tests for explicit changes, legacy defaults, no-op selection, preset preservation, cleanup warnings, validation failures, and an accepted apply-now update reaching the durable-transition confirmation without a run-only override

## 9. Documentation and Release Note

- [ ] 9.1 Update `docs/supported-tools.md` with the same complete 37-tool project/global per-surface matrix from the design, including exact documented overrides, compatibility-preserved layouts, MiniMax global-only skill-only behavior, adapter-backed global commands, and Codex/agents shared ownership
- [ ] 9.2 Update `docs/cli.md` and command help examples for persisted scope, init/update overrides, cross-scope confirmation, and `--force` authorization
- [ ] 9.3 Update `docs/migration-guide.md` with legacy-default behavior, explicit opt-in, symmetric durable transitions, cleanup previews/confirmation, run-only override preservation, duplicate cleanup guidance, and global shared-state implications
- [ ] 9.4 Clarify that `$CODEX_HOME/prompts` is legacy cleanup only and that install scope never restores Codex custom prompts
- [ ] 9.5 Add a Changesets entry describing optional global installation and the new-user/legacy-user default distinction

## 10. Verification

- [ ] 10.1 Run targeted config, telemetry, resolver, adapter, detection, drift, init, update, migration, and CLI end-to-end tests
- [ ] 10.2 Run `openspec validate add-global-install-scope --strict` and resolve all delta fidelity or scenario errors
- [ ] 10.3 Run `pnpm lint`, `pnpm build`, and the full `pnpm test` suite
- [ ] 10.4 Verify Windows CI covers home resolution, path overrides, separators, case behavior, containment, and project/global scope transitions
- [ ] 10.5 Manually smoke-test a new config defaulting global, a legacy config remaining project, both persisted migration directions with accept/decline/`--force` and non-interactive refusal, and both init/update run-only overrides preserving other scopes in isolated HOME/XDG/CODEX_HOME directories
- [ ] 10.6 Manually smoke-test global Codex/agents ownership, MiniMax global-only fallback, GitHub Copilot global prompt generation, one same-layout compatibility adapter, one differing-layout adapter, deterministic cleanup-only behavior, and cleanup recovery after an injected failure
