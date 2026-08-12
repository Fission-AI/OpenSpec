## Context

OpenSpec currently models skill locations with two mutually exclusive fields: most tools use project-relative `skillsDir`, while MiniMax uses global-only `globalSkillsDir`. Command adapters return project-relative paths; Codex no longer has an adapter and is a skills-invocable integration. Codex and the vendor-neutral `agents` target share `.agents/skills` and use `.openspec-target` to select one renderer/writer.

Profile and delivery are user-level preferences, installed tools are inferred from generated artifacts, and profile/delivery drift is detected from the filesystem. Generated skill directory names and command IDs are explicit constants. Global writes already exist for MiniMax skills and legacy Codex prompt cleanup, with containment checks and replacement-gated cleanup.

This design adds selectable installation scope without undoing those boundaries.

## Goals / Non-Goals

**Goals:**

- Add one requested install scope with independently resolved effective scope per enabled tool surface.
- Keep new-config `global` and legacy-config `project` defaults distinguishable and observable.
- Express supported scopes and exceptional global paths in tool metadata rather than guessing them.
- Reuse the current delivery, command-surface, generated-name, detection, and path-safety infrastructure.
- Make scope transitions idempotent and safe across project and user directories.

**Non-Goals:**

- Defining global paths for tools whose upstream conventions are not documented.
- Restoring Codex custom-prompt generation.
- Adding project-local profile, delivery, or install-scope configuration.
- Adding a path-keyed global project registry or a new checked-in tool manifest.
- Coordinating writes from concurrent OpenSpec processes.
- Changing which workflows a profile selects or how command bodies are formatted.

## Decisions

### 1. Use one provenance-aware global-config document protocol

Add the preference to the user config model:

```ts
type InstallScope = 'global' | 'project';

interface GlobalConfig {
  // existing fields
  installScope?: InstallScope;
}
```

Keep the runtime type, validation schema, and current defaults in one canonical global-config module. Config commands, init/update, profile migration, telemetry gating, telemetry state updates, and legacy telemetry migration all consume that module instead of parsing or writing the file independently.

The shared reader returns one document result containing:

- storage state: `missing`, `valid`, or `invalid`
- the raw parsed object when one is safely available
- the validated, defaulted effective view used by ordinary consumers
- effective install scope together with `explicit`, `new-default`, or `legacy-default` provenance
- diagnostics for malformed JSON, read failures, or schema-invalid known fields

The install-scope result depends on the raw document state:

- no config file: `global` (`new-default`)
- valid existing file with `installScope`: that value (`explicit`)
- valid existing file without `installScope`: `project` (`legacy-default`)
- malformed, unreadable, or schema-invalid existing file: `project` with a warning (`legacy-default`)

Reads are side-effect free. Provenance is never inferred from the merged effective object because that loses whether the file and key existed.

Create one command-scoped config session before telemetry performs any `preAction` write. The session keeps the initial storage state and install-scope provenance stable for the command while also tracking the latest raw document produced by writes in that process. Consequently, when telemetry creates a previously missing config, the current command still observes `global` from `new-default`, while the next CLI invocation observes the persisted `installScope: global` as `explicit`. A foreground config action that explicitly changes or unsets `installScope` updates the session's effective value and provenance so an apply-now update in the same invocation uses the newly saved preference.

All programmatic writes use one validated patch protocol:

1. For a missing file, start a sparse raw document with `installScope: global`, apply the requested patch, validate the result, and persist it. Do not materialize unrelated effective defaults such as `profile`, `delivery`, or `workflows`; their raw absence may be meaningful to existing migrations. Confirmed reset and initial editor creation remain the explicit operations that write the complete canonical defaults.
2. For a valid existing file, patch the raw document rather than the merged effective view. Preserve unknown fields and preserve the absence of optional fields that the patch does not target. In particular, profile, delivery, workflow, migration, and telemetry updates to a legacy config do not materialize `installScope` and do not change its `legacy-default` provenance.
3. For an invalid or unreadable existing file, reject foreground config and migration writes without changing the file. Best-effort telemetry writes are silently skipped so telemetry cannot replace a user's damaged config with defaults. The confirmed `config reset --all` flow is the explicit recovery operation allowed to replace the invalid document with current defaults; `config edit` remains available for manual repair.
4. Validate the complete candidate before persistence. A rejected patch leaves the previous bytes unchanged.

