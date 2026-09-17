## Context

OpenSpec currently models skill locations with two mutually exclusive fields: most tools use project-relative `skillsDir`, while MiniMax uses global-only `globalSkillsDir`. Command adapters return project-relative paths; Codex no longer has an adapter and is a skills-invocable integration. Codex and the vendor-neutral `agents` target share `.agents/skills` and use `.openspec-target` to select one renderer/writer.

Profile and delivery are user-level preferences, installed tools are inferred from generated artifacts, and profile/delivery drift is detected from the filesystem. Generated skill directory names and command IDs are explicit constants. Global writes already exist for MiniMax skills and legacy Codex prompt cleanup, with containment checks and replacement-gated cleanup.

This design adds selectable installation scope without undoing those boundaries.

## Goals / Non-Goals

**Goals:**

- Add one requested install scope with independently resolved effective scope per enabled tool surface.
- Keep the `project` default distinguishable from an explicit global opt-in.
- Express supported scopes and exceptional global paths in tool metadata rather than guessing them.
- Reuse the current delivery, command-surface, generated-name, detection, and path-safety infrastructure.
- Make scope transitions idempotent and safe across project and user directories.

**Non-Goals:**

- Inventing or reusing a user-level layout when the upstream tool does not officially document that global surface.
- Restoring Codex custom-prompt generation.
- Adding project-local profile, delivery, or install-scope configuration.
- Adding a path-keyed global project registry or a new checked-in tool manifest.
- Coordinating concurrent OpenSpec processes. Global mutations are designed for the normal single-CLI invocation model; simultaneously running `init` or `update` processes that target the same user-level files are unsupported in this first version.
- Making one global target represent incompatible project-specific OpenSpec versions, profiles, or generated workflow sets. Such projects use project scope.
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

- no config file: `project` (`new-default`)
- valid existing file with `installScope`: that value (`explicit`)
- valid existing file without `installScope`: `project` (`legacy-default`)
- malformed, unreadable, or schema-invalid existing file: `project` with a warning (`legacy-default`)

Reads are side-effect free. Provenance is never inferred from the merged effective object because that loses whether the file and key existed.

Create one command-scoped config session before telemetry performs any `preAction` write. The session keeps the initial storage state and install-scope provenance stable for the command while also tracking the latest raw document produced by writes in that process. Consequently, when telemetry creates a previously missing config, the current command still observes `project` from `new-default`, while the next CLI invocation observes the persisted `installScope: project` as `explicit`. A foreground config action that explicitly changes or unsets `installScope` updates the session's effective value and provenance so an apply-now update in the same invocation uses the newly saved preference.

All programmatic writes use one validated patch protocol:

1. For a missing file, start a sparse raw document with `installScope: project`, apply the requested patch, validate the result, and persist it. Do not materialize unrelated effective defaults such as `profile`, `delivery`, or `workflows`; their raw absence may be meaningful to existing migrations. Confirmed reset and initial editor creation remain the explicit operations that write the complete canonical defaults.
2. For a valid existing file, patch the raw document rather than the merged effective view. Preserve unknown fields and preserve the absence of optional fields that the patch does not target. In particular, profile, delivery, workflow, migration, and telemetry updates to a legacy config do not materialize `installScope` and do not change its `legacy-default` provenance.
3. For an invalid or unreadable existing file, reject foreground config and migration writes without changing the file. Best-effort telemetry writes are silently skipped so telemetry cannot replace a user's damaged config with defaults. The confirmed `config reset --all` flow is the explicit recovery operation allowed to replace the invalid document with current defaults; `config edit` remains available for manual repair.
4. Validate the complete candidate before persistence. A rejected patch leaves the previous bytes unchanged.

Background telemetry patches update the session's latest raw document but do not change its initial install-scope provenance. Foreground writes merge against that latest raw document, so a config change made after the telemetry notice preserves `noticeSeen`, `anonymousId`, and every other field written earlier in the same invocation.

Legacy telemetry migration uses the same protocol. If the current config is missing, migrated telemetry is combined only with `installScope: project`; unrelated default fields remain absent. If a valid legacy config exists, only missing telemetry fields are patched and an absent `installScope` remains absent. If the current config is invalid, migration may use legacy telemetry for that process when safe, but it does not persist over the invalid file.

