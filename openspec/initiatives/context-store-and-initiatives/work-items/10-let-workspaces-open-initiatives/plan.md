# Let Workspaces Open Initiatives

## Status

Product decisions are locked. The remaining work is implementation design and
delivery.

## Source Of Truth

Start from `../../direction.md` and the boundary:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

Item 9 rejected standalone initiative resolution. Initiative discovery belongs
to `initiative show`; local path mapping belongs to workspace local-view state.

## Locked Direction

A workspace does not contain the work. It remembers how this runtime opens the
work.

```text
private local view record
  -> generated runtime files
  -> opener-specific launch
  -> initiative context + selected local repos/folders
```

The durable part is the user's private local view choice. The generated part is
runtime support for agents and editors.

## Product Goal

Let a user open a shared initiative in their own local runtime with the context
and repos they care about.

Examples:

- A Team A developer opens `platform/billing-launch` with local Repo A and Repo
  B.
- A Team B developer opens the same initiative with local Repo C only.
- A user opens the initiative context only, links repos later, and still gets
  useful agent guidance.

## Non-Goals

- Do not clone repos.
- Do not create branches or worktrees.
- Do not use Git submodules as the workspace primitive.
- Do not infer all participating repos from Git remotes or disk scans.
- Do not write generated agent files into linked repos or context stores.
- Do not make workspace-level `changes/` the durable planning model.
- Do not enforce edit permissions in Item 10.

## Decision Register

### Command UX

Status: decided.

Use `workspace open` for initiative local-view realization:

```bash
openspec workspace open --initiative platform/billing-launch
openspec workspace open --initiative billing-launch --store platform
openspec workspace open --initiative billing-launch
openspec workspace open team-a-billing --initiative platform/billing-launch
```

Rationale: the action being performed is local view realization, so the command
belongs under `workspace open` rather than `initiative open`.

Lookup behavior:

- If the user provides `<store>/<initiative>`, use that exact store selector.
- If the user provides `<initiative> --store <store>`, use that exact store
  selector.
- If the user provides only `<initiative>`, search registered context stores and
  proceed when there is exactly one exact match.
- If multiple stores contain the same initiative id, stop and show the matching
  stores with a hint to retry using `<store>/<initiative>` or `--store`.
- If no exact match exists, do not silently open the closest match. Show a small
  list of likely matches when available, plus a hint to run `openspec
  initiative list`.
- If some registered stores cannot be read, keep the result conservative. Do not
  choose a match that could be ambiguous behind an unreadable store unless the
  user supplied an explicit store selector.

Interactive UX may let a human choose from suggestions. JSON and non-interactive
UX should return structured errors and suggestions without prompting.

Workspace-name behavior:

- The optional positional workspace name remains the local view identity.
- If the user provides a workspace name with `--initiative`, create or reuse that
  named local view.
- If the user omits a workspace name, create or reuse a friendly default derived
  from the initiative id when that is unambiguous.
- On name collisions or multiple existing local views for the same initiative,
  let the human choose interactively or require an explicit workspace name in
  non-interactive mode.

### Open Target

Status: decided.

Default to opening the initiative directory, not the whole context store.

User-facing behavior:

```bash
openspec workspace open --initiative billing-launch
```

opens a focused local view:

```text
generated files in the workspace root
context-store/initiatives/billing-launch/
selected local repos/folders
```

It should not open the entire context store by default.

Rationale:

- The user asked for one initiative, so the opened context should be focused on
  that initiative.
- Agents receive less unrelated shared context.
- Unrelated initiatives and shared files are not exposed by default.
- The local view stays easier to understand: generated workspace root plus this
  initiative plus selected implementation roots.

Generated guidance and JSON output should still report the context store root
and that broader context exists. A later explicit option may open the full
context store, for example `--context-scope store` or `--include-store`, but
broad store scope is not the default for Item 10.

### Local View Record

Status: decided.

Use one private local view record: the root `workspace.yaml` file.

