# Personal Worksets Research (7.1)

Date: 2026-06-12. This is the slice's first checkpoint: the evidence base
for the spec. Sources: the deleted `workspace` opener machinery at
`f858c19^` (cited as `f858c19^:path:line`), the current tree at HEAD of
`codex/store-root-parity` (cited as `path:line`), and live verification of
the four built-in tools' CLIs on this machine (macOS; `code` 1.120.0,
`cursor` 3.5.1, `claude` 2.1.173, `codex` 0.128.0), supplemented by vendor
docs where a local check would have opened a window or session.

Findings are evidence; decisions stay in the spec. Where the evidence
forces or strongly suggests a shape, it is marked **implication**.

## R1 — Saved-views file: shape, location, name rules

**Global data dir.** `getGlobalDataDir` (`src/core/global-config.ts:78-102`):
`$XDG_DATA_HOME/openspec` when set on any platform, else win32
`%LOCALAPPDATA%/openspec` (with a homedir fallback), else
`~/.local/share/openspec`. Fully injectable via
`GlobalDataDirOptions { env?, platform?, homedir? }` (`:66-70`) — the test
seam every storage test uses. The store registry sits at
`<globalDataDir>/stores/registry.yaml` (`src/core/store/foundation.ts:13-16,
64-70`), with every read/write API threading
`StorePathOptions { globalDataDir? }`. A worksets file has an obvious
sibling slot in the same data dir.

**The registry idiom is directly copyable.** The complete pattern:

- Zod `.strict()` schema with `version: z.literal(1)`
  (`foundation.ts:188-194`); parse = YAML → `safeParse` →
  `formatZodIssues` → id-grammar check on keys (`:259-292`); serialize
  re-validates before writing (`:314-336`).
- Atomic write: same-dir temp file + `fs.rename`, temp removed on error
  (`writeFileAtomically`, `foundation.ts:391-406`).
- Lock: `${file}.lock` via `fs.open(..., 'wx')`, 30s stale-steal, 5s
  deadline with 25ms sleeps, typed `store_registry_busy` on timeout
  (`foundation.ts:412-460`); `updateStoreRegistryState(updater)` does
  lock → read → update → write → unlock, and updaters may throw typed
  errors from inside the lock (`:462-480`).
- Pure rebuilds `withRegisteredStore`/`withoutRegisteredStore`
  (`src/core/store/registry.ts:208-229, 286-306`); no-op reruns never
  take the write lock (`:544-555`).
- Corrupt file → typed diagnostic naming the file with a
  "Repair or remove <path>." fix (`invalid_store_registry`,
  `foundation.ts:211-237`).

**Implication**: a separate `worksets.yaml` (not a new section in the
store registry) matches the feature's independence claims — worksets are not a
declared relationship, so they should not share the store registry. Separate
file, same idiom. Deleting all workset state = deleting one file, which
satisfies "deleting all workset state loses nothing."

**What the old workspace registry did wrong** (not inherited): it mapped
names to *managed* directories `<globalDataDir>/workspaces/<name>`
(`f858c19^:src/core/workspace/registry.ts:13, 88-98`) and made each view a
directory lifecycle (rollback ceremony, `AGENTS.md` marker-fence sync,
`.gitignore` cleanup — `f858c19^:src/core/workspace/open-surface.ts:264-316`).
A saved view should be a record (name → ordered member paths + preferred
tool), not a directory.

**Generated `.code-workspace` placement constraint.** FR1.3/FR1.5 and the
acceptance line "no member folder ever contains workset residue" mean the
generated workspace file cannot live in a member folder. The old code put
it in the managed workspace root. With no managed dirs, the natural home
is the data dir (e.g. `<globalDataDir>/worksets/<name>.code-workspace`) —
machine-local, regenerable, deletable with the rest of workset state.
Counter-precedent: `store setup` deliberately suggests a *user-owned*
location, "never the managed XDG data dir" (`src/commands/store.ts:260-271`)
— but that comment is about the user's own repo, while this file is
derived state the user never edits. Spec decides.