The telemetry module retains domain helpers for reading and updating its section, but those helpers delegate to the shared document protocol; it no longer owns a second config interface, parser, migration writer, or whole-file merge implementation.

Alternative considered: keep the telemetry reader/writer and teach both implementations about install-scope provenance. Rejected because the two paths can still disagree about missing versus legacy files, invalid-file handling, canonical defaults, and which raw fields a write preserves.

Alternative considered: write the merged effective config for every update. Rejected because an unrelated telemetry or profile write would materialize an absent field and erase the distinction between `legacy-default` and an explicit user selection.

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
  globalSkillsBase?: 'home' | 'user-config';
  scopeSupport?: ToolInstallScopeSupport;
}
```

The fields have distinct roles:

- `scopeSupport.skills` / `scopeSupport.commands` declare which scopes are supported.
- `skillsDir` is the existing project-relative skill container.
- `globalSkillsDir` records an officially verified user-level skill container. It is consulted only when `scopeSupport.skills` explicitly includes `global`.
- `globalSkillsBase` selects the platform-correct base for exceptional user-config layouts (`XDG_CONFIG_HOME` or its default on Unix, `%APPDATA%` on Windows); it defaults to `home`.
- Command adapters resolve their own documented layout from install context because command formats and global bases vary by tool.

Arrays are support sets, not preference order; the requested scope supplies preference. Support is explicit and conservative:

- an existing skills surface with `skillsDir` defaults to project-only unless the matrix records an officially verified global path
- a registered command adapter defaults to project-only unless the matrix records an officially verified global command path
- MiniMax Code explicitly declares verified global-only skills and has no project or command surface
- no adapter means no generated command-file surface; a `skills-invocable` surface inherits only the scopes declared for its skills

An unverified user-level convention is unsupported. OpenSpec does not turn a project-relative layout into a global layout merely by placing it below the user home. Adding global support later requires an official upstream source, an explicit matrix update, and path tests.

In the matrix below, `<P>` is the canonical project root and `<G>` is the platform-correct user root selected by verified metadata or the adapter. A path pair separated by `/` is project then global, and the label is consistently `P/G`. `P only` means the existing project integration remains supported while global requests fall back to project with an explicit reason. Adapter cells name only contexts the adapter is required to accept.

| Tool | Skills scopes and targets | Command surface, scopes, and target rule |
| --- | --- | --- |
| Amazon Q | P only: `<P>/.amazonq/skills` | adapter P only: `<P>/.amazonq/prompts` |
| Antigravity | P/G: `<P>/.agent/skills` / `<G>/.gemini/config/skills` | adapter P only: `<P>/.agent/workflows` |
| Auggie | P only: `<P>/.augment/skills` | adapter P only: `<P>/.augment/commands` |
| Bob | P only: `<P>/.bob/skills` | adapter P only: `<P>/.bob/commands` |
| Claude | P only: `<P>/.claude/skills` | adapter P only: `<P>/.claude/commands` |
| Cline | P only: `<P>/.cline/skills` | adapter P only: `<P>/.clinerules/workflows` |
| CodeArts Agent | P only: `<P>/.codeartsdoer/skills` | none; no adapter is added by this change |
| Codex | P/G: `<P>/.agents/skills` / `<G>/.agents/skills` | skills-invocable; inherits the skills target and does not generate command files |
| Devin Desktop | P/G: `<P>/.devin/skills` / Unix `${XDG_CONFIG_HOME:-<G>/.config}/devin/skills` or Windows `%APPDATA%/devin/skills` | adapter P only: `<P>/.devin/workflows` |
| ForgeCode | P/G: `<P>/.forge/skills` / `<G>/forge/skills` | none; no adapter is added by this change |
| CodeBuddy | P only: `<P>/.codebuddy/skills` | adapter P only: `<P>/.codebuddy/commands` |
| Continue | P only: `<P>/.continue/skills` | adapter P only: `<P>/.continue/prompts` |
| CoStrict | P only: `<P>/.cospec/skills` | adapter P only: `<P>/.cospec/openspec/commands` |
| Crush | P only: `<P>/.crush/skills` | adapter P only: `<P>/.crush/commands` |
| Cursor | P only: `<P>/.cursor/skills` | adapter P only: `<P>/.cursor/commands` |
| Factory | P only: `<P>/.factory/skills` | adapter P only: `<P>/.factory/commands` |
| Gemini CLI | P only: `<P>/.gemini/skills` | adapter P only: `<P>/.gemini/commands` |
| GitHub Copilot | P/G: `<P>/.github/skills` / `<G>/.copilot/skills` | adapter P only: `<P>/.github/prompts` |
| Hermes Agent | P only: `<P>/.hermes/skills`; retain the existing setup note | none |
| iFlow | P only: `<P>/.iflow/skills` | adapter P only: `<P>/.iflow/commands` |
| Junie | P only: `<P>/.junie/skills` | adapter P only: `<P>/.junie/commands` |
| Kilo Code | P/G: `<P>/.kilocode/skills` / `<G>/.kilo/skills` | adapter P/G: `<P>/.kilocode/workflows` / `<G>/.config/kilo/commands` |
| Kimi Code | P only: `<P>/.kimi-code/skills` | none; current command-surface capability remains unchanged |
| Kiro | P only: `<P>/.kiro/skills` | adapter P only: `<P>/.kiro/prompts` |
| Lingma | P only: `<P>/.lingma/skills` | adapter P only: `<P>/.lingma/commands` |
| MiniMax Code | G only: `<G>/.minimax/skills` | none |
| Mistral Vibe | P only: `<P>/.vibe/skills` | none; current command-surface capability remains unchanged |
| Oh My Pi | P/G: `<P>/.omp/skills` / `<G>/.omp/agent/skills` | adapter P/G: `<P>/.omp/commands` / `<G>/.omp/agent/commands` |
| OpenCode | P/G: `<P>/.opencode/skills` / `<G>/.config/opencode/skills` | adapter P/G: `<P>/.opencode/commands` / `<G>/.config/opencode/commands` |
| Pi | P/G: `<P>/.pi/skills` / `<G>/.pi/agent/skills` | adapter P/G: `<P>/.pi/prompts` / `<G>/.pi/agent/prompts` |
| Qoder | P only: `<P>/.qoder/skills` | adapter P only: `<P>/.qoder/commands` |
| Qwen Code | P only: `<P>/.qwen/skills` | adapter P only: `<P>/.qwen/commands` |
| Rovo Dev | P only: `<P>/.rovodev/skills` | none |
| Zoo Code | P only: `<P>/.roo/skills` | adapter P only: `<P>/.roo/commands` |
| Trae | P only: `<P>/.trae/skills` | adapter P only: `<P>/.trae/commands` |
| ZCode | P only: `<P>/.zcode/skills` | adapter P only: `<P>/.zcode/commands` |
| `agents` | P/G: `<P>/.agents/skills` / `<G>/.agents/skills` | none; invocation depends on the consuming agent |

The global-enabled entries are a whitelist, not a default inferred from project support. The matrix was audited against official upstream material on 2026-08-13, including [Antigravity skills](https://antigravity.google/docs/skills) (retaining its documented backward-compatible `.agent/skills` project target), [Agent Skills directory conventions](https://agentskills.io/client-implementation/adding-skills-support), [Codex skills](https://developers.openai.com/codex/skills/), [Devin CLI skills](https://docs.devin.ai/cli/extensibility/skills/overview), [ForgeCode skills](https://forgecode.dev/docs/skills/), [GitHub Copilot skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills), [Kilo skills](https://kilo.ai/docs/customize/skills) and [workflows](https://kilo.ai/docs/customize/workflows), [Oh My Pi configuration](https://github.com/can1357/oh-my-pi/blob/main/docs/config-usage.md), [OpenCode skills](https://opencode.ai/docs/skills/) and [commands](https://opencode.ai/docs/commands/), and [Pi](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md). MiniMax's existing user-level integration is retained as a verified global-only exception. Surfaces not backed by such evidence remain project-only until a later matrix update.

The corresponding metadata is represented by explicit exceptions and surface defaults:

```ts
// Verified shared personal/project container
{ value: 'codex', skillsDir: '.agents', scopeSupport: { skills: ['global', 'project'] } }
{ value: 'agents', skillsDir: '.agents', scopeSupport: { skills: ['global', 'project'] } }