Background telemetry patches update the session's latest raw document but do not change its initial install-scope provenance. Foreground writes merge against that latest raw document, so a config change made after the telemetry notice preserves `noticeSeen`, `anonymousId`, and every other field written earlier in the same invocation.

Legacy telemetry migration uses the same protocol. If the current config is missing, migrated telemetry is combined only with `installScope: global`; unrelated default fields remain absent. If a valid legacy config exists, only missing telemetry fields are patched and an absent `installScope` remains absent. If the current config is invalid, migration may use legacy telemetry for that process when safe, but it does not persist over the invalid file.

The telemetry module retains domain helpers for reading and updating its section, but those helpers delegate to the shared document protocol; it no longer owns a second config interface, parser, migration writer, or whole-file merge implementation.

Alternative considered: keep the telemetry reader/writer and teach both implementations about install-scope provenance. Rejected because the two paths can still disagree about missing versus legacy files, invalid-file handling, canonical defaults, and which raw fields a write preserves.

Alternative considered: write the merged effective config for every update. Rejected because an unrelated telemetry or profile write would materialize `installScope: global` in a legacy config and silently convert `legacy-default project` into `explicit global`.

### 2. Keep scope support separate per surface and reuse path metadata

Extend tool metadata:

```ts
interface ToolInstallScopeSupport {
  skills?: InstallScope[];
  commands?: InstallScope[];
}

interface AIToolOption {
  // existing fields
  skillsDir?: string;
  globalSkillsDir?: string;
  scopeSupport?: ToolInstallScopeSupport;
}
```

The fields have distinct roles:

- `scopeSupport.skills` / `scopeSupport.commands` declare which scopes are supported.
- `skillsDir` is the project-relative skill container and the default home-relative container when both scopes use the same layout.
- `globalSkillsDir` is only a global path override when the documented user layout differs from the project layout; it no longer implies global-only support by itself.
- Command adapters resolve their own documented layout from install context because command formats and global bases vary by tool.

Missing support metadata for an existing surface means `['project']`. Arrays are support sets, not preference order; the requested scope supplies preference.

The initial release uses this complete matrix:

| Tool surface | Supported scopes | Path rule |
| --- | --- | --- |
| Codex skills | `global`, `project` | `.agents/skills` below the selected root |
| `agents` skills | `global`, `project` | `.agents/skills` below the selected root |
| MiniMax Code skills | `global` | `~/.minimax/skills` |
| GitHub Copilot skills | `global`, `project` | project `.github/skills`; global `~/.copilot/skills` |
| GitHub Copilot commands | `project` | existing `.github/prompts` adapter layout |
| Every other existing skills surface | `project` | existing `skillsDir` project layout |
| Every other existing adapter-backed commands surface | `project` | existing adapter project layout |

There are no global command-file surfaces in the initial release. The corresponding metadata is represented by these entries and the project-only default:

```ts
// Same relative container in both scopes
{ value: 'codex', skillsDir: '.agents', scopeSupport: { skills: ['global', 'project'] } }
{ value: 'agents', skillsDir: '.agents', scopeSupport: { skills: ['global', 'project'] } }

// Global-only, same relative container model
{ value: 'minimax-code', skillsDir: '.minimax', scopeSupport: { skills: ['global'] } }

// Different documented project and user containers
{
  value: 'github-copilot',
  skillsDir: '.github',
  globalSkillsDir: '.copilot',
  scopeSupport: {
    skills: ['global', 'project'],
    commands: ['project'],
  },
}
```

