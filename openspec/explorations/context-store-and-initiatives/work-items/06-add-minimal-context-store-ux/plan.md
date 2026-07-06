# Add Minimal Context Store UX

## Status

Minimal context-store CLI and all-store initiative listing implemented.

## Source Of Truth

Start from `../../direction.md`.

The current roadmap order is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

This item exists because agent-first initiative workflows need a usable shared
store before repo-local handoff and workspace opening can feel coherent.

## Goal

Let a user or agent create, register, list, and diagnose local context stores
without knowing the internal registry layout.

## Agent-First Framing

The expected user prompt is closer to:

```text
Using initiative billing-launch, explore the API work and create a proposal.
```

Before an agent can do that, it needs to answer:

- Which context stores are registered locally?
- Which store contains the named initiative?
- Is the registered store path valid?
- Is store metadata present and consistent?
- If no store exists yet, how should one be created?

This work item should provide those primitives. It should not implement
repo-local initiative linking, initiative resolution, workspace opening, or
progress/status dashboards.

## Locked Direction So Far

- Keep the user-facing term `store` for now; naming polish is deferred.
- Use `context-store` as the top-level CLI namespace for this slice. It is more
  explicit for agents and avoids overloading a broad top-level `store` command.
  Keep `store` as shorthand only when the context is already scoped, such as
  `initiative list --store <id>`.
- `context-store setup <id>` should create or use a local folder, write portable
  store metadata, register the local path, and optionally initialize Git.
- When `--path` is omitted, `context-store setup <id>` should default to
  `./<id>`.
- Using the current directory should be explicit with `--path .`; setup should
  not silently turn the current repo into a context store.
- The actual shared context store should be visible on disk, not hidden under
  XDG/global data. XDG/global data is only for the machine-local registry.
- `context-store register <path>` should register an existing clone or folder.
- Registration means "this folder already exists on my machine; remember it as
  a known context store." It should not create the folder, initialize Git, pull,
  push, commit, or create remotes.
- Default the store id from the repo or folder name when metadata is missing.
- Portable store metadata is exactly `.openspec-store/store.yaml`. It should be
  checked into the context-store repo and contain only portable identity for
  now:

```yaml
version: 1
id: team-context
```

- Do not put backend config, local paths, remote URLs, collection config, sync
  policy, or permissions in `store.yaml`.
- If future collection/store config is needed, add a separate explicit file
  rather than expanding the identity file by default.
- Machine-local registry state should stay outside the checked-in store and map
  store ids to local paths.
- Registration should not pull, push, commit, or create remote repositories.
- Remote-url registration or clone sugar can come later.
- `initiative list` should default to all registered stores. `--store` should
  filter to one store, and `--store-path` should remain an explicit escape
  hatch.
- Human output should stay compact and avoid a `Status` column for now.

## Suggested Command Shape

```bash
openspec context-store setup <id> [--path <path>] [--init-git|--no-init-git] [--json]
openspec context-store register <path> [--id <id>] [--json]
openspec context-store list [--json]
openspec context-store doctor [id] [--json]
openspec initiative list [--store <id>] [--store-path <path>] [--json]
```

## Command Behavior

### `context-store setup`

`context-store setup <id>` creates or uses a visible local store root and
registers it on the current machine.

Locked behavior:

- Default path is `./<id>` when `--path` is omitted.
- Current-directory setup is allowed only with explicit `--path .`.
- Missing folders are created.
- Existing folders are allowed when metadata is missing or matches the requested
  id.
- Non-empty folders without context-store metadata are not supported for setup
  in this slice.
- Existing metadata with a different id fails.
- File paths fail.
- `.openspec-store/store.yaml` is written when missing.
- The store is registered in the machine-local registry.
- Interactive TTY mode prompts for Git initialization when neither
  `--init-git` nor `--no-init-git` is provided; the default answer is yes.
- `--json`, non-TTY execution, `--init-git`, and `--no-init-git` do not prompt.
- Git is initialized only when the prompt answer is yes or `--init-git` is
  passed.
- Setup does not commit, push, pull, create remotes, or create hosted repos.
- If a user wants to initialize an existing non-empty folder, fail with a clear
  message and suggest filing the use case or using `context-store register` for
  an existing context store.

Suggested human output:

```text
Context store setup complete

ID: team-context
Location: /Users/me/work/team-context
Metadata: /Users/me/work/team-context/.openspec-store/store.yaml
Registry: /Users/me/.local/share/openspec/context-stores/registry.yaml
Git: initialized
```

### `context-store register`

`context-store register <path>` records an existing local folder or clone as a
known context store on the current machine.

Locked behavior:

- Path must already exist and be a directory.
- If `.openspec-store/store.yaml` exists, use its id.
- `--id` may confirm the metadata id but cannot conflict with it.
- If metadata is missing, infer the id from the folder or repo name unless
  `--id` is passed.