// Global-only, same relative container model
{ value: 'minimax-code', skillsDir: '.minimax', scopeSupport: { skills: ['global'] } }

// Different project and user containers
{
  value: 'github-copilot',
  skillsDir: '.github',
  globalSkillsDir: '.copilot',
  scopeSupport: { skills: ['global', 'project'] },
}

// Platform user-config base rather than the home directory
{
  value: 'devin',
  skillsDir: '.devin',
  globalSkillsDir: 'devin',
  globalSkillsBase: 'user-config',
}
```

Where upstream documentation is incomplete, the table records project-only support. Adding global support later requires an explicit matrix/spec/documentation update and official-source evidence.

Alternative considered: a single tool-level scope list. Rejected because skills and adapter-backed commands can use different directories and command capability may be `adapter-backed`, `skills-invocable`, or `none`.

### 3. Separate scope decisions from surface-specific target paths

The shared scope resolver accepts:

- tool ID and surface (`skills` or `commands`)
- requested scope

It returns:

- requested and effective scope
- whether fallback occurred and an actionable reason

It does not construct a command or skill path. Resolution rules are:

1. Use requested scope when the surface supports it.
2. Treat an undeclared existing skill surface or registered adapter as project-only. Global support must be explicit in the matrix.
3. When the requested scope is unsupported and the surface has one supported alternate, use that alternate and record fallback. MiniMax Code therefore resolves a project request to its verified global-only skill target, while an unverified global request falls back to the existing project target.
4. Fail preflight when no supported target remains or when a declared target cannot be resolved and validated safely.

This permits split results in the initial matrix: a tool can have verified global skills while its adapter-backed commands remain project-only.

After scope resolution, a surface-specific planner produces mutation targets:

- the skill target resolver is the only component that combines skill metadata, project/home/platform context, and effective scope
- command adapters are the only component that produces command installation roots and command file paths, as described in Decision 5
- the shared planner normalizes, contains, preflights, reports, and later reuses those returned targets without reconstructing them

All skill paths are built with `path.join`/`path.resolve`:

```text
project: <projectRoot>/<skillsDir>/skills
global:  <resolvedGlobalBase>/<globalSkillsDir ?? skillsDir>/skills
```

`resolvedGlobalBase` is `homeDir` by default or the platform-resolved user config directory when metadata selects `user-config`. The skill target resolver returns the concrete skills root together with its containment root. Windows uses the resolved Windows home or `%APPDATA%` as declared and `path.win32` semantics in platform-mocked tests; it never embeds POSIX home syntax into a Windows result.

Command paths do not share a process-wide OpenSpec global-root override. The scope resolver first establishes whether the command surface supports the requested scope and records any fallback. It then passes the resulting effective scope to the adapter. A global-enabled adapter resolves its officially verified user-level installation root and command path from the same context; a project-only adapter receives project context after an explicit reported fallback. Explicit `--tools` selection does not bypass the matrix or grant an adapter an unverified global capability.

### 4. Classify desired, cleanup-only, and preserved surfaces before scope planning

Planning uses one shared pipeline for init, update, and drift checks:

```text
profile workflows
  + delivery
  + command-surface capability
      -> desired / cleanup-only / preserved surfaces per tool
      -> effective scope for desired surfaces
      -> one resolved install plan containing exact desired, shared-root, and cleanup targets
      -> whole-run mutation preflight
      -> generation/reconciliation plan