Every global declaration must be backed by a documented upstream location. Adding global support for another surface later requires an explicit matrix/spec/documentation update; implementation work for this change does not discover or add further global targets.

Alternative considered: a single tool-level scope list. Rejected because GitHub Copilot already has user-level skills while OpenSpec's generated prompt files are workspace-scoped.

### 3. Separate scope decisions from surface-specific target paths

The shared scope resolver accepts:

- tool ID and surface (`skills` or `commands`)
- requested scope

It returns:

- requested and effective scope
- whether fallback occurred and an actionable reason

It does not construct a command or skill path. Resolution rules are:

1. Use requested scope when the surface supports it.
2. Otherwise use the alternate scope when supported and record fallback.
3. Fail compatibility preflight when an enabled desired surface supports neither scope.

This intentionally permits split results. With requested `global`, GitHub Copilot skills can resolve globally while its generated prompt files fall back to the project.

After scope resolution, a surface-specific planner produces mutation targets:

- the skill target resolver is the only component that combines skill metadata, project/home/platform context, and effective scope
- command adapters are the only component that produces command installation roots and command file paths, as described in Decision 5
- the shared planner normalizes, contains, preflights, reports, and later reuses those returned targets without reconstructing them

All skill paths are built with `path.join`/`path.resolve`:

```text
project: <projectRoot>/<skillsDir>/skills
global:  <homeDir>/<globalSkillsDir ?? skillsDir>/skills
```

The skill target resolver returns the concrete skills root together with its containment root. Windows uses the resolved Windows home and `path.win32` semantics in platform-mocked tests; it never embeds POSIX home syntax into a Windows result.

### 4. Classify desired, cleanup-only, and preserved surfaces before scope planning

Planning uses one shared pipeline for init, update, and drift checks:

```text
profile workflows
  + delivery
  + command-surface capability
      -> desired / cleanup-only / preserved surfaces per tool
      -> effective scope for desired surfaces
      -> exact target plans for desired and cleanup-only mutations
      -> whole-run mutation preflight
      -> generation/reconciliation plan
```

Important consequences:

- `delivery=skills` makes skills desired and adapter-backed commands cleanup-only.
- `delivery=commands` makes adapter-backed commands desired and their skills cleanup-only; for Codex, `skills-invocable` keeps skills desired as its command surface.
- Existing command-surface rules that intentionally retain a shared global-only surface classify it as preserved instead of cleanup-only.
- A cleanup-only surface does not become a generation compatibility requirement and does not emit an ordinary scope fallback. Its exact existing managed targets are nevertheless resolved and preflighted before removal.
- With no run-only override, cleanup-only planning covers every declared scope whose managed artifacts ordinary delivery behavior says to remove.
- With a run-only override, cleanup-only planning is limited to the scope that would be effective for that surface under the override; managed copies in other scopes are preserved.
- Scope resolution does not change `none`/unsupported command-surface behavior.
- Codex has no command adapter in any scope; `$CODEX_HOME/prompts` remains legacy cleanup input only.

Alternative considered: resolve scope before delivery and capability. Rejected because it reports errors and fallbacks for artifacts the run will not generate.

### 5. Pass install context through command generation and invocation derivation

Update the adapter contract in one pass:

```ts
interface InstallContext {
  requestedScope: InstallScope;
  effectiveScope: InstallScope;
  projectRoot: string;
  homeDir: string;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
}

getInstallRoot(context: InstallContext): string;
getFilePath(commandId: string, context: InstallContext): string;
```

Both methods return concrete absolute paths. The file path must be contained by the installation root returned for the same context. For the initial matrix every effective command scope is `project`, so the installation root must be within `projectRoot`; a future global command declaration must add a documented adapter root before it can pass preflight.

`generateCommand(s)`, command invocation derivation, configured-command detection, content equality checks, profile drift, and cleanup all receive the same resolved context and reuse the adapter-returned root/path pair. They do not prepend roots or reconstruct paths. Adapters remain responsible for formatting and invocation spelling; only path resolution changes.

