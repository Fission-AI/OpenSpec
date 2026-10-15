# Stores: Plan in Its Own Repo

> **Beta.** Stores, references, working context, and worksets are
> new. Command names, flags, file formats, and JSON output may still change
> shape between releases. Every walkthrough below was run against the
> current build, but re-read this guide after upgrading.

## The problem this solves

OpenSpec normally lives inside one code repo: an `openspec/` folder next to
your code, holding specs and changes for that repo.

That stops fitting the moment your planning is bigger than one repo:

- Your work spans several repos — one feature touches the API server, the
  web app, and a shared library. Whose `openspec/` folder does the plan
  live in?
- Your team plans before code exists, or plans things that never become
  code in *this* repo.
- Requirements are owned by one team and consumed by others. The wiki
  version drifts, and your coding agent can't read it anyway.

A **store** is the answer: a standalone repo whose whole job is planning.
It has the same `openspec/` shape you already know — specs and changes —
plus a small identity file. You register it on your machine once, by name,
and then every normal OpenSpec command can work in it from anywhere.

## The shape

```
            team-plans  (a store: planning in its own repo)
            ├── .openspec-store/store.yaml     identity: "I am team-plans"
            └── openspec/
                ├── specs/      what is true
                └── changes/    what is in motion
                      ▲
                      │ registered on each machine by name;
                      │ shared by pushing/cloning like any repo
        ┌─────────────┼─────────────┐
        │             │             │
    web-app       api-server     mobile-app
   (code repo)   (code repo)    (code repo)
```

Two rules keep this simple:

1. **A store is just a git repo.** You commit, push, pull, and review it
   yourself. OpenSpec never clones, syncs, or pushes anything on its own.
2. **Declarations, not machinery.** Repos can *declare* how they relate to
   stores (shown below). Declarations change what OpenSpec can tell you —
   never where your commands act.

## Five minutes to your first store

Two commands take you from nothing to a working, store-scoped change:

```bash
openspec store setup team-plans --path ~/openspec/team-plans
```

```
Store ready: team-plans
Location: /Users/you/openspec/team-plans
OpenSpec root: ready
Registry: registered

Next: run normal OpenSpec commands against this store, for example:
  openspec new change <change-id> --store team-plans
Share this store by committing and pushing it like any Git repo.
```

```bash
openspec new change add-login --store team-plans
```

```
Using OpenSpec root: team-plans (/Users/you/openspec/team-plans)
Created change 'add-login' at /Users/you/openspec/team-plans/openspec/changes/add-login/
Schema: spec-driven
Next: openspec status --change add-login --store team-plans
```

That's the whole model. From here the lifecycle is exactly what you know —
`status`, `instructions`, `validate`, `archive` — with `--store team-plans`
on each command, and every printed hint carries the flag for you. The
`Using OpenSpec root:` line always tells you where a command is acting.

## Story: one team, one planning repo

A team keeps its specs and changes in `team-plans` instead of scattering
them across code repos.

**Day one (whoever sets it up):**

```bash
openspec store setup team-plans --path ~/openspec/team-plans \
  --remote git@github.com:acme/team-plans.git
git -C ~/openspec/team-plans push -u origin main
```

Passing `--remote` records the clone URL inside the store's own identity
file (`.openspec-store/store.yaml`), in the initial commit. Every future
clone is born knowing where it came from, so health checks and error
messages can print a complete, pasteable fix for teammates who don't have
it yet.

**Every teammate (once per machine):**

```bash
git clone git@github.com:acme/team-plans.git ~/openspec/team-plans
openspec store register ~/openspec/team-plans
```

From then on, everyone works in the same planning repo by name:

```bash
openspec status --store team-plans --change add-login
openspec show add-login --store team-plans
```

**Sharing work is git, on purpose.** A change you create exists only in
your checkout until you commit and push it — same as code. Plans get
branches, pull requests, and review for free, because a store is an
ordinary repo.

**Connecting the team's code repos.** A code repo whose planning is fully
externalized needs exactly one line, in `openspec/config.yaml`:

```yaml
# web-app/openspec/config.yaml
store: team-plans
```

Now every OpenSpec command run inside `web-app` acts on `team-plans` with
no flags at all:

```bash
cd ~/src/web-app
openspec status --change add-login
```

```
Using OpenSpec root: team-plans (/Users/you/openspec/team-plans)
...
```

