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

Every normal command resolves its root the same way, in this order:

```
1. --store <id>          you said so explicitly        → that store
2. nearest openspec/     a real planning root here     → this repo
   (walking up from cwd)
3. store: pointer        config.yaml declares a store  → that store
4. none of the above     stores registered on this     → error with a
                         machine?                        selection hint
                         no stores registered?         → the current
                                                          directory
                                                          (classic behavior)
```

The `Using OpenSpec root:` line (and the `root` block in `--json` output)
tells you which case you're in.

## Known limitations

- **Beta shape.** Everything on this page may change between releases —
  names, flags, file formats, JSON keys.
- **One checkout per store id per machine.** Registering a second checkout
  under the same id fails with a hint to `store unregister` first.
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
- **Some commands stay where they are.** `view`, `templates`, `schemas`,
  and the deprecated noun forms (`openspec change show`, ...) act on the
  current directory only — no `--store`.
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
| Worksets | `<data dir>/openspec/worksets/` | No — this machine only |

`<data dir>` is `~/.local/share/openspec` on macOS and Linux (or
`$XDG_DATA_HOME/openspec` when set), and `%LOCALAPPDATA%\openspec` on
Windows.

## Reference

Exact flags and JSON shapes for every command on this page:
[CLI reference](../cli.md) (Stores, Doctor, Working context, Personal
worksets) and the [agent contract](../agent-contract.md).
