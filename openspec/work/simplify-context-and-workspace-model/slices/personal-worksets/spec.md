# Personal Worksets Spec (7.1)

## Outcome

A user who works across several folders — a planning root plus whatever
repos they choose — can compose that grouping under a name in one short
guided flow, keep it on their machine, list and remove it safely, and
reopen it by name in their tool of choice: VS Code/Cursor as a
multi-folder window, Claude Code/codex as a terminal session with every
member accessible. The workset is purely personal and local: never
committed, never shared, never derived from declarations, and never a
membership truth. No member folder ever contains workset residue.

## Locked Decisions (roadmap, owner-directed — not relitigated here)

1. **Local-only, manual composition**; never committed, shared, or
   derived. Declarations/targets are not load-bearing (they may later
   *suggest* members; not in this slice).
2. **No starter prompt on agent opens** — sessions open clean with
   directories attached.
3. **Tools-as-config via exactly two launch styles**
   (`workspace-file`, `attach-dirs`); no per-tool code paths.
4. **No `--print`/dry-run mode**; fallback info lives in the failure
   path.
5. **Desktop apps unsupported** until they expose a real launch
   interface.
6. **The noun is "workset"**; "workspace" stays retired.
7. **Built-in opener table at v1**: `code`, `cursor` (workspace-file);
   `claude`, `codex` (attach-dirs; codex carries
   `--sandbox workspace-write` pre-args). Availability via PATH scan.
8. **No changes** to `openspec context`, the repo map, project config
   parsing, or any committed file format.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **Command surface**: a new `workset` command group —
   `openspec workset create [name]` (guided compose; non-interactive
   via flags), `openspec workset list`, `openspec workset open <name>
   [--tool <id>]`, `openspec workset remove <name>`. "create" over
   "compose"/"setup" (plain-English verb; matches `new change`'s
   register). No edit/update command at v1: recompose is
   remove + create, and the saved file is hand-editable (validated on
   read). `create` ends by offering to open immediately (interactive
   only).
2. **Saved-views storage**: one machine-local YAML file
   `<globalDataDir>/worksets/worksets.yaml`, following the store
   registry idiom exactly — zod `.strict()` schema with
   `version: z.literal(1)`, parse → validate → typed errors, serialize
   re-validates, same-dir-temp atomic writes, `.lock` sibling with the
   30s stale-steal/5s deadline, pure `withWorkset`/`withoutWorkset`
   rebuilds, no-op reads never take the write lock. Shape:

   ```yaml
   version: 1
   worksets:
     platform:
       tool: claude            # optional preferred opener id
       members:
         - name: team-context  # .code-workspace folder label
           path: /Users/dev/src/team-context
         - name: web-app
           path: /Users/dev/src/web-app
   ```

   Members are ordered; **the first member is the primary**: it is the
   `cwd` for attach-dirs opens and the first folder in the generated
   workspace file. Paths are stored absolute. Member `name` defaults
   to the path basename at compose time and is stored explicitly (it
   labels the `.code-workspace` folder); duplicate names within a
   workset are rejected at parse and compose time. The whole feature's
   state lives under `<globalDataDir>/worksets/` — deleting that one
   directory deletes every saved view and generated file, satisfying
   the "loses nothing you cannot recompose" bar.
3. **Workset names use the one kebab grammar** (`isKebabId` /
   `KEBAB_ID_DESCRIPTION`, `src/core/id.ts`). Worksets are their own
   namespace in their own file: no cross-checks against store/repo ids
   (a workset named like a store is fine — they never meet).
4. **Generated `.code-workspace` files live beside the saved views**
   at `<globalDataDir>/worksets/<name>.code-workspace` and are
   **regenerated on every open** (both styles — the fallback path can
   always name a current file; the write is to our own state dir, so
   no `--force` ceremony applies). Content follows the existing
   builder's conventions (`src/core/working-set.ts:93-107`):
   `{ "folders": [{ "name", "path" }...] }`, two-space JSON, trailing
   newline, absolute paths, members in saved order with their saved
   names. Folders list only members whose paths exist at open time.
   This derived file is the one write `open` performs; `create`,
   `list`, and `remove` write only `worksets.yaml`. Nothing is ever
   written into a member folder.