Alternative considered: have callers prepend project/home roots to an adapter's existing relative path. Rejected because adapter layouts already vary in nesting and filename structure, and any future global command support must keep its documented user root in the adapter contract rather than duplicating it in callers.

### 6. Keep filesystem-as-truth and scan only explicit managed targets

Do not add a new per-project last-scope manifest. For every supported scope, the surface-specific target planners can deterministically enumerate the exact paths of OpenSpec-managed artifacts:

- skills use `OPENSPEC_SKILL_NAMES` / the workflow-to-skill map
- commands use `COMMAND_IDS` and adapter path resolution
- shared skill ownership uses the marker at the resolved physical skill root

Detection and drift checks inspect only those resolved paths. Cleanup authority depends on how the requested scope was selected:

- without `--scope`, the persisted or migration-aware default is authoritative; managed copies at non-effective scopes become durable-migration cleanup candidates, subject to the confirmation authority in Decision 9
- with run-only `--scope`, only the effective target for that invocation is written or reconciled; managed copies in every other scope remain visible drift but are preserved and reported

Cleanup-only surfaces follow the classification rules in Decision 4. Preserved surfaces never enter a cleanup plan. This extends the existing filesystem-as-truth model and remains idempotent after interrupted runs without letting a temporary override delete shared global state.

A path-keyed global registry was rejected because moving or deleting a repository would leave stale invisible state. A checked-in scope manifest was rejected because install scope is a user preference and must not force one developer's tools on teammates.

### 7. Make shared skill ownership root-based

Codex and `agents` can share either:

- `<project>/.agents/skills`
- `<home>/.agents/skills`

Refactor shared-target helpers to accept the already resolved physical skills root instead of assuming `projectPath + skillsDir`. Group possible writers by canonical resolved path for the effective scope, and store `.openspec-target` in that root.

The existing ownership rules remain:

- one rendered OpenSpec tree per physical shared root
- explicit valid marker wins
- safe legacy/content inference is used only when the marker is absent
- Codex-led dual-syntax rendering handles an explicit Codex + `agents` selection

Project and global roots have independent markers. Switching scope does not copy an ownership marker blindly; the selected tools for the new target determine its writer.

### 8. Preflight and contain every global mutation

Before any write or removal:

- resolve all desired targets and every cleanup-only target that may be mutated under the run's cleanup authority
- canonicalize their nearest existing ancestors
- verify project targets remain under the project root
- verify global targets remain under the resolved allowed user directory for that tool
- reject dangling or escaping symlinks
- detect incompatible target collisions and select one shared writer where allowed

Global cleanup uses exact generated names/adapter paths, never broad `openspec-*` or `opsx-*` pattern matching. Legacy Codex prompt cleanup remains a separate allowlisted, replacement-gated migration and is not treated as a scope transition.

### 9. Confirm durable transitions, then write, verify, and clean

For each transition:

1. Complete preflight for the whole run.
2. If a durable transition would remove managed artifacts from a non-effective scope, show the `project -> global` or `global -> project` direction and the concrete destination and cleanup paths. When a global path will be removed, explicitly warn that it may be shared by other projects.
3. In an interactive run, require confirmation with a default of No before any mutation. `--force` supplies explicit authorization without prompting; a non-interactive run without `--force` fails before mutation with an actionable rerun instruction.
4. Write every artifact at its new effective target.
5. Verify all expected managed artifacts for that surface are complete.
6. Remove only the explicitly enumerated managed artifacts from the confirmed non-effective scope targets.
7. Apply deterministic cleanup-only surface removals within the authority defined in Decision 4.
8. Remove empty OpenSpec-created directories when safe; preserve all unrelated content.

The confirmation rule is symmetric: both `project -> global` and `global -> project` durable transitions require it when old managed artifacts will be removed. Declining confirmation exits without writing or removing scoped artifacts; it does not revert the already persisted config preference, so a later durable run can offer the transition again. The confirmation is specific to cross-scope migration cleanup and does not redefine the existing authority for delivery-driven cleanup-only surfaces.