The pointer is a fallback, never an override: an explicit `--store` always
wins, and if the repo grows real planning folders of its own, those win
(with a warning to remove the stale pointer).

**One default for every repo on your machine.** If you work across many
code repos that all plan into the same store, set it once, globally,
instead of adding the `store:` line to each repo:

```bash
openspec config set defaultStore team-plans
```

Now any command run outside a planning root — and with no `--store` and no
project pointer — resolves to `team-plans`. It sits at the bottom of the
precedence list, so `--store`, a local root, and a project `store:` pointer
all still win. The root banner and JSON `root` block report
`source: "global_default"` with the store id, so you can always tell a
machine-wide default from a repo's own pointer. Clear it with
`openspec config unset defaultStore`. If the id is not registered, commands
error and tell you to register it or clear the stale default.

## Example: one feature, two component repos

Suppose `add-checkout-promo` changes both `checkout-api` and
`checkout-web`. The team wants one shared product contract, while each code
repo still needs its own implementation tasks, branch, and review.

Use two layers:

1. Keep the shared behavior in `team-plans`.
2. Keep implementation plans in each component repo and reference the store
   as read-only upstream context.

First, plan the shared contract in the store:

```bash
openspec new change add-checkout-promo --store team-plans
openspec status --change add-checkout-promo --store team-plans
```

The proposal and specs should describe the behavior at the boundary between
the components — for example, the promotion fields returned by the service
and how the frontend handles an ineligible checkout. Review this change in
the store repo like any other branch and pull request.

### What context does planning see?

Selecting a store changes the OpenSpec root; it does not discover or read
every code repo that uses that store. Store instructions see the artifacts
and configured context in the store. They see component code only when those
folders are also available to the agent or editor and the agent reads them.

A workset is a convenient way to open the planning store and both code repos
together:

```bash
openspec workset create checkout-promo \
  --member ~/openspec/team-plans \
  --member ~/src/checkout-api \
  --member ~/src/checkout-web \
  --tool code
openspec workset open checkout-promo
```

This makes the folders visible in one IDE workspace. It does not copy source
context into the store, select affected repos, or grant an agent permission
to edit them. Put durable cross-component facts in the shared specs; do not
rely on a planner remembering source it happened to inspect.

### How does implementation start in each repo?

When no explicit `--store` or nearer `openspec/` root applies, a
`store: team-plans` pointer routes commands to that store. It does not split
one store task list by the directory from which `apply` was invoked. OpenSpec
currently does not route tasks to repos.

When each component needs an independently scoped apply/review cycle, give it
a local OpenSpec root and reference the central store instead of pointing at
it:

```yaml
# checkout-api/openspec/config.yaml (and likewise in checkout-web)
schema: spec-driven
references:
  - team-plans
```

After the shared contract is approved and available in the store's main
specs, create a small local change for the component's part:

```bash
cd ~/src/checkout-api
openspec new change implement-checkout-promo-api

cd ~/src/checkout-web
openspec new change implement-checkout-promo-ui
```

The reference index in each repo's instructions supplies the store spec's
summary and exact `openspec show ... --store team-plans` fetch command. Each
local proposal cites that shared contract, and its tasks describe only work
in that component. Then run `/opsx:apply` in each repo separately; root
resolution keeps the artifacts and implementation edits scoped to that repo.
The service and frontend changes can now be tested, reviewed, merged, and
archived independently.

If implementation must begin while the shared store change is still active,
fetch it explicitly with
`openspec show add-checkout-promo --store team-plans`; reference indexes list
canonical store specs, not active store changes. Keep the store branch and
component branches linked in their pull-request descriptions so reviewers
can see which version of the contract each implementation follows.

## Story: requirements that cross team lines

A platform team owns the requirements. Product teams build against them,
in their own repos, with their own designs. A reference describes that
relationship without moving anyone's work.

```
   platform-reqs (store)                 api-server (code repo)
   owned by the platform team            owned by a product team
   ┌──────────────────────────┐          ┌──────────────────────────┐
   │ openspec/specs/          │ ◀────────│ openspec/config.yaml     │
   │   payments/spec.md       │ reads    │   references:            │
   │   auth/spec.md           │          │     - platform-reqs      │
   │                          │          │ openspec/specs/          │
   │ openspec/changes/        │          │   (their own designs)    │
   │   platform work          │          │ openspec/changes/        │
   │                          │          │   (their own work)       │
   │                          │          └──────────────────────────┘
   └──────────────────────────┘
```