5. **Opener table and config**: a single table row per tool is the
   whole identity:

   ```ts
   { id, label, style: 'workspace-file' | 'attach-dirs',
     command,            // executable; defaults to id
     args?,              // pre-args, e.g. codex's sandbox flags
     attachFlag? }       // attach-dirs only; default '--add-dir'
   ```

   Built-ins: `code` ("VS Code"), `cursor` ("Cursor") as
   workspace-file; `claude` ("Claude Code"), `codex` ("codex",
   `args: ['--sandbox', 'workspace-write']`) as attach-dirs. User
   config lives in the existing global config file
   (`<globalConfigDir>/config.json`) under a new optional `openers`
   key — rows keyed by id with the same fields in snake_case
   (`style`, `command`, `args`, `attach_flag`). Merge semantics: a row
   whose id matches a built-in overrides only the fields it sets; a
   new id adds a tool (`style` required, `command` defaults to the
   id). An unknown `style` or malformed row fails the command that
   reads it with a typed diagnostic naming the two styles — never
   silently ignored. (The git difftool/mergetool pattern: a tool
   renaming its attach flag is a one-line local fix, e.g.
   `"claude": { "attach_flag": "--dir" }`; adding zed is
   `"zed": { "style": "workspace-file" }`.)
6. **Launch shapes** (pinned; verified against live CLIs in
   `research.md`):
   - workspace-file: argv exactly `[<abs path to <name>.code-workspace>]`,
     `cwd` = primary member. The single absolute-path argv also
     defuses the cursor shim's `agent` first-arg hijack.
   - attach-dirs: argv = `[...args, ...rest.flatMap(m => [attachFlag,
     m.path])]` — pre-args first, then one `attachFlag` + path pair
     per member **after the first**; `cwd` = primary member. **No
     trailing positional, ever** (locked: no starter prompt; both
     agent CLIs read a positional as one).
   - Spawn via `cross-spawn` (already a pinned dependency,
     `package.json:77`) with `shell: false`, `stdio: 'inherit'`,
     env inherited, not detached — the `f858c19^` shape. No signal
     plumbing: with stdio inherited the terminal delivers Ctrl-C to
     the child; the parent awaits close.
   - codex's pre-args apply always (not only when extra members
     exist) — simpler than the old conditional, and a one-member
     codex open still wants `workspace-write`.
7. **Exit codes propagate honestly** (fixing the `f858c19^` lossiness):
   a launched tool's nonzero exit becomes the command's exit code with
   no error banner — for a terminal handoff the session *is* the
   command. Spawn errors (ENOENT etc.) are real failures:
   `workset_launch_failed` plus the manual fallback. Prompt
   cancellation keeps the house convention (`Cancelled.`, exit 130).
8. **`workset open` takes no `--json`** (recorded as a deliberate
   surface gap): an open hands the terminal to the child
   (`stdio: 'inherit'`), which cannot compose with the
   exactly-one-JSON-document contract — the old code's
   ignore-stdio-then-report-after-exit shape blocked for the whole
   agent session and hardcoded `launch: succeeded`; nobody was served.
   `create`, `list`, and `remove` carry `--json` with the standard
   null-shape failure payloads. Open failures print the human
   `Error:`/`Fix:` shape (open is human-only by construction).
9. **The open kind is stated plainly before launch** (FR2.1): editors
   print "Opening <name> in <label> (a window opens; this command
   returns)"; agents print "Handing this terminal to <label> for
   <name> (the session ends when you exit)". One line, then launch.
10. **Fallback is the failure path** (FR2.4): when the preferred or
    requested tool is not on PATH, or the spawn fails, the error names
    the tool and is followed by "Open manually:" with the regenerated
    `.code-workspace` path and the member list — for every tool and
    both styles (the old code showed the file only for `code`). When
    a saved `tool` is unavailable but other tools are installed, the
    fix also names them.
11. **Missing members degrade, absent worksets fail**: a member path
    missing at open is skipped with a one-line note and excluded from
    the generated file and attach flags; if the *primary* is missing,
    the next existing member becomes cwd for that open (noted in the
    same line style). If no member path exists, open fails
    (`workset_no_members_available`). `open`/`remove` of an unknown
    name → `workset_not_found` listing saved names in the fix.
12. **Diagnostic code family** (all new, `workset_*`-prefixed, the
    shared severity/code/message/fix envelope): `workset_not_found`,
    `workset_exists`, `invalid_workset_name`, `invalid_workset_file`
    ("Repair or remove <path>." fix), `workset_file_busy`,
    `workset_member_invalid` (compose-time: path missing or not a
    directory; also duplicate member names), `workset_members_required`
    (non-interactive create without `--member`),
    `workset_tool_unknown` (not a built-in or configured id; fix names
    known ids), `workset_tool_unavailable` (known but not on PATH),
    `invalid_opener_config`, `workset_launch_failed`,
    `workset_no_members_available`, `workset_create_cancelled`,
    `workset_remove_cancelled`, `workset_remove_confirmation_required`
    (non-interactive remove without `--yes`). Target convention:
    `workset.<facet>` (e.g. `workset.name`, `workset.member`,
    `workset.tool`, `workset.file`, `openers.config`).