**Name validation.** One kebab grammar repo-wide:
`KEBAB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u`, `isKebabId`,
`KEBAB_ID_DESCRIPTION` (`src/core/id.ts:5-13`; header comment: "The one
kebab id grammar (Phase 3 lock: one id namespace)"). Error-wording idiom:
`` `Repo id '${id}' ${KEBAB_ID_DESCRIPTION}.` `` with a fix restating the
rule (`src/core/store/registry.ts:498-507`). Workset names live in their
own file, so no cross-section conflict checks with stores/repos apply —
but the grammar itself should be the same `isKebabId`.

## R2 — Opener table and opener config

**The two styles already existed implicitly.** The old opener model was a
`kind: 'agent' | 'editor'` discriminant
(`f858c19^:src/core/workspace/foundation.ts:16-43`): editor-style openers
received exactly `[codeWorkspacePath]` as argv; agent-style openers got
optional pre-args + `['--add-dir', path]` per attached path + cwd at the
root (`f858c19^:src/commands/workspace/open.ts:73-103`). That maps 1:1 to
FR2.3's `workspace-file` / `attach-dirs` styles. What 7.1 drops: the old
code appended `WORKSPACE_OPEN_MINIMAL_PROMPT = 'Open this OpenSpec
workspace.'` as a final positional on every agent launch
(`f858c19^:open.ts:19, 90-100`) — the locked no-starter-prompt decision
removes it; agent argv ends with the attach flags.

**Identity was triple-keyed; collapse it.** Value strings (`'codex-cli'`),
structured `{kind, id}`, and label/executable lookups each re-switched on
raw ids including a `'codex'` alias
(`f858c19^:src/core/workspace/openers.ts:110-142`,
`foundation.ts:258-268`). **Implication**: one table row per tool —
`{ id, label, style, command, args?/attach_flag? }` — is the whole
identity, and user config rows are the same shape as built-in rows (the
git difftool/mergetool pattern FR2.3 names).

**Availability scan (inherit nearly verbatim).**
`f858c19^:src/core/workspace/openers.ts:48-108`: PATH value from
`env.PATH ?? env.Path ?? env.path`; non-win32 extensions `['']`, win32
`PATHEXT ?? '.COM;.EXE;.BAT;.CMD'`; candidate = `join(entry, exe + ext)`
must stat as a file, plus `X_OK` access on posix; executables containing a
path separator stat directly; all failures swallowed; injectable
`{ env?, platform? }`. Choices list available-first via a stable sort with
`(<exe> not found on PATH)` annotations (`:144-166`); default = first
available (`:168-172`). No caching — re-stats per call (fine at this call
frequency).

**Built-in rows confirmed by live CLI verification** (details in the
per-tool section below):

| id | style | launch shape |
| --- | --- | --- |
| `code` | workspace-file | `code <name>.code-workspace` |
| `cursor` | workspace-file | `cursor <name>.code-workspace` |
| `claude` | attach-dirs | cwd=primary, `claude --add-dir <m2> <m3> …` (repeatable flag also accepted) |
| `codex` | attach-dirs | cwd=primary, `codex --sandbox workspace-write --add-dir <m2> --add-dir <m3> …` |

The old code's codex pre-args `['--sandbox', 'workspace-write']`
(`f858c19^:open.ts:57-60`) match the roadmap's pinned built-in table; it
applied them only when attach paths existed — simpler to apply always
(spec call). Per-member repeated `--add-dir <path>` pairs are the one
shape verified to parse for both agent CLIs (codex verified locally as
repeatable; claude's variadic `<directories...>` also accepts the repeated
form, which is what the old shipped code emitted for it).

**Opener config file: location candidates.** The repo splits homes by
kind: the global *config* dir holds user-edited JSON
(`<configDir>/config.json`, permissive parse-with-defaults,
`src/core/global-config.ts:35-56, 116-170`); the global *data* dir holds
machine state YAML (registry). An opener table is user-edited
configuration → the config side fits. Candidates: a new top-level section
in `config.json` (cheapest; the file already has permissive parsing) or a
dedicated file. Merge semantics needed per FR2.3: built-ins exist without
any config; a user entry with a built-in id overrides that row's fields; a
new id adds a row; only the two known styles are accepted.

**Cursor `.code-workspace` handling: verified.** The `cursor` shim
(`/usr/local/bin/cursor`, bash) resolves the app bundle and runs the stock
VS Code CLI entry (`ELECTRON_RUN_AS_NODE=1 "$CONTENTS/MacOS/Cursor"
"$CONTENTS/Resources/app/out/cli.js" "$@"`, args forwarded verbatim, no
eval). `cursor --help` mirrors `code --help` including the "folder or
workspace" wording on `--profile`; web evidence confirms
`cursor my.code-workspace` opens a multi-root workspace. Two shim
hazards recorded:

- `cursor agent ...` routes to `~/.local/bin/cursor-agent` and
  **auto-installs it via curl if missing**; `cursor editor ...` strips
  `editor`. Mitigation: we pass exactly one argv entry, an absolute
  workspace-file path, which can never equal a bare `agent`.
- A reported quirk in Cursor's "glass" multi-workbench mode can open
  workspace files in the Agent Window (`--classic` is the community
  workaround). Not locally reproducible without opening a window; do not
  pre-add `--classic` — a user can add it in opener config if bitten
  (exactly the FR2.3 escape hatch).

## R3 — Launch and terminal-handoff mechanics

**Spawn shape (inherit).** The old launcher used **cross-spawn** — still a
declared dependency at exactly `7.0.6` (`package.json:77`) with zero
importers in the current tree (residue of the deletion; 7.1 becomes its
importer again or drops it deliberately):

```ts
const child = spawn(executable, args, {
  cwd,                 // the primary root
  stdio: 'inherit',    // 'ignore' in --json mode
  shell: false,
});
```

(`f858c19^:src/commands/workspace/open.ts:21-22, 175-218`.) Not detached,
no `unref()`, no env manipulation. Editor opens also awaited child exit —
fine because `code`/`cursor` CLIs hand off to the running app and exit
immediately.

**Signal handling: none existed, deliberately usable.** No
`SIGINT`/`SIGTERM` listeners anywhere in the old tree. With
`stdio: 'inherit'` and the child in the foreground process group, the
terminal delivers Ctrl-C to both processes; the parent just awaits
`'close'`. That shipped and worked. **Implication**: the new launcher
needs no signal plumbing either, but the spec should pin the observable
contract (Ctrl-C in an agent session must not produce a parent error
banner over the agent's own exit).

**Exit-code propagation was lossy — fix it.** A nonzero child exit
rejected the launch promise; the command's `handleFailure` flattened it to
`process.exitCode = 1` and printed
`Error: <label> exited with exit code N.`
(`f858c19^:open.ts:200-216`, `f858c19^:workspace.ts:748-776`). For a
terminal-handoff session, the session *is* the command — a user quitting
their agent with a nonzero code should see the workset command exit with
the child's real code, not an error banner. Spawn `'error'` events
(ENOENT etc.) are the genuine launch-failure path
(`workspace_opener_launch_failed` precedent, `f858c19^:open.ts:188-198`).

**`--json` interplay.** The old open launched even in JSON mode with
`stdio: 'ignore'` and printed the payload **after** the child closed
(`f858c19^:workspace.ts:726-751`) — so JSON mode blocked for the entire
agent session, and the payload hardcoded
`launch: { attempted: true, status: 'succeeded' }`
(`f858c19^:open-view.ts:391-394`). Both are traps to avoid. The standing
contracts to honor instead: every `--json` failure leaves exactly one JSON
document on stdout (`src/cli/index.ts:62-63`); side effects that can fail
run before the success payload prints (`src/commands/context.ts:215-220`);
human-facing confirmations of writes go to stderr under `--json`
(`context.ts:168-177`). What `workset open --json` should even mean
(launch vs describe) is a spec decision; the evidence says "launch then
report afterwards" served no one.

**Missing members and fallback messaging.** The old skip pattern: missing
link paths became per-item one-liners under a heading plus warnings and a
`skipped_roots` JSON block — never an error
(`f858c19^:open-surface.ts:228-262`, `f858c19^:workspace.ts:421-431`).
Matches FR2.5 directly. The old availability error showed the manual
workspace-file path **only when the executable was `code`**
(`f858c19^:open.ts:105-129`); FR2.4 requires the fallback (workspace file
path + member folders) on *every* cannot-drive/launch-failure path — a
recorded gap to close, not a pattern to copy.

**The current `.code-workspace` builder is reusable as-is.**
`buildCodeWorkspaceJson(workingSet, rootName)` is pure
(`src/core/working-set.ts:93-107`) but takes a `WorkingSet`; worksets have
plain ordered members, so either generalize it or write the sibling
builder — note its conventions: `{ folders: [{ name, path }] }`,
two-space JSON + trailing newline, absolute paths. The old builder's
folder entries used the member's human name as `name`
(`f858c19^:open-surface.ts:191-215`). The write-guard idiom to mirror:
`context_file_exists` refusal + `--force`, missing-parent-dir typed error,
stderr confirmation (`src/commands/context.ts:140-178`).

## R4 — Compose-flow prompts (house `@inquirer` idiom)

**House rules** (current tree):

- `@inquirer/prompts ^7.8.0` and `@inquirer/core ^10.2.2` are the
  dependencies (`package.json:73-74`). Always dynamically imported at the
  call site — never at module top (pre-commit hang, issue #367;
  `src/commands/store.ts:244` et al.).
- Interactivity gate: `isInteractive()` (`src/utils/interactive.ts`) —
  false on `--no-interactive`, `OPEN_SPEC_INTERACTIVE=0`, `CI` present, or
  non-TTY stdin; `--json` always implies non-interactive
  (`store.ts:273-281`).
- Non-interactive runs require the flags instead of prompting, failing
  with typed errors whose fixes are pasteable full commands
  (`store_setup_id_required` / `store_setup_path_required` idiom,
  `store.ts:283-311`).
- Prompt validation wraps the shared validator:
  `validate: (v) => { try { validateX(v); return true } catch (e) {
  return asErrorMessage(e) } }` (`store.ts:246-257`).
- Path prompts suggest a visible default with `prefill: 'editable'`
  (`store.ts:260-271`).
- Destructive confirms print the plan first, then `confirm`; declining
  throws a typed `*_cancelled` error; non-interactive destructive ops
  require `--yes` (`store.ts:320-381`).
- Cancellation: `ExitPromptError` (or the SIGINT message) →
  `Cancelled.` + `process.exitCode = 130` (`store.ts:222-227, 675-679`;
  the same helper is duplicated in `config.ts:94` — a third copy would
  justify extracting it).

**Old wizard shape worth imitating** (`f858c19^:workspace.ts:435-551`,
`f858c19^:setup-prompts.ts:29-160`): numbered `[n/N]` bold step headings;
the member loop — path input (first default `'.'`, validated
exists-and-is-directory), name inferred via `path.basename` with a name
prompt only on collision/invalid, green `Added '<name>'` echo, then a
`select` defaulting to "finish" between finish/add-another; opener
`select` listing available-first with unavailable annotated. The chalk
prompt theme (`prefix: ''`, cyan highlights, dim help) was deleted with
the group but is recoverable at
`f858c19^:src/commands/workspace/prompt-theme.ts:3-26`. Steps not to
imitate: the skills-install step and initiative/target selection — the
couplings 7.1 explicitly does not inherit.

## Live CLI verification (built-in opener table, this machine)

**`code`** (1.120.0, on PATH): `Usage: code [options] [paths...]`. A
`.code-workspace` positional opens as a multi-root workspace (help's
"folder or workspace" wording + vendor docs). Multiple folder positionals
create one *untitled* multi-root workspace — workable but unsaved, so the
generated-file route is the better contract. Useful flags: `-n
--new-window`, `-r --reuse-window`, `-a --add <folder>` (mutates the last
active window — not workset-shaped).

**`cursor`** (3.5.1, on PATH): VS Code-fork CLI via the bash shim
described in R2; same positional contract. Hazards: the `agent`
first-arg hijack (mitigated by absolute paths) and the glass-mode
workspace-window quirk (user-side `--classic` if needed).

**`claude`** (2.1.173, on PATH): interactive TUI by default ("use
-p/--print for non-interactive"). `--add-dir <directories...>` —
"Additional directories to allow tool access to"; session root is the
process cwd (no `--cwd` flag; `-c --continue` says "in the current
directory"). Hazard: the positional `[prompt]` arg becomes the session's
initial prompt — the no-prompt rule means argv must end with flags, never
a stray positional. Avoid `-p/--print`, `--remote-control`,
`-w/--worktree`, `--tmux`.

**`codex`** (0.128.0, on PATH): interactive TUI by default (options
forward to the interactive CLI). `-s, --sandbox <SANDBOX_MODE>` with
exactly `read-only | workspace-write | danger-full-access`; `-C, --cd
<DIR>` sets the working root; `--add-dir <DIR>` ("Additional directories
that should be writable alongside the primary workspace") — verified
repeatable locally. Hazard: positional `[PROMPT]` starts the session with
a prompt — same rule as claude. A config-override alternative
(`-c 'sandbox_workspace_write.writable_roots=[...]'`) exists but the flag
form is simpler and verified. Note `-C` exists but spawning with `cwd` at
the primary member (the old code's shape) needs no flag at all.

Both agent CLIs are terminal handoffs when launched bare; their
non-interactive modes (`claude -p`, `codex exec`) are exactly what opens
must *not* use.

## Test and capstone groundwork

- CLI e2e harness: `runCLI` spawns the built `dist/cli/index.js` with
  `OPEN_SPEC_INTERACTIVE: '0'` merged in (`test/helpers/run-cli.ts:82-91`).
  Standard isolation block: per-test `mkdtempSync` (realpath'd for macOS
  /tmp), `XDG_DATA_HOME`/`XDG_CONFIG_HOME` pointed inside it,
  `OPENSPEC_TELEMETRY: '0'`, and `getGlobalDataDir({ env })` so fixtures
  and the CLI see the same state (`test/commands/context.test.ts:20-27`).
- The capstone's fake-executable machinery exists fully formed one commit
  back: `test/helpers/path-env.ts` at `f858c19^` (case-insensitive PATH
  key lookup, `withPrependedPathEnv`) and the `createFakeExecutable`
  pattern from `f858c19^:test/commands/workspace-initiative-open.test.ts`
  (~93-121): a `record-launch.cjs` recorder writing
  `{ cwd, args }` to `$OPENSPEC_FAKE_OPEN_LOG`, a posix `#!/bin/sh` shim
  per tool name, a `.cmd` twin for Windows. Resurrect both nearly
  verbatim for fake `code`/`cursor`/`claude`/`codex`.
- Unit-test home by precedent: `test/core/store/{foundation,registry}.test.ts`
  pass `globalDataDir: tempDir`; a worksets storage module gets the same
  treatment.

## Not-to-inherit ledger (from the f858c19^ archaeology)

- Registry indirection mapping names to managed roots, and the whole
  `selection.ts` resolver.
- Managed per-view directories with rollback, `AGENTS.md` fence sync, and
  `.gitignore` ceremony.
- Initiative binding (~half of `prepareWorkspaceOpen`, all of
  `open-target-selection.ts`), `context`/`advisory_edit_boundaries` JSON.
- Skills state leaking into opener selection and a wizard step.
- Triple-keyed opener identity and the `'codex'`/`'codex-cli'` alias.
- Dead option stubs (`--prepare-only`, `--change`) that existed to throw.
- Optimistic/lossy reporting: hardcoded `launch.status: 'succeeded'`,
  child exit codes flattened to 1, fix strings pointing at repair
  subcommands this feature will not have.
- The agent-launch starter prompt (locked out by the 7.1 decisions).

## Open questions the spec must settle

1. Saved-views file: exact name (`worksets.yaml` beside `stores/`?),
   schema fields (members as ordered `{ name?, path }`? preferred tool
   id?), and the new `invalid_*`/`*_busy`/`*_not_found` code family.
2. Generated `.code-workspace` home: `<globalDataDir>/worksets/` vs a
   user-visible location; regenerate-on-every-open vs write-once.
3. Opener config home: section in global `config.json` vs dedicated file;
   exact row schema for the two styles; override/merge rules.
4. `workset open --json` semantics (launch + report vs describe-only) and
   the open command's exit-code contract for agent handoffs.
5. Command surface shapes (`workset` group: compose/list/open/remove
   naming, `--tool` override flag, non-interactive compose flags).
6. Whether `cross-spawn` stays (7.1 becomes its only importer) — evidence
   says yes: it exists for exactly this Windows-spawn problem.
7. Member identity inside a workset: paths only, or name+path (the old
   code used basename-inferred names for `.code-workspace` folder labels).