When `--scope` is present, managed artifacts in other scopes are not cleanup candidates and the summary identifies that they were preserved, so no cross-scope confirmation is needed. If writing or verification fails, skip old-target cleanup. If authorized cleanup fails after verified writes, keep the new artifacts, return failure, and list the leftovers. Re-running without an override produces the persisted desired plan and retries cleanup; re-running with the same override refreshes only the same target.

### 10. Integrate scope into the existing config UX

`openspec config profile` remains action-first. Its current-state header adds install scope and its action menu adds an independent `Change installation scope` path; combined configuration may also expose it without forcing workflow changes. Current selections are marked and preselected. Preset shortcuts preserve scope unless the user changes it explicitly.

`config list` reports both value and source. `config get/set/unset installScope` uses the existing schema validation rules. Any profile, set, unset, or reset operation that changes the effective persisted install scope reports the old and new values and warns that the next durable init/update may remove managed artifacts from the previous scope after replacement verification. Config mutation itself never writes or removes tool artifacts. The config command's existing `--scope` flag continues to mean which config store is being edited; install scope is the `installScope` key and the `init/update --scope` option.

`init/update --scope` is run-only and does not persist or authorize cross-scope cleanup. Any self-upgrade rerun of `update` forwards it. Persisting `installScope` and accepting the profile flow's apply-now update runs without an override and therefore performs the durable transition. Summaries report only meaningful decisions, with concrete paths when fallback, split surfaces, or preserved other-scope copies occur.

## Risks / Trade-offs

- **[Risk] A background telemetry write changes config provenance or replaces a damaged config.** -> Snapshot provenance before telemetry, patch only the latest valid raw document through the shared protocol, and skip background persistence for invalid documents.
- **[Risk] A global update affects every project using that tool.** -> Always show global target paths and document that one shared workflow version/profile is being updated.
- **[Risk] Skills and commands for one tool can land in different scopes.** -> Report effective scope per surface and test split-scope tools such as GitHub Copilot.
- **[Risk] Upstream global path conventions change.** -> Require explicit metadata and adapter tests; leave unverified surfaces project-only.
- **[Risk] Two project runs request different content for one global target.** -> The most recent successful global run wins, matching the user-level profile/delivery model; output identifies the shared mutation.
- **[Risk] Scope cleanup can touch user directories.** -> Use canonical containment checks and explicit generated-name lookup, preview concrete paths, require confirmation or `--force`, and never clean before replacement verification.
- **[Risk] A temporary scope override leaves duplicate managed copies.** -> Preserve them deliberately, report their paths, and direct users to persist the preference and run without `--scope` when they want a durable migration.
- **[Risk] Shared `.agents` ownership is inferred differently in project and global roots.** -> Store and resolve the marker independently at each physical root.

## Migration Plan

1. Consolidate config types, schema, defaults, document reads, validated patches, telemetry state, and profile migration behind the source-aware global-config protocol; ensure every first patch-created config records `installScope: global` without materializing unrelated defaults.
2. Replace the global-only skill special case with the fixed initial scope matrix and a shared scope-decision resolver; migrate MiniMax metadata without changing its path.
3. Make shared target ownership accept resolved roots.
4. Pass install context through adapters, invocation derivation, detection, and drift checks.
5. Integrate desired/cleanup-only/preserved planning, mutation authority, transition preview/confirmation, preflight, generation, verification, reporting, and cleanup into init/update.
6. Add CLI/config UX, completions, documentation, and cross-platform coverage.
7. Validate existing project behavior with legacy-default `project`, then smoke-test new-config `global` and explicit overrides.

Rollback consists of reverting the feature before release. After release, rollback must preserve generated global artifacts and avoid automatic deletion; users can persist `installScope: project` and run update without `--scope` to migrate managed artifacts safely.