**The product team declares what it draws on** in its repo's
`openspec/config.yaml`:

```yaml
references:
  - platform-reqs
```

References are read-only context. The repo keeps its own `openspec/` root;
work stays there. What changes: `openspec instructions` in that repo now
includes an index of the referenced store's specs — each with a one-line
summary and the exact fetch command (`openspec show <spec-id> --type spec
--store platform-reqs`). An agent working in `api-server` can find the
upstream payment requirements, cite them, and write its low-level design in
the repo's own root — without anyone pasting context around.

A reference can carry its clone source, so teammates who don't have the
store yet get a complete fix instead of a dead end:

```yaml
references:
  - { id: platform-reqs, remote: "git@github.com:acme/platform-reqs.git" }
```

**When you want the plan and code open together, make a workset.** This is
personal and explicit: each person chooses the folders they actually work
with on their machine. Nothing about those local checkout paths is
committed to the shared planning repo.

```bash
openspec workset create platform \
  --member ~/openspec/platform-reqs \
  --member ~/src/api-server \
  --member ~/src/web-app
```

## Two questions you can always ask

**"Is my setup healthy?"** — `openspec doctor` checks the current root and
its referenced stores, read-only, with a pasteable fix per finding:

```
Doctor

Root
  Location: /Users/you/src/api-server
  OpenSpec root: ok

References
  - platform-reqs: ok (/Users/you/openspec/platform-reqs)
  - design-system: Referenced store 'design-system' is not registered on this machine.
    Fix: git clone -- git@github.com:acme/design-system.git '/Users/you/openspec/design-system' && openspec store register '/Users/you/openspec/design-system' --id design-system

```

**"What am I working with?"** — `openspec context` assembles the working
set from OpenSpec declarations: the root and the stores it references.

```
Working context for api-server (/Users/you/src/api-server)

OpenSpec root
  api-server  /Users/you/src/api-server

Referenced stores
  platform-reqs  /Users/you/openspec/platform-reqs
    Fetch: openspec show <spec-id> --type spec --store platform-reqs
```

Both support `--json` for agents. `openspec context --code-workspace
<path>` additionally writes a VS Code workspace file containing the whole
set — the only write this command performs.

## Worksets: reopen the folders you work on together

Separate from all of the above: most people open the same few folders
together every session — the planning repo plus two or three code repos.
A **workset** is a personal, named view of exactly that, reopened with one
command in your tool of choice.

```
  workset "platform"                 openspec workset open platform
  ├── team-plans   ~/openspec/team-plans         │
  ├── api-server   ~/src/api-server              ▼
  └── web-app      ~/src/web-app       all three open in your tool
```

```bash
openspec workset create platform \
  --member ~/openspec/team-plans --member ~/src/api-server \
  --tool code
openspec workset list
```

```
platform  (opens in VS Code)
  team-plans  /Users/you/openspec/team-plans
  api-server  /Users/you/src/api-server
```

`openspec workset open platform` then launches the saved tool: editors
(VS Code, Cursor) open one window with every member and return. The first
member is the primary. Override the tool any time with `--tool <id>`.

Worksets are deliberately *not* shared state. They live on your machine,
are never committed, and make no claims about the work — they only record
what you like open together. Removing one never touches the member
folders. New tools are configuration, not code: anything launched via a
workspace file or per-folder attach flags can be added under the `openers`
key in the global config (`openspec config edit`).

## How commands decide where to act

Every normal command resolves its root the same way, in this order (the
project-scoped registry at step 3 is the repo-local registry file explained
in the next section):

```
1. --store <id>          you said so explicitly        → that store
   (searches .openspec-store/registry.yaml
   walking up from your directory, then global)
2. nearest openspec/     a real planning root here     → this repo
   (walking up from         or a store: pointer in       → that store
    your directory)        config.yaml                   (same search
                                                          as --store)
3. project-scoped        .openspec-store/registry.yaml  → first store
   registry              found walking up from           entry (error if
                          your directory                 missing/unhealthy)
4. defaultStore          global config sets a machine  → that store
                         default
5. none of the above     stores registered on this     → error with a
                         machine?                        selection hint
                         no stores registered?         → the current
                                                          directory
                                                          (classic behavior)
```

The `Using OpenSpec root:` line (and the `root` block in `--json` output)
tells you which case you're in.