```yaml
version: 1
name: billing-launch
context:
  kind: initiative
  store:
    id: platform
    selector:
      kind: registry
      id: platform
  initiative:
    id: billing-launch
links:
  repo-a: /Users/me/repos/repo-a
  repo-b: /Users/me/repos/repo-b
preferred_opener: codex
tools:
  - codex
```

This decision covers the conceptual record shape and the fact that generated
runtime files are not durable state.

If the user selected a context store by local path, the private workspace record
can keep that runtime-local selector without changing checked-in repo metadata:

```yaml
context:
  kind: initiative
  store:
    id: platform
    selector:
      kind: path
      path: /Users/me/context/platform
      observed_id: platform
  initiative:
    id: billing-launch
```

The context binding is optional. A user can also create a workspace that is not
linked to any initiative:

```yaml
version: 1
name: team-a-local
context: null
links:
  repo-a: /Users/me/repos/repo-a
  repo-b: /Users/me/repos/repo-b
preferred_opener: codex
tools:
  - codex
```

This is a first-class workspace shape, not only an edge case for initiative
opening. Item 10 should preserve custom non-initiative workspaces while adding
initiative-aware opening.

### Workspace Storage And Generated Files

Status: decided.

Store each private workspace view under the user's OpenSpec global data
directory, keyed by workspace name:

```text
getGlobalDataDir()/workspaces/<workspace-name>/
```

The workspace name is the local identity. The selected store and initiative, if
any, are data inside the private record; they do not define the storage path.
This keeps the workspace API generic enough for custom local views that are not
initiative-linked.

Initial shape:

```text
getGlobalDataDir()/workspaces/<workspace-name>/
  workspace.yaml
  AGENTS.md
  <workspace-name>.code-workspace
  .codex/
    skills/
  .claude/
    skills/
```

`workspace.yaml` is the durable private view record and the only view file in
Item 10. The other files are generated runtime support owned by OpenSpec. They
may be overwritten by `workspace open`, `workspace update`, or a future explicit
preparation surface.

Do not add a separate generated-output directory for Item 10. The managed
workspace root is already the private generated view.

Initiative open defaults:

- If the user provides a workspace name and no workspace exists, create that
  workspace bound to the selected initiative.
- If the user provides a workspace name and it already points at the same
  initiative, reuse it and regenerate runtime files.
- If the user provides a workspace name and it has no context binding, bind it
  to the selected initiative only after clear user confirmation; in
  non-interactive mode, fail and require an explicit future rebind/update
  surface.
- If the user provides a workspace name and it points at a different initiative
  or context, do not silently repoint it. Stop with a clear error and require an
  explicit future rebind/update surface.
- If the user omits a workspace name and exactly one existing workspace points at
  the selected initiative, reuse it.
- If the user omits a workspace name and no existing workspace points at the
  selected initiative, create a friendly default workspace name derived from the
  initiative id only when that name is unused.
- If the derived workspace name collides with another workspace, ask for an
  explicit workspace name or show matching workspace choices instead of hiding
  the collision behind a path convention.
- If multiple workspaces point at the same initiative, let the user choose or
  require an explicit workspace name in non-interactive mode.

### Generated Runtime Files

Status: decided.

Generate runtime files at the workspace root, next to `workspace.yaml`.

```text
getGlobalDataDir()/workspaces/<workspace-name>/
```

The generated files can contain `AGENTS.md`, skills, launch prompts, and
generated editor workspace files.

Regeneration behavior:

- `workspace open` regenerates the managed runtime files before launching the
  opener.
- `workspace update` regenerates the managed runtime files without changing
  durable local view choices unless the user asked for a state change.
- Generated files are OpenSpec-owned and may be overwritten each time.
- `workspace.yaml` is not generated output and should not be overwritten except
  when the local view record itself changes.

### Runtime Identity

Status: decided.

Use `getGlobalDataDir()` as the runtime-local boundary. It is already
cross-platform and resolves to the appropriate user data directory for macOS,
Linux, Windows, Codespaces, WSL, SSH hosts, and containers.