13. **Compose flow** (house `@inquirer` idiom; dynamic imports;
    `isInteractive()` gate; `--json` implies non-interactive):
    numbered `[n/3]` steps — name (kebab-validated input), members
    (path input defaulting to `.` first, validated
    exists-and-is-directory, name inferred from basename with a name
    prompt only on collision, then add-another/finish select
    defaulting to finish after the first member), tool (select over
    **available** tools only, FR2.2; when none of the known tools is
    installed the step is skipped with a note and no `tool` is saved).
    Then save, confirm-to-open (default yes; declining prints the
    `openspec workset open <name>` line). Non-interactive:
    `--member <path>` / `--member <name>=<path>` (repeatable, ordered,
    first is primary) and optional `--tool <id>` (validated against
    the merged table but not against PATH — a saved preference may
    name a tool installed elsewhere; only `open` requires
    availability). `remove` prints the workset and asks `confirm`;
    non-interactive requires `--yes`.
14. **Module homes** (dependency direction: core never imports
    commands): `src/core/worksets.ts` (schema, paths, parse/serialize,
    lock + atomic update, with/without rebuilds),
    `src/core/openers.ts` (built-in table, config merge, PATH
    availability scan with injectable `{ env, platform }`, pure argv
    builder returning `{ executable, args, cwd, label, style }`), and
    `src/commands/workset.ts` (prompts, spawn via injectable
    cross-spawn, output, registration). The `.code-workspace` content
    comes from a small pure builder in `src/core/worksets.ts`
    mirroring `buildCodeWorkspaceJson`'s conventions (that function
    keeps its `WorkingSet` signature and its one caller — recorded:
    a shared generalization needs two call sites that actually share
    a shape, and these don't).

## User Experience

```text
$ openspec workset create
[1/3] Name the workset
? Workset name: platform

[2/3] Add member folders (first one is the primary — sessions start there)
? Folder path: ~/src/team-context
Added 'team-context' (/Users/dev/src/team-context)
? Add another folder or finish: Add another
? Folder path: ~/src/web-app
Added 'web-app' (/Users/dev/src/web-app)
? Add another folder or finish: Finish

[3/3] Choose your tool
? Open this workset with: Claude Code
  (offered: VS Code, Cursor, Claude Code — codex not found on PATH)

Saved workset 'platform' (3 members) to your machine.
? Open it now in Claude Code? Yes

Handing this terminal to Claude Code for 'platform' (the session ends when you exit).
```

```text
$ openspec workset list
platform  (opens in Claude Code)
  team-context  /Users/dev/src/team-context
  web-app       /Users/dev/src/web-app

$ openspec workset open platform --tool code
Opening 'platform' in VS Code (a window opens; this command returns).
```

A missing member and the failure fallback:

```text
$ openspec workset open platform
Skipped 'web-app' (/Users/dev/src/web-app is not available).
Handing this terminal to Claude Code for 'platform' (the session ends when you exit).

$ openspec workset open platform --tool cursor
Error: Cursor ('cursor') is not on PATH.
Fix: Install 'cursor', pass --tool with an installed tool (code, claude), or open manually.
Open manually:
  Workspace file: /Users/dev/.local/share/openspec/worksets/platform.code-workspace
  Members:
    team-context  /Users/dev/src/team-context
    web-app       /Users/dev/src/web-app
```

Non-interactive and JSON:

```text
$ openspec workset create ci-triage --member ~/src/ci --member runner=~/src/ci-runner --tool codex --json
{
  "workset": {
    "name": "ci-triage",
    "tool": "codex",
    "members": [
      { "name": "ci", "path": "/Users/dev/src/ci" },
      { "name": "runner", "path": "/Users/dev/src/ci-runner" }
    ]
  },
  "status": []
}

$ openspec workset list --json
{ "worksets": [ { "name": "ci-triage", ... }, { "name": "platform", ... } ] }

$ openspec workset remove ci-triage --yes
Removed workset 'ci-triage'. Member folders were not touched.
```

## Scope

In scope:

- **Core** (`src/core/worksets.ts`): the worksets file schema, paths
  (`getWorksetsDir`, file + per-name `.code-workspace` paths),
  parse/serialize with typed errors, lock + atomic update,
  `withWorkset`/`withoutWorkset`, the pure `.code-workspace` content
  builder, name/member validation.