## Project-scoped store registry

The global registry is machine-local: you register stores on each machine by
hand, the binding lives in a registry under your home directory, and a store
ID can point to only one path per machine. A **project-scoped registry** moves
that binding into your repository: a `.openspec-store/registry.yaml` that maps
store IDs to paths relative to the project. Commit it, and the binding travels
with the repo; leave it uncommitted, and it is a local binding for your machine
— the use cases below show both. What this buys you:

- **No per-machine setup.** The registry file is committed, so once someone
  sets it up, a new team member just clones the repo (and the store folders
  that come with it) — `--store <id>` works immediately, with no
  `openspec store register` on their machine.
- **No store conflicts between projects.** Two projects on the same machine
  can use the same store ID and each resolve it to its own path. The global
  registry, with its one-path-per-ID rule, never gets involved.
- **Store work follows the project tree.** Commands run inside a project
  resolve that project's stores first — and, in a monorepo, walk up to a
  parent project's stores when the id is not bound locally.

One thing up front: **the registry points at local folders, not at
repositories.** A store lives in a folder on disk — the same checkout you
cloned from its git repo, with an `openspec/` folder inside. OpenSpec never
clones or downloads a store for you; it only reads the paths you list. If the
store is not on disk yet, put it there first (how, below).

### How it works

A project-scoped registry is a YAML file, `.openspec-store/registry.yaml`, in
your project root:

```yaml
version: 1
stores:
  platform-specs:
    path: platform-specs
  design-specs:
    path: design-specs
```

`version` is the file-format version — leave it at `1`; an unsupported
version causes the file to be skipped, with a warning (below). Each entry
maps a store ID to a path relative to the directory that holds
`.openspec-store/` (your project root). The folder must already exist and
contain a store. Use `/` as the separator everywhere — it works on all
platforms including Windows.

The walk-up search only looks for `registry.yaml`; the `.openspec-store/`
folder inside each store holds that store's identity (`store.yaml`), not a
registry.

When you run a command with `--store <id>`, OpenSpec searches for the ID by
walking up from the directory you are in, checking `.openspec-store/registry.yaml`
at each level. If the file exists and contains the ID, that store is used. If
not, OpenSpec keeps walking up. If no project-scoped registry has the ID,
OpenSpec falls back to the global registry. The same search applies whether
the store ID comes from `--store`, a `store:` pointer in `config.yaml`, or a
`references:` entry.

When you run a command **without** `--store` and there is no local `openspec/`
folder, OpenSpec uses the first store entry along the chain of
`.openspec-store/registry.yaml` files (nearest first, document order within each
file) as the default OpenSpec root. If that entry's folder is missing or
unhealthy, the system reports an error rather than skipping to the next entry.
The `Using OpenSpec root: <id> (...)` banner tells you which store that was.

### Setting up a project-scoped registry

First, make sure the store is on disk. It can live in two places:

- **Inside your project** — a subfolder (plain folder or git submodule). This
  is the simplest layout: clone (or `git submodule add`) the store repo into
  the project, and the registry below points at the folder.
- **Outside your project** — anywhere on disk. Possible, but you'll have to
  hand-write the path (see the `../` rule below), which makes the file less
  portable.

Clone a store that lives in its own repository into your project:

```bash
git clone git@github.com:acme/platform-specs.git ~/work/my-project/platform-specs
# or: git submodule add git@github.com:acme/platform-specs.git platform-specs
```

Starting from scratch instead of cloning? Create the store with
`openspec store setup platform-specs --path ./platform-specs` (see *Five
minutes to your first store*). `setup` registers the store globally; to bind it
to this project, follow with `register --scope project` or create the
`.openspec-store/registry.yaml` file below.

Then point the registry at it. **Manually** — create the file and commit it
(run from the project root):

```bash
mkdir -p .openspec-store
cat > .openspec-store/registry.yaml <<'EOF'
version: 1
stores:
  platform-specs:
    path: platform-specs
EOF
```

**Via CLI** — register the existing store folder into the project-scoped
registry:

```bash
openspec store register ./platform-specs --id platform-specs --scope project
```

This writes `.openspec-store/registry.yaml` for you (creating the folder if
needed). `--id` sets the name the store is registered under — leave it out and
the store's own id is used. Commit the file so teammates get the binding too.