Local paths in `workspace.yaml` are valid only in the runtime that wrote them.
If the same user opens the same initiative from another runtime, they create or
relink that runtime's workspace there. Item 10 should not add path translation,
shared machine identities, or an extra `<runtime-id>` path segment.

### Prepare/JSON Surface

Status: decided.

Keep `workspace open --json` as a machine-facing receipt for the same open
operation. Do not add `--prepare-only` for Item 10.

The JSON response should be useful to agents and desktop integrations, not just
a success boolean. It should include the workspace name, workspace root,
generated file paths, selected context, opened roots, skipped or missing roots,
opener, launch status, and warnings.

Human-facing behavior remains the normal `workspace open` output. JSON mode is
for tools that need structured facts after OpenSpec has prepared the workspace
root and attempted the requested open.

### Missing Paths At Open Time

Status: decided.

Workspace opening should be strict about the selected initiative/context and
forgiving about optional linked local paths.

- If the selected initiative cannot be resolved, fail before launch.
- If the context store or initiative path is unavailable, fail before launch and
  point to context-store registration/doctor guidance.
- If a linked repo or folder is missing, warn and skip that root; do not block a
  context-only or partially linked open.
- Human output should name skipped links and suggest `workspace doctor` or
  relink guidance.
- JSON output should include skipped or missing roots and warnings.

### Codex Desktop

Status: decided.

Open the generated workspace root as the Codex Desktop project. Surface the
attached initiative path and linked repo/folder paths through generated guidance
and the `workspace open --json` response.

Do not depend on Desktop multi-root automation for Item 10. If Desktop later has
a clearer multi-root contract, it can become an enhancement without changing the
workspace storage model.

### Edit Boundaries

Status: decided.

Item 10 emits advisory boundaries only. Generated context should distinguish
coordination context from implementation targets, but it should not enforce
write restrictions.

The generated view should label initiative/context-store files as shared
coordination context and linked repos/folders as local implementation context
when selected. Strong enforcement can come later.

## First-Run UX Sketch

Status: deferred beyond the first implementation slice.

This sketch captures the eventual human interactive flow. Item 10 should not
depend on building a full guided setup wizard; the first implementation may use
explicit flags and structured errors first.

```text
Found initiative: platform/billing-launch
No local workspace view exists for this runtime.

Create a local view?
> Open context only
  Link existing local repos/folders
  Cancel
```

No option in this first-run flow should clone, branch, create worktrees, or
create submodules.

## Machine-Readable Open Contract

`workspace open --json` is the machine-readable contract for the generated
runtime context. Item 10 should not create a separate machine-readable view
file; the durable view record is `workspace.yaml`.

The JSON response should tell agents:

- schema version
- workspace name and workspace root
- selected initiative id, title, and path
- selected context store id and path
- generated file paths
- opened roots
- skipped or missing roots
- linked repo-local changes when known
- advisory edit boundaries
- next repair commands
- warnings and launch status when produced by `workspace open --json`

If no implementation target is selected, `allowedEditRoots` should be empty or
explicitly advisory.

The exact schema can evolve during implementation, but the JSON response should
make the generated view self-describing enough for agents and desktop
integrations without scraping human output.

## Forward Compatibility

The initial `context` record supports the selected context store and initiative.
Do not design the YAML parser so narrowly that future records cannot add fields
for configurable change homes, artifact homes, target bindings, or other
collection/view metadata.

## Compatibility Notes

The current beta workspace implementation creates a managed root with
`changes/`, `AGENTS.md`, `.gitignore`,
`.openspec-workspace/workspace.yaml`, `.openspec-workspace/local.yaml`, and a
durable `.code-workspace` file.

Item 10's intended new shape is a root `workspace.yaml` plus generated runtime
files at the managed workspace root. Existing beta workspaces should be treated
as compatibility inputs. Migration or removal of all beta internals is deferred
unless the implementation slice intentionally scopes that migration.

For the initiative-opening model, generated runtime files are derived artifacts,
not workspace truth.