- **Core** (`src/core/openers.ts`): built-in table, `openers` config
  merge (reading the global config file), availability scan
  (PATH/PATHEXT, injectable env/platform — inherited from
  `f858c19^:src/core/workspace/openers.ts:48-108` mechanics), pure
  launch-command builder.
- **Global config** (`src/core/global-config.ts`): the optional
  `openers` key parsed permissively at the file level, strictly per
  row when used.
- **Command** (`src/commands/workset.ts`): the four subcommands,
  prompts, spawn (injectable), human/JSON output, exit-code
  propagation; registration in `src/cli/index.ts`; a
  `workset` entry in `src/core/completions/command-registry.ts`
  (group description single-sourced back into commander, the `repo`
  pattern); the `command:*` unknown-subcommand handler keeping the
  one-JSON-document contract (the `store` group pattern).
- **Dependency**: `cross-spawn` gains its first live importer again
  (already pinned at 7.0.6).
- **Docs**: a "Personal worksets" section in `docs/cli.md` (command
  table rows + a short concept paragraph; "workset" vocabulary only).
- **Tests**: unit — worksets storage (parse/serialize/lock/rebuilds/
  corrupt-file diagnostics, duplicate member names), openers (merge
  semantics, availability with injected env/platform, argv builder
  per style including the no-positional pin and codex pre-args);
  command — compose non-interactive (+JSON shapes), list, remove,
  open via fake executables on PATH (resurrect
  `test/helpers/path-env.ts` and the `createFakeExecutable`
  recorder from `f858c19^`) asserting exact argv, cwd, exit-code
  propagation, missing-member skip, fallback output, `--tool`
  override; e2e — the compose→list→open→remove journey with isolated
  XDG state; an isolation assert that member folders are
  byte-untouched end to end.

Out of scope (pinned):

- Any change to `openspec context`, `openspec doctor`, the repo map,
  `targets:`/`references:` parsing, or any committed file format.
- Declaration-derived member suggestions (recorded as a later idea in
  the roadmap item).
- Desktop apps; terminal multiplexers; session managers; windows/tabs
  orchestration.
- Editing commands (`workset edit`/`rename`); import/export; any
  sharing surface.
- A `--print`/dry-run mode (locked out).
- Workflow-template/guidance regeneration: agent guidance does not
  teach worksets at v1 (it is a human convenience; an agent inside a
  workset session needs no command to be there). Recorded so the
  vocabulary sweep and template parity pins stay untouched.

## Acceptance Criteria

### FR1 — Compose And Keep A Personal Working View

#### Scenario: First workset in one guided flow

- **GIVEN** a machine with no workset state and three real folders
- **WHEN** the user runs `openspec workset create` interactively,
  names it `platform`, adds the three folders, and picks a tool
- **THEN** `<globalDataDir>/worksets/worksets.yaml` contains exactly
  the named workset with ordered `{name, path}` members (absolute
  paths, basename-inferred names) and the chosen `tool`
- **AND** the flow offers to open immediately; declining prints the
  `openspec workset open platform` next step
- **AND** no file or directory inside any member folder was created,
  modified, or deleted (byte-level fixture assert)

#### Scenario: Non-interactive compose

- **WHEN** `openspec workset create ci --member <pathA>
  --member runner=<pathB> --tool codex --json` runs
- **THEN** stdout is exactly one JSON document
  `{ workset: { name, tool, members: [...] }, status: [] }` with
  members in flag order, first member primary
- **AND** rerunning with the same name fails with `workset_exists`
  (exit 1, one JSON document with the null shape
  `{ workset: null, status: [diagnostic] }`)
- **AND** `--member <missing-path>` fails with
  `workset_member_invalid` and writes nothing
- **AND** non-interactive create without `--member` fails with
  `workset_members_required` whose fix is a pasteable full command

#### Scenario: Names and member labels are validated

- **WHEN** create runs with the name `My Stuff` (any grammar-invalid
  name)
- **THEN** it fails with `invalid_workset_name` restating the kebab
  rule (`KEBAB_ID_DESCRIPTION`)
- **AND** two members resolving to the same label (`--member a/web
  --member b/web`) fail with `workset_member_invalid` naming the
  collision and the `name=path` form as the fix

#### Scenario: Listing shows the views at a glance

- **GIVEN** two saved worksets
- **WHEN** `openspec workset list` runs
- **THEN** each name appears with its preferred tool and members
  (name + absolute path); `--json` emits
  `{ worksets: [{ name, tool?, members }] }` sorted by name
- **AND** with no worksets, human output says so plainly and names the
  create command; JSON emits `{ worksets: [] }`

#### Scenario: Removing a view is safe and explicit