`register --scope project` rejects paths that point outside the project root —
paths starting with `../`. Keeping the paths inside the project is what makes
the file portable; a `../` path depends on a directory layout that exists only
on your machine. If your layout really needs a path outside the project, you
can still hand-edit the file, e.g. `path: ../shared/platform-specs`; the
validation only runs on `register --scope project`.

Omit `--scope` to register in the global (machine-local) registry as before —
the same `openspec store register` you saw in *Story: one team, one planning
repo* above. Choose project-scoped when the binding should travel with the
repo; keep the global registry for machine-local conventions.

**Store folder missing?** A fresh clone brings the registry file but not the
store folders. If your stores are git submodules, run `git submodule update
--init`; if they are separate repos, clone them into the expected paths first.
Commands that can't find a store error with the expected path.

**Verify it works:** `openspec store list --scope project` shows your stores;
or run `openspec status --store platform-specs` and check the
`Using OpenSpec root:` line.

### Managing project-scoped stores

Manage the project-scoped registry with `--scope project`:

```bash
openspec store list --scope project
openspec store unregister platform-specs --scope project
openspec store remove platform-specs --scope project --yes
openspec store doctor --scope project
```

`store doctor --scope project` checks each entry — that the path exists and is
a store — and prints the same pasteable fixes as `openspec doctor`.

### When a registry file is broken

If `.openspec-store/registry.yaml` contains invalid YAML, a missing `version`
field, an unsupported version, or no `stores` map, OpenSpec prints a warning
identifying the file as malformed, then continues searching ancestor
directories or falls back to the global registry. A broken registry file does
not block your work — it is skipped.

### When no project-scoped registry exists

If no `.openspec-store/registry.yaml` exists in the current directory or any
ancestor, all store resolution works exactly as before — the global registry
is used. Existing setups are unaffected.

### Use cases

When do you need a store at all? If the specs live only inside your own
project, use the plain `openspec/` folder — no store, no registry. A store
earns its keep when the specs are shared with other projects or owned by
another team: then they live in their own repository (a separate checkout or
git submodule), and the registry is what binds a store ID to this project's
checkout of that repository.

**Case 1: One project, a store outside it — a local binding.**

The specs you need live in a store that sits outside the project — say, a
checkout of the platform team's store repo in a folder beside your work
folder. Bind it with a registry whose path points outside the project:

```
my-project/
├── .openspec-store/
│   └── registry.yaml        ← local, not committed
└── src/

shared/                      ← outside the project
└── platform-specs/
    └── openspec/
```

`.openspec-store/registry.yaml`:

```yaml
version: 1
stores:
  platform-specs:
    path: ../shared/platform-specs
```

The path depends on where the store lives on *this* machine, so this file is
a local binding — keep it out of git. (That is also why `register --scope
project` rejects `../` paths: it only writes portable in-repo relative paths,
and a path that escapes the project depends on this machine's layout, so you
write this one by hand, as above.) Commands in `my-project` resolve
`platform-specs` to the store next door, and the file never reaches a
teammate's clone.

**Case 2: A monorepo — several projects, several stores.**

A monorepo holds a few dev projects and a few store checkouts, and one
committed registry at the root maps every store ID to its folder:

```
monorepo/
├── .openspec-store/
│   └── registry.yaml        ← committed
├── apps/
│   ├── api/
│   └── web/
└── stores/
    ├── platform-specs/
    │   └── openspec/
    └── design-specs/
        └── openspec/
```

`.openspec-store/registry.yaml`:

```yaml
version: 1
stores:
  platform-specs:
    path: stores/platform-specs
  design-specs:
    path: stores/design-specs
```

Each `stores/*` entry is its own repository (a checkout or submodule), and
each store's `openspec/` folder belongs to that store — a store is a
repository that contains specs, not your project's `openspec/` folder. The
registry is what connects a store ID to its checkout. Run any command
anywhere in the monorepo — say in `apps/api/` — and the walk-up search finds
the registry at the root. Commit the registry and the mapping travels with
the monorepo: anyone who clones it (with `--recurse-submodules`, if the
stores are submodules) gets it, and `--store <id>` works with no
`openspec store register` on their machine:

```bash
openspec status --store platform-specs
```

```
Using OpenSpec root: platform-specs (/Users/you/work/monorepo/stores/platform-specs)
```

**Case 3: Same store ID in two projects.**