- Inference uses the folder or repo name as-is and then applies normal context
  store id validation. Do not do clever normalization in this slice.
- Missing metadata is written.
- The machine-local registry is updated.
- Same id and same path is an idempotent success.
- Same id and different path fails for now; a future `--replace` can make
  replacement explicit.
- Same path already registered under a different id fails for now.
- Register does not create the folder, initialize Git, pull, push, commit,
  create remotes, or clone.

Suggested human output:

```text
Context store registered

ID: team-context
Location: /Users/me/src/team-context
Metadata: /Users/me/src/team-context/.openspec-store/store.yaml
Registry: /Users/me/.local/share/openspec/context-stores/registry.yaml
```

### `context-store list`

`context-store list` is an index view of the local registry.

Locked behavior:

- Reads the local registry.
- Shows registered id and location only.
- Sorts by store id.
- Does not check metadata, path health, Git, sync, remote, dirty state, or
  conflicts.
- Does not mutate anything.
- Prints no health warnings; health belongs to `context-store doctor`.

Suggested human output:

```text
OpenSpec context stores (2)

ID              Location
platform        /Users/me/src/platform-context
team-context    /Users/me/src/team-context
```

Empty output:

```text
No context stores registered.

Next:
  openspec context-store setup team-context
  openspec context-store register /path/to/context-store
```

### `context-store doctor`

`context-store doctor [id]` is the non-mutating health and repair surface.

Locked behavior:

- Checks all registered stores by default.
- Checks one store when `id` is passed.
- Checks registry presence, path existence, directory shape, metadata presence,
  metadata parsing, and metadata id matching.
- Includes a cheap Git repository presence check.
- Does not check dirty state, branch, remote, sync, pull/push, or conflicts in
  this slice.
- Does not mutate anything.

Empty output:

```text
No context stores registered.
```

Suggested human output:

```text
Context store doctor

team-context
  Location: /Users/me/src/team-context
  Metadata: ok
  Git: repository detected
  Issues: none
```

### `initiative list`

`initiative list` becomes the agent-friendly discovery command across
registered stores.

Locked behavior:

- Without `--store` or `--store-path`, list initiatives from all readable
  registered stores.
- If no context stores are registered, print a concise empty message.
- Sort by store id, then initiative id.
- Do not show a `Status` column in human output.
- Do not print detailed health diagnostics.
- If some stores cannot be read, still show initiatives from readable stores
  and print one small warning that points to `context-store doctor`.
- If all registered stores are unreadable, print a concise failure/empty message
  and point to `context-store doctor`.
- With `--store <id>`, filter to one registered store.
- With `--store-path <path>`, list from that explicit store path.
- Filtered `--store` or `--store-path` mode fails directly if that store cannot
  be read, because there are no fallback stores.

Suggested all-store output:

```text
OpenSpec initiatives (3 across 2 stores)

ID                   Store       Title
billing-launch       platform    Billing Launch
docs-refresh         platform    Docs Refresh
api-cleanup          team        API Cleanup

Some registered context stores could not be read.
Run: openspec context-store doctor
```

No registered stores output:

```text
No initiatives found because no context stores are registered.
```

Suggested filtered output:

```text
OpenSpec initiatives in platform (2)

ID                   Title
billing-launch       Billing Launch
docs-refresh         Docs Refresh

Location: /Users/me/src/platform-context
```

## Boundaries

Do not implement in this item:

- initiative `show`
- repo-local change metadata
- `new change --initiative`
- initiative local resolution
- workspace initiative opening
- sync, pull, push, remote repository creation, or conflict handling

## Remaining Decisions

None before implementation. JSON shapes can follow the existing command pattern:
top-level result objects plus a `status` diagnostics array. Partial success
returns exit code 0 with warning diagnostics; total failure returns nonzero.

## Implemented Slice

- Added `openspec context-store setup/register/list/doctor`.
- Registered the `context-store` command from the top-level CLI.
- Initially kept shell completion metadata out of scope; static metadata was
  added later with the shipped command surface.
- Implemented strict CLI registration policy without changing the permissive
  lower-level registry facade.
- Added setup behavior for default `./<id>`, explicit `--path .`, interactive
  Git init prompt, non-interactive/JSON no-prompt behavior, non-empty directory
  rejection, and metadata writing.
- Added register behavior for existing folders, id inference from folder name,
  metadata writing, id/path conflict rejection, and registry updates.
- Added list behavior as a registry index only.
- Added doctor behavior for registry/path/metadata health and cheap Git
  presence.
- Updated `initiative list` so no selector lists across registered stores,
  `--store` filters, `--store-path` remains an escape hatch, human output is
  compact, and all-store partial success returns warning diagnostics.