- **GIVEN** a saved workset whose `.code-workspace` was generated by a
  prior open
- **WHEN** `openspec workset remove platform` runs interactively and
  is confirmed (non-interactive requires `--yes`, else
  `workset_remove_confirmation_required`)
- **THEN** the entry leaves `worksets.yaml` and the generated
  `platform.code-workspace` is deleted
- **AND** every member folder is byte-untouched
- **AND** removing an unknown name fails with `workset_not_found`
  listing saved names

#### Scenario: Corrupt state fails clearly, never destructively

- **GIVEN** a hand-mangled `worksets.yaml`
- **WHEN** any workset command runs
- **THEN** it fails with `invalid_workset_file` naming the file with a
  "Repair or remove <path>." fix; nothing is auto-deleted or rewritten

### FR2 — Open The View In Your Tool

#### Scenario: Editor open returns (workspace-file style)

- **GIVEN** workset `platform` and a fake `code` on PATH (recorder
  shim)
- **WHEN** `openspec workset open platform --tool code` runs
- **THEN** `<globalDataDir>/worksets/platform.code-workspace` is
  (re)generated with `{ folders: [{name, path}...] }` — saved member
  order, saved names, absolute paths, two-space JSON + trailing
  newline
- **AND** the recorded launch is argv exactly
  `[<abs workspace-file path>]`, cwd = the primary member's path,
  spawned with `shell: false` and inherited stdio
- **AND** the pre-launch line states the editor kind (window opens;
  command returns); the command exits with the child's exit code

#### Scenario: Agent open takes over this terminal (attach-dirs style)

- **GIVEN** fake `claude` and `codex` on PATH
- **WHEN** `open platform` runs with each
- **THEN** claude's recorded launch is
  cwd = primary, argv exactly
  `['--add-dir', <member2>, '--add-dir', <member3>]`; codex's is
  `['--sandbox', 'workspace-write', '--add-dir', <member2>,
  '--add-dir', <member3>]`
- **AND** argv contains no positional argument anywhere (the no-prompt
  pin), and the pre-launch line states the session kind (ends when
  you exit)
- **AND** when the fake tool exits 7, the command's exit code is 7
  with no error banner

#### Scenario: The saved preference is overridable per open

- **GIVEN** `platform` saved with `tool: claude`
- **WHEN** `open platform --tool code` runs
- **THEN** VS Code is launched and `worksets.yaml` is byte-unchanged
  (the preference still says claude)
- **AND** `--tool` with an id that is neither built-in nor configured
  fails with `workset_tool_unknown` naming the known ids

#### Scenario: Adding and adjusting tools is config, not code

- **GIVEN** global config containing
  `"openers": { "zed": { "style": "workspace-file" }, "claude": { "attach_flag": "--dir" } }`
- **WHEN** `open platform --tool zed` runs (fake `zed` on PATH)
- **THEN** zed launches with argv `[<workspace-file path>]`
- **AND** an open with claude now emits `--dir` pairs instead of
  `--add-dir`
- **AND** a row with `"style": "tabs"` fails the command with
  `invalid_opener_config` naming the two valid styles

#### Scenario: Launch failure never strands (the fallback path)

- **GIVEN** the saved tool's executable is absent from PATH (or the
  spawn itself fails)
- **WHEN** `open platform` runs
- **THEN** the error (`workset_tool_unavailable` /
  `workset_launch_failed`) is followed by "Open manually:" with the
  regenerated `.code-workspace` path and the member name/path list —
  for every tool, both styles
- **AND** when other known tools are installed, the fix names them

#### Scenario: A missing member is skipped, the rest opens

- **GIVEN** `platform` whose second member's directory was deleted
- **WHEN** `open platform` runs
- **THEN** a one-line note names the skipped member and its missing
  path; the generated file and attach flags carry only existing
  members; the launch proceeds
- **AND** if the primary is missing, the next existing member is the
  cwd (noted in the same style); if none exist, the open fails with
  `workset_no_members_available`

### The Feature Leaves No Footprint

#### Scenario: Independence and isolation hold

- **GIVEN** a project repo with references/targets and a registered
  store, plus a saved workset
- **WHEN** the full compose→list→open→remove journey runs (e2e,
  isolated XDG state, fake tools)
- **THEN** `openspec context`, `openspec doctor`, and the store/repo
  registries behave byte-identically before and after (worksets never
  touch them)
- **AND** all workset state lives under `<globalDataDir>/worksets/`;
  deleting that directory removes every trace
- **AND** member folders are byte-untouched across the whole journey
- **AND** prompt cancellation at any compose step prints `Cancelled.`
  and exits 130 with nothing saved