```

Important consequences:

- `delivery=skills` makes skills desired and adapter-backed commands cleanup-only.
- `delivery=commands` makes adapter-backed commands desired and their skills cleanup-only; for Codex, `skills-invocable` keeps skills desired as its command surface.
- Existing command-surface rules that intentionally retain a shared global-only surface classify it as preserved instead of cleanup-only.
- A cleanup-only surface does not become a generation compatibility requirement and does not emit an ordinary scope fallback. Its exact existing managed targets are nevertheless resolved and preflighted before removal.
- With no run-only override, cleanup-only planning covers project targets allowed by ordinary delivery behavior; global targets enter the plan only when the user supplies explicit global-cleanup authorization.
- With a run-only override, cleanup-only planning is limited to the scope that would be effective for that surface under the override; managed copies in other scopes are preserved.
- An invalid config storage state blocks durable scope reconciliation and cleanup. An explicit run-only scope can still produce a preservation-only plan because it does not treat the conservative reported project scope as cleanup authority.
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

Both methods return concrete absolute paths. The file path must be contained by the installation root returned for the same context. Every registered adapter accepts project context. Only adapters explicitly enabled for global commands in the matrix accept global context; their installation roots must be contained by the documented platform-correct user root derived from `homeDir`, `platform`, and relevant upstream path variables in `env`, such as `XDG_CONFIG_HOME` or `APPDATA`.

`getInstallRoot(context)` is the single root API for both scopes, and `effectiveScope` determines which verified layout the adapter returns. This keeps capability selection in the shared scope resolver and keeps concrete command paths inside the adapter that owns them.

One `ResolvedInstallPlan` is constructed before detection or mutation. It contains the requested scope, per-surface effective scope and target, containment roots, the canonical physical shared-skill root and owner decision, exact existing managed targets, preservation state, and authorized cleanup targets. `scanInstalledWorkflows`, configured-tool detection, version/content checks, profile drift, generation, verification, reporting, and cleanup all consume this same plan; none re-resolve from `projectPath`.

`generateCommand(s)` and command invocation derivation reuse the adapter-returned root/path pair from the plan. They do not prepend roots or reconstruct paths. Adapters remain responsible for formatting and invocation spelling; only path resolution changes.

Alternative considered: have callers prepend project/home roots to an adapter's existing relative path. Rejected because adapter layouts vary in base directory, nesting, filename structure, and platform behavior. The adapter must remain the only authority for both project and global command targets.

### 6. Keep filesystem-as-truth and scan only explicit managed targets

Do not add a new per-project last-scope manifest. For every supported scope, the surface-specific target planners can deterministically enumerate the exact paths of OpenSpec-managed artifacts:

- skills use `OPENSPEC_SKILL_NAMES` / the workflow-to-skill map
- commands use `COMMAND_IDS` and adapter path resolution
- shared skill ownership uses the marker at the resolved physical skill root

Detection and drift checks inspect only those resolved paths. Cleanup authority depends on how the requested scope was selected:

- without `--scope` and with valid config storage, the persisted/default scope is authoritative; managed project copies at non-effective scopes may become durable-migration cleanup candidates, while global copies require the additional authorization in Decision 9
- with run-only `--scope`, only the effective target for that invocation is written or reconciled; managed copies in every other scope remain visible drift but are preserved and reported
- with invalid config storage, the conservative reported project scope is not authoritative for migration or cleanup; the command requires repair or an explicit run-only scope that preserves every other scope

Freshness is evaluated over the complete expected managed-artifact set in the resolved plan rather than by sampling one representative skill. Every desired skill must exist and carry the current CLI's `generatedBy` version, every desired command must match the content produced for the current adapter context, deselected managed workflows must be absent, and the shared ownership marker must match the selected writer. Any mismatch makes the surface require synchronization. This preserves the current lightweight skill version stamp while ensuring an ordinary `openspec update` can repair partial or mixed-version output without `--force` once no competing process is still mutating the target.

Cleanup-only surfaces follow the classification rules in Decision 4. Preserved surfaces never enter a cleanup plan. This extends the existing filesystem-as-truth model and remains idempotent after interrupted runs without letting a temporary override delete shared global state.

A path-keyed global registry was rejected because moving or deleting a repository would leave stale invisible state. A checked-in scope manifest was rejected because install scope is a user preference and must not force one developer's tools on teammates.

### 7. Make shared skill ownership root-based

Codex and `agents` can share either:

- `<project>/.agents/skills`
- `<home>/.agents/skills`

Refactor shared-target helpers to accept the already resolved physical skills root instead of assuming `projectPath + skillsDir`. Group possible writers by canonical resolved path for the effective scope, and store `.openspec-target` in that root.

The existing ownership rules remain:

- one rendered OpenSpec tree per physical shared root
- a deterministic unique owner is selected from the enabled tools before generation, and every detector, writer, verifier, and cleanup planner consumes that same ownership decision
- explicit valid marker wins
- safe legacy/content inference is used only when the marker is absent
- Codex-led dual-syntax rendering handles an explicit Codex + `agents` selection

Project and global roots have independent markers. Switching scope does not copy an ownership marker blindly; the selected tools for the new target determine its writer.

When legacy reconciliation skips a tool because another tool owns its resolved shared root, the skipped tool remains unconfigured for that run and receives no replacement. Its repository-local legacy slash-command artifacts are excluded from immediate cleanup, because removing them would delete its only remaining OpenSpec integration. Tools that are not skipped retain the ordinary replacement-gated cleanup behavior.

### 8. Preflight and contain every global mutation

Before any write or removal, complete whole-run preflight:

- resolve all desired targets and every cleanup-only target that may be mutated under the run's cleanup authority
- canonicalize their nearest existing ancestors
- verify project targets remain under the project root
- verify global targets remain under the resolved allowed user directory for that tool
- reject dangling or escaping symlinks
- detect incompatible target collisions and select one shared writer where allowed

Immediately before each individual filesystem write, rename, marker update, or removal, repeat canonical containment validation against the same allowed root and reject a changed, dangling, or escaping parent. Writes use a temporary sibling followed by atomic replacement where the platform supports it; cleanup never follows a replacement symlink. This detects ancestor changes visible at the final mutation-time validation and narrows, but does not eliminate, the remaining time-of-check/time-of-use interval. The first-version threat model assumes that no other local process replaces a validated ancestor after that final check and before the pathname operation; defending against such concurrent local filesystem mutation with directory-handle, no-follow, or equivalent safe-path primitives is outside this change.

Global cleanup uses exact generated names/adapter paths, never broad `openspec-*` or `opsx-*` pattern matching. Legacy Codex prompt cleanup remains a separate allowlisted, replacement-gated migration and is not treated as a scope transition.

### 9. Confirm durable transitions, then write, verify, and clean

For each transition:

1. Complete preflight for the whole run.
2. If a durable transition or cleanup-only surface would remove managed artifacts, show the concrete destination and cleanup paths. A global cleanup target is preserved unless `--allow-global-cleanup` was supplied; when supplied, warn that the target may be shared by other projects.
3. In an interactive run, require confirmation with a default of No before any authorized cross-scope or cleanup-only removal. `--force` bypasses that prompt but does not by itself authorize global cleanup. A non-interactive run needs `--force`, and additionally `--allow-global-cleanup` when any global target is to be removed.
4. Write every artifact at its new effective target.
5. Verify all expected managed artifacts for that surface are complete.
6. Remove only the explicitly enumerated managed artifacts from the confirmed non-effective scope targets.
7. Apply deterministic cleanup-only surface removals within the authority defined in Decision 4.
8. Remove empty OpenSpec-created directories when safe; preserve all unrelated content.

The authorization rule applies uniformly to durable transitions and cleanup-only surfaces. Project cleanup requires the default-No confirmation or `--force`. Global cleanup additionally requires `--allow-global-cleanup`; without it, global copies are preserved and reported rather than making an otherwise safe replacement fail. Declining confirmation exits without writing or removing scoped artifacts and does not revert the already persisted config preference.

When `--scope` is present, managed artifacts in other scopes are not cleanup candidates and the summary identifies that they were preserved, so no cross-scope confirmation is needed. If writing or verification fails, skip old-target cleanup. If authorized cleanup fails after verified writes, keep the new artifacts, return failure, and list the leftovers. Re-running without an override produces the persisted desired plan and retries cleanup; re-running with the same override refreshes only the same target.

### 10. Integrate scope into the existing config UX

`openspec config profile` remains action-first. Its current-state header adds install scope and its action menu adds an independent `Change installation scope` path; combined configuration may also expose it without forcing workflow changes. Current selections are marked and preselected. Preset shortcuts preserve scope unless the user changes it explicitly.

`config list` reports both value and source. `config get/set/unset installScope` uses the existing schema validation rules. Any profile, set, unset, or reset operation that changes the effective persisted install scope reports the old and new values and warns that the next durable init/update may remove managed artifacts from the previous scope after replacement verification. Config mutation itself never writes or removes tool artifacts. The config command's existing `--scope` flag continues to mean which config store is being edited; install scope is the `installScope` key and the `init/update --scope` option.

`init/update --scope` is run-only and does not persist or authorize cross-scope cleanup. Any self-upgrade rerun of `update` forwards it and the cleanup authorization flags. Persisting `installScope` and accepting the profile flow's apply-now update runs without an override and can perform the durable transition within the cleanup authority supplied to that invocation. Summaries report only meaningful decisions, with concrete paths for explicit single-scope fallback, shared global mutations, or preserved other-scope copies.

## Risks / Trade-offs

- **[Risk] A background telemetry write changes config provenance or replaces a damaged config.** -> Snapshot provenance before telemetry, patch only the latest valid raw document through the shared protocol, and skip background persistence for invalid documents.
- **[Risk] A global update affects every project using that tool.** -> Always show global target paths and document that one shared workflow version/profile is being updated.
- **[Risk] Skills and commands for one tool can use different directory layouts.** -> Resolve and report each surface independently while keeping the requested scope unless the matrix explicitly narrows it.
- **[Risk] Upstream global path conventions change or remain undocumented.** -> Global support is an official-source whitelist; unverified surfaces remain project-only and each documented override has path tests.
- **[Risk] Concurrent processes or different CLI installations produce different content for one global target.** -> Treat each physical global target as a user-level singleton with one mutating OpenSpec invocation at a time. Concurrent mutation is explicitly outside the first-version execution model; no lock, manifest, or downgrade rule is added. Sequential successful updates intentionally reconcile the target to the later CLI and current user configuration. After an interruption or accidental competition has stopped, complete-set freshness detection makes an ordinary `openspec update` with the intended CLI converge the target again; `--force` remains an optional unconditional rewrite rather than the required recovery path. Projects that require pinned or project-specific output use project scope.
- **[Risk] Scope cleanup can touch user directories.** -> Revalidate canonical containment at mutation time, use explicit generated-name lookup, preserve global targets unless `--allow-global-cleanup` is present, require confirmation or `--force`, and never clean before replacement verification. This narrows ordinary symlink races but does not claim protection against a separate local process replacing an ancestor after the final validation.
- **[Risk] A temporary scope override leaves duplicate managed copies.** -> Preserve them deliberately, report their paths, and direct users to persist the preference and run without `--scope` when they want a durable migration.
- **[Risk] Shared `.agents` ownership is inferred differently in project and global roots.** -> Store and resolve the marker independently at each physical root.

## Migration Plan

1. Consolidate config types, schema, defaults, document reads, validated patches, telemetry state, and profile migration behind the source-aware global-config protocol; ensure every first patch-created config records `installScope: project` without materializing unrelated defaults.
2. Replace implicit scope behavior with the complete verified-path matrix and a shared scope-decision resolver; migrate MiniMax metadata without changing its verified global-only path and leave unverified global surfaces project-only.
3. Make shared target ownership accept resolved roots.
4. Pass one resolved install plan through adapters, invocation derivation, detection, drift checks, generation, and cleanup, and implement only the verified adapter-specific user roots listed in the matrix.
5. Integrate desired/cleanup-only/preserved planning, mutation authority, transition preview/confirmation, preflight, generation, verification, reporting, and cleanup into init/update.
6. Add CLI/config UX, completions, documentation, and cross-platform coverage.
7. Validate both new and legacy project defaults, then smoke-test explicit persisted and run-only global opt-in.

Rollback consists of reverting the feature before release. After release, rollback must preserve generated global artifacts and avoid automatic deletion; users can persist `installScope: project` and run update without `--scope` to migrate managed artifacts safely.