Two projects on the same machine both use a store called `shared-specs`, each
with its own checkout. The global registry allows only one path per ID — a
second registration of the same ID would fail. With a project-scoped registry,
each project has its own `.openspec-store/registry.yaml`, mapping `shared-specs`
to its own folder:

```
~/work/project-a/.openspec-store/registry.yaml   → shared-specs → ./shared-specs
~/work/project-b/.openspec-store/registry.yaml   → shared-specs → ./shared-specs
```

No conflict: each project resolves the same ID to its own checkout.

**Case 4: Two branches, each with its own store checkout.**

You work on `main` and a feature branch of a project, and the feature branch
needs its own — possibly unmerged — checkout of a store. Give each clone its
own store folder:

```
~/work/proj-main/               ~/work/proj-feature/
├── .openspec-store/            ├── .openspec-store/
│   └── registry.yaml           │   └── registry.yaml
└── team-plans/                 └── team-plans/
    (checkout of main)              (checkout of feature)
```

Each clone's registry maps `team-plans` to its own folder, so
`--store team-plans` inside one checkout never sees the other's specs. The
global registry is not involved — no "already registered" error.

## Known limitations

- **Beta shape.** Everything on this page may change between releases —
  names, flags, file formats, JSON keys.
- **`store setup` is always global.** `setup` has no `--scope` flag — it
  creates the store and registers it in the global registry. To bind a store to
  a project, use `store register --scope project` or create
  `.openspec-store/registry.yaml` manually.
- **One checkout per store id per machine (global registry).** Registering a
  second checkout under the same id fails with a hint to `store unregister`
  first. This applies to the global registry; project-scoped registries (see
  above) allow the same store ID in different projects without conflict.
- **Nearest project-scoped registry wins for default discovery.** When no
  `--store` and no local `openspec/` root apply, the first store entry
  along the chain of `.openspec-store/registry.yaml` files (nearest first,
  document order within each file) becomes the root. If that entry's folder
  is missing or unhealthy, the system reports an error. For `--store <id>` and `store:` pointer
  resolution, each registry in the ancestor chain is checked for the ID — the
  first registry containing the ID wins.
- **No sync, ever — by design.** OpenSpec never clones, pulls, or pushes.
  A stale checkout shows stale specs until *you* pull; references are
  indexed live from whatever is on disk.
- **Empty planning folders can be absent.** A new store may not have
  `openspec/changes/`, `openspec/specs/`, or `openspec/changes/archive/` in Git
  yet. That is accepted during the beta; those folders appear once normal
  commands create files for them.
- **Pointer repos stay pointers.** A config-only repo whose
  `openspec/config.yaml` declares `store: <id>` is treated as externalized
  planning, not as a store checkout to register. Remove the `store:` line first
  if you intentionally want to convert that repo into a local store root.
- **Some commands stay where they are.** `templates` and the
  deprecated noun forms (`openspec change show`, ...) act on the current
  directory only — no `--store`. `schemas` follows the canonical root-selection
  precedence and accepts `--store <id>` while keeping its successful JSON array
  shape unchanged.
- **Per-machine state is per-machine.** The store registry and worksets
  are local settings. Nothing about your machine's layout is
  ever committed to shared planning.
- **Two launch styles for worksets.** A tool that can't be launched with a
  workspace file or per-folder attach flags can't be added as an opener.
- **Agent JSON has a known casing split** (store-family keys are
  snake_case, workflow-family camelCase). Documented in the
  [agent contract](../agent-contract.md); unifying it is deferred to a
  versioned release.

## Where things live

| What | Where | Shared? |
|---|---|---|
| A store's planning | `<store>/openspec/` (specs, changes) | Yes — commit and push it |
| A store's identity | `<store>/.openspec-store/store.yaml` | Yes — committed with the store |
| The store registry | `<data dir>/openspec/stores/registry.yaml` | No — this machine only |
| Project-scoped registry | `<project>/.openspec-store/registry.yaml` | Yes — committed with the project |
| Worksets | `<data dir>/openspec/worksets/` | No — this machine only |

`<data dir>` is `~/.local/share/openspec` on macOS and Linux (or
`$XDG_DATA_HOME/openspec` when set), and `%LOCALAPPDATA%\openspec` on
Windows.

## Reference

Exact flags and JSON shapes for every command on this page:
[CLI reference](../cli.md) (Stores, Doctor, Working context, Personal
worksets) and the [agent contract](../agent-contract.md).
