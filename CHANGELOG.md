# @fission-ai/openspec

## 1.11.0

### Minor Changes

- [#1301](https://github.com/Fission-AI/OpenSpec/pull/1301) [`a7353ae`](https://github.com/Fission-AI/OpenSpec/commit/a7353aea9a0b23762602badf5055a157a76f62b1) Thanks [@m-tanner](https://github.com/m-tanner)! - Add `openspec status --all`, which reports every active change in one process instead of one CLI spawn per change. `--all --json` emits a single `{ "changes": [ <status>, ... ], "root" }` envelope sorted by change name; a change that fails to load contributes `{ "changeName", "status": [diagnostic] }` in place rather than aborting the sweep. A partial failure exits 1 in both text and JSON modes while preserving the complete JSON envelope. Mutually exclusive with `--change`.

- [#980](https://github.com/Fission-AI/OpenSpec/pull/980) [`dd7cea3`](https://github.com/Fission-AI/OpenSpec/commit/dd7cea3ffed4a22421dce02f54c37c4f076b44f0) Thanks [@bsmedberg-xometry](https://github.com/bsmedberg-xometry)! - show: add `--diff`, which renders each delta requirement against the requirement it replaces in the main spec instead of reprinting the whole block. A MODIFIED requirement has to carry every scenario it keeps, so reviewers could not see what a change actually altered without diffing files by hand. `openspec show <change> --diff` now prints a colorized unified diff per requirement (additions green, removals red), the full text of ADDED requirements, the authored Reason/Migration text of REMOVED ones, and FROM/TO for RENAMED ones; a requirement that is renamed and modified in the same delta is diffed against its old name. `--json --diff` keeps the existing payload shape and adds each applicable `diff` and `warning` field to MODIFIED deltas only. Main specs resolve against the same root as the change, so `--store <id>` diffs against that store. Without `--diff`, `openspec show <change>` prints exactly what it printed before.

### Patch Changes

- [#830](https://github.com/Fission-AI/OpenSpec/pull/830) [`109f81f`](https://github.com/Fission-AI/OpenSpec/commit/109f81f17d3bb99eb6fb2c9a33ec9e8ab0680bb2) Thanks [@alfred-openspec](https://github.com/alfred-openspec)! - Write Antigravity skills and workflows to `.agents/`, arbitrate its shared skill tree with other tools, and safely migrate an existing `.agent/` install.

- [#1712](https://github.com/Fission-AI/OpenSpec/pull/1712) [`04b37ac`](https://github.com/Fission-AI/OpenSpec/commit/04b37ac1d5c852385d2effbff196ddb4fdd1700c) Thanks [@Marzx13](https://github.com/Marzx13)! - archive: preserve a requirement's original position when renaming it instead of moving the renamed block to the end of the spec.

- [#1716](https://github.com/Fission-AI/OpenSpec/pull/1716) [`7010e26`](https://github.com/Fission-AI/OpenSpec/commit/7010e268907598c385eb6686699928fbd5a3a733) Thanks [@aymanxdev](https://github.com/aymanxdev)! - explore: require explicit, scope-bound confirmation before the skill uses any command or tool that can create, edit, move, or delete a file. The explore skill's guardrails let "if the user asks" cover answers to its own clarifying questions, so an agent could treat a design discussion as a go-ahead and start creating schemas or editing `openspec/config.yaml` uninvited. The skill and the `/opsx:explore` command now instruct the agent to name the proposed artifacts or files, ask a direct yes/no question, and wait for confirmation in a separate message before writing. Read-only commands and tools remain available without confirmation, and expanding the confirmed scope requires another confirmation.

- [#1199](https://github.com/Fission-AI/OpenSpec/pull/1199) [`ab81a4b`](https://github.com/Fission-AI/OpenSpec/commit/ab81a4b43a7bd769b1d2a33457b7b708b8c52516) Thanks [@leo-ar](https://github.com/leo-ar)! - Improve Fish completions so command, subcommand, flag, and indexed positional completions no longer fall back to filesystem suggestions unless the target is a real path.

- [#1010](https://github.com/Fission-AI/OpenSpec/pull/1010) [`e5e350d`](https://github.com/Fission-AI/OpenSpec/commit/e5e350d04b5d635b56846f46a212b097cd00eeb6) Thanks [@Dansyuqri](https://github.com/Dansyuqri)! - Draw explore-mode diagrams with plain ASCII. The worked examples in the explore skill and `/opsx:explore` command used Unicode box-drawing, arrow, and marker glyphs, whose display width varies across terminals, fonts, and locales. Agents copied the style, causing padded boxes and aligned tables to drift.

- [`2fa679f`](https://github.com/Fission-AI/OpenSpec/commit/2fa679f180424d46ce7d8789eb85138397844a89) Thanks [@ryandemelo](https://github.com/ryandemelo)! - Make `schema init --default` validate and stage config changes before installing a schema, and roll back both files if either install fails. The staging and backup directories it creates are excluded from schema discovery, so they are never offered as real schemas.

- [#1671](https://github.com/Fission-AI/OpenSpec/pull/1671) [`126c5d6`](https://github.com/Fission-AI/OpenSpec/commit/126c5d6c59d63b7e70314bcc776104c7cc548819) Thanks [@kitimark](https://github.com/kitimark)! - `openspec validate` now reports a `## Purpose` that is still the placeholder archive writes for a new capability, instead of passing it. The placeholder is longer than the 50-character brevity floor, so until now the one check meant to catch a Purpose nobody wrote was satisfied by the exact text saying nobody wrote one — a spec whose Purpose read `Does stuff.` failed `--strict` while a spec whose Purpose said nothing at all passed. A capability could carry the placeholder indefinitely while every command reported success.

  It is a warning, so a project that already has placeholders on disk keeps validating by default and only `--strict` fails. The message says to edit the main spec directly, since a `## Purpose` in a delta is read only when the capability is created and cannot replace an existing one.

  Detection is narrow. The placeholder archive generates is recognised through the same definition that writes it, wherever it appears in the Purpose. Otherwise only a `TBD` or `TODO` opening the Purpose counts, so `The retry budget is TBD pending benchmarks` is still a valid Purpose and a word like `TBDs` is not a marker. Fenced code inside the Purpose is quoted material rather than the Purpose speaking, so a spec that documents the placeholder keeps passing. An empty Purpose is unchanged, and a Purpose reported as a placeholder is no longer also reported as too brief, so a bare `TBD` yields one finding rather than two.

  `openspec archive` is unaffected: it validates rebuilt specs without `--strict`, so a spec archive writes still passes the validation it would have passed before, and the text archive writes is unchanged.

## 1.10.0

### Minor Changes

- [#1685](https://github.com/Fission-AI/OpenSpec/pull/1685) [`c747ed1`](https://github.com/Fission-AI/OpenSpec/commit/c747ed1f34459ca6bc15d43ad9f68dfdf7750875) Thanks [@clay-good](https://github.com/clay-good)! - Add `openspec init --language <language>` to configure the language used for artifacts in new projects.

### Patch Changes

- [#1704](https://github.com/Fission-AI/OpenSpec/pull/1704) [`7276c6c`](https://github.com/Fission-AI/OpenSpec/commit/7276c6c26832f699a63544302d38b1af8ddb9844) Thanks [@clay-good](https://github.com/clay-good)! - Drop the npm `postinstall` script. Its only job was printing a one-line tip about opt-in shell completions, but shipping any install script made `npm install -g @fission-ai/openspec` emit an `allow-scripts` warning that reads as a packaging fault (and `npm approve-scripts` then fails with `ENOMATCH` on a global install, since it looks in the local project). The tip now prints from the CLI on its first run — to stderr, in an interactive terminal, once, and not at all if you already have completions installed — and the published package declares no `preinstall`/`install`/`postinstall` script, so a registry install runs no OpenSpec code. Suppress the tip with `OPENSPEC_NO_COMPLETIONS=1`.

- [#1656](https://github.com/Fission-AI/OpenSpec/pull/1656) [`a72a74d`](https://github.com/Fission-AI/OpenSpec/commit/a72a74de6571c26fd79a193bb33fa3b8e1a767fb) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - `openspec update` now suggests restarting an IDE only when it updates an IDE-resident tool. CLI tools such as Claude Code, Codex, and Gemini CLI no longer show an unnecessary restart hint.

- [#1703](https://github.com/Fission-AI/OpenSpec/pull/1703) [`9643888`](https://github.com/Fission-AI/OpenSpec/commit/9643888a7525467c7a076bfec9bb075910e78bb8) Thanks [@clay-good](https://github.com/clay-good)! - Point the spec-driven `specs` instruction's main-spec read and edit at the store-aware root. It named `openspec/specs/<capability-path>/spec.md`, a path relative to the current directory, for both step 1 of the MODIFIED workflow ("locate the existing requirement") and the edit that fixes a leftover `TBD` Purpose. When the change lives in a store — whether selected with `--store`, a project `store:` pointer, or a global default store — the main spec is under the store root, so that read missed it, or silently returned a different capability when a local one happened to share the name, and the MODIFIED block was then copied from the wrong requirement. Both operations now use `<planningHome.root>/openspec/specs/...`, the root already returned by `openspec instructions ... --json` and the same convention the sync and archive workflows use. Fixes [#1702](https://github.com/Fission-AI/OpenSpec/issues/1702).

- [#1699](https://github.com/Fission-AI/OpenSpec/pull/1699) [`18688c8`](https://github.com/Fission-AI/OpenSpec/commit/18688c8b27820da3435a47a7f11e90073724b728) Thanks [@clay-good](https://github.com/clay-good)! - archive: tell the author how to retire a capability when the emptied spec also holds content the merge cannot account for. That combination printed only "Spec must have at least one requirement" and no guidance at all; the abort now names the blocking lines and reports a `retire_capabilities` marker that is present but cannot be honored. Authored content quoted in those messages - the blocking lines, and the marker's own reason, which `openspec validate` prints too - is stripped of control characters and bounded in length before it reaches the terminal.

- [#1660](https://github.com/Fission-AI/OpenSpec/pull/1660) [`7da3f34`](https://github.com/Fission-AI/OpenSpec/commit/7da3f34fb66d602bd987caa7dddcf3d6621e7d44) Thanks [@clay-good](https://github.com/clay-good)! - Require generated tasks to state how their completion can be verified.

## 1.9.0

### Minor Changes

- [#1622](https://github.com/Fission-AI/OpenSpec/pull/1622) [`59c16a4`](https://github.com/Fission-AI/OpenSpec/commit/59c16a4461254ed984d1d5e29d00af1a5610035a) Thanks [@clay-good](https://github.com/clay-good)! - ### New Features

  - **Command Code command adapter** — Command Code is now a first-class, adapter-backed tool. `openspec init` generates OpenSpec commands under `.commandcode/commands/opsx-<id>.md` (invoked as `/opsx-<id>`) alongside the skills under `.commandcode/skills/`, matching Command Code's documented custom-slash-command surface.

- [#1613](https://github.com/Fission-AI/OpenSpec/pull/1613) [`42d7f67`](https://github.com/Fission-AI/OpenSpec/commit/42d7f673bc5f13378451267c8a9d0c23f63a2d1a) Thanks [@Angelthebestone](https://github.com/Angelthebestone)! - ### New Features

  - **Command Code support** — `openspec init` now supports Command Code as an adapterless skills-only tool. It installs the OpenSpec skills under `.commandcode/skills/` and invokes them as `/openspec-*` commands, matching Command Code's native skill surface.

- [#1604](https://github.com/Fission-AI/OpenSpec/pull/1604) [`83be9d1`](https://github.com/Fission-AI/OpenSpec/commit/83be9d113e8310789c281f7c8a00ed4fad191dd5) Thanks [@clay-good](https://github.com/clay-good)! - Add `openspec validate --archived`: an opt-in check that every change under `changes/archive/` has all of its `tasks.md` checkboxes ticked, exiting non-zero if any are unchecked. This surfaces changes that were archived with unfinished work — which the normal validate flow never catches, because it only looks at active changes — and is meant for a pre-commit or CI hook ([#205](https://github.com/Fission-AI/OpenSpec/issues/205)). It is a standalone scope: it does not alter any existing `validate` invocation and does not re-validate already-applied spec deltas.

### Patch Changes

- [#1530](https://github.com/Fission-AI/OpenSpec/pull/1530) [`bf5099e`](https://github.com/Fission-AI/OpenSpec/commit/bf5099e39fdb5d7bde2adc84f49ea93afd7463e9) Thanks [@clay-good](https://github.com/clay-good)! - Apply workflow now tells agents to surface unexpected scope instead of hiding it. When a task needs work beyond what the spec describes, the `/opsx:apply` skill and command guidance direct the agent to pause and report the added scope rather than silently narrowing, deferring, or simplifying away specified behavior, and to mark a task complete only when its specified behavior is fully implemented. Fixes [#1529](https://github.com/Fission-AI/OpenSpec/issues/1529).

- [#1603](https://github.com/Fission-AI/OpenSpec/pull/1603) [`9ae75c8`](https://github.com/Fission-AI/OpenSpec/commit/9ae75c86efe5d326ffa7ca5a3fd64b1f1e7728c2) Thanks [@clay-good](https://github.com/clay-good)! - `openspec archive` no longer writes terminal escape codes to a redirected or captured stdout. Its confirmation prompts and the no-argument change picker drew their live UI with ANSI cursor-move sequences even when stdout was not a terminal — noise in a redirected log, and in some non-interactive hosts an unbounded render loop that could grow the captured output until the disk filled. When stdout (or stdin) is not a terminal, archive now reads the confirmations as plain text, and a no-argument run asks you to pass a change name up front instead of drawing a menu. Piped answers (`printf 'y\n' | openspec archive …`) and `--yes` behave as before, and interactive terminals are unchanged. Fixes [#1526](https://github.com/Fission-AI/OpenSpec/issues/1526).

- [#1528](https://github.com/Fission-AI/OpenSpec/pull/1528) [`9425897`](https://github.com/Fission-AI/OpenSpec/commit/942589741de35f1b8896b410d7ea70295bb137c0) Thanks [@Marzx13](https://github.com/Marzx13)! - Canonicalize rebuilt specs to end with exactly one final LF. Previously a spec whose `## Requirements` section was last was rebuilt with a trailing blank line (`\n\n`), which failed Markdown whitespace checks after sync or archive. Internal spacing and content after the Requirements section are unchanged.

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - Preserve the blank lines around a spec's `## Requirements` heading when syncing a delta. `openspec archive` rebuilt `openspec/specs/<capability>/spec.md` by joining its slices with a bare newline, so the blank lines that surround the heading were dropped and the resulting file failed Markdown whitespace checks. The rebuild now keeps that spacing intact. Fixes [#1625](https://github.com/Fission-AI/OpenSpec/issues/1625). Thanks [@jwang513](https://github.com/jwang513)! ([#1637](https://github.com/Fission-AI/OpenSpec/pull/1637))

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - `openspec validate --all` and `openspec list --json` no longer silently pass when run outside an OpenSpec project. From a directory with no root they used to resolve the current directory as an implicit root, exit 0, and report empty results — a false pass for CI and agents. Bulk validation (`--all`, `--changes`, `--specs`) and `list` now require an existing root (the `openspec/project.md` fallback for legacy projects is kept), while direct validation and other intentional implicit-root workflows are unchanged. Thanks [@clay-good](https://github.com/clay-good)! ([#1612](https://github.com/Fission-AI/OpenSpec/pull/1612))

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - Label the `update` workflow in the `openspec config` workflow picker. The checklist had friendly labels for 11 of the 12 workflows but was missing `update`, so that row — one of the six core workflows every user sees — fell back to its raw id with a placeholder description. The update-change template's stale "expanded-profile" wording is also reworded to "optional". Fixes [#1627](https://github.com/Fission-AI/OpenSpec/issues/1627). Thanks [@clay-good](https://github.com/clay-good)! ([#1632](https://github.com/Fission-AI/OpenSpec/pull/1632))

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - `openspec schema fork` now preserves the source schema's YAML formatting. Renaming a forked `schema.yaml` round-tripped through a parse/re-serialize step that dropped comments, could rewrite block-scalar style (a literal `|` folded to `>`), and reordered keys, so the fork no longer matched its source. The rename now edits the document in place via the YAML Document API, leaving comments, scalar style, and key order untouched. Thanks [@clay-good](https://github.com/clay-good)! ([#1607](https://github.com/Fission-AI/OpenSpec/pull/1607))

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - `openspec schemas` now resolves through the canonical OpenSpec root-selection precedence instead of always reading from the current directory. It accepts `--store <id>`, rejects `--store-path` like the other store-aware commands, and returns the shared machine-readable diagnostics on JSON failures, while preserving the existing human output and bare JSON array on success. Thanks [@Patodo](https://github.com/Patodo)! ([#1616](https://github.com/Fission-AI/OpenSpec/pull/1616))

- [#1640](https://github.com/Fission-AI/OpenSpec/pull/1640) [`610b78f`](https://github.com/Fission-AI/OpenSpec/commit/610b78f6554e8aabfa294df53962428ff85c8b76) Thanks [@clay-good](https://github.com/clay-good)! - `openspec validate` now warns on ambiguous task numbering in `spec-driven` changes: a task ID duplicated at full depth (including across resolved task files), or a task whose leading number disagrees with its enclosing `## N.` group. Numeric-looking text outside numbered groups is ignored, and custom schemas are unchanged until they opt in. The checks run across direct, bulk, and deprecated change validation. Closes [#1520](https://github.com/Fission-AI/OpenSpec/issues/1520). Thanks [@alectimison-maker](https://github.com/alectimison-maker)! ([#1523](https://github.com/Fission-AI/OpenSpec/pull/1523))

- [#1522](https://github.com/Fission-AI/OpenSpec/pull/1522) [`07dea6e`](https://github.com/Fission-AI/OpenSpec/commit/07dea6ed2faf71c8b9f4944d64246f2ff39eeffc) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Don't let a legacy Codex upgrade hijack the vendor-neutral `agents` target** — `openspec update` no longer overwrites an existing `.agents` skills tree (and its ownership marker) when Codex is detected only from leftover global `~/.codex/prompts`. Because Codex and the vendor-neutral `agents` target share `.agents/skills`, a project that used the `agents` target could have its generic skills silently rewritten with Codex-specific syntax and its target flipped to Codex on the next `update --force`. The legacy-upgrade path now respects the established owner of a shared skills directory, matching the one-writer rule `openspec init` already applies. When an upgrade is skipped this way, that tool's repo-local legacy files (e.g. `.codex/prompts/openspec-*.md`) are also preserved rather than cleaned up, since no replacement was written to take their place. A genuine first-time Codex upgrade (no `.agents` tree yet) is unaffected.

- [#1521](https://github.com/Fission-AI/OpenSpec/pull/1521) [`c751b3d`](https://github.com/Fission-AI/OpenSpec/commit/c751b3da52a7f06d6662a8673feff4685566cdd4) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Stop silently dropping unlabeled scenarios on archive** — `openspec validate` and `openspec archive` now recognize every level-4 (`####` followed by whitespace) child of a requirement as a scenario, matching how the spec is counted elsewhere. Before, the scenario-loss guard only recognized headers written exactly as `#### Scenario:`, so a `MODIFIED` requirement that dropped a differently-labeled child (for example `#### Edge case`) passed validation and was then permanently deleted by archive with no warning. Both paths now agree, so the loss is caught at authoring time. Scenario names are normalized when comparing (an optional `Scenario:` prefix and a CommonMark closing `#` run are ignored), so simply relabeling a scenario is not mistaken for dropping one.

- [#1610](https://github.com/Fission-AI/OpenSpec/pull/1610) [`17581c1`](https://github.com/Fission-AI/OpenSpec/commit/17581c11edf6b27ef18be7be1e4dcc06c81a3fff) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - `openspec init` now suggests an IDE restart only when an IDE-resident tool such as Cursor, GitHub Copilot, Continue, or Cline was configured. CLI tools like Claude Code, Codex, and Gemini CLI no longer show the hint, since their commands work as soon as the files exist.

- [#1609](https://github.com/Fission-AI/OpenSpec/pull/1609) [`804427b`](https://github.com/Fission-AI/OpenSpec/commit/804427b6ff3f3b35b542365ba8b32e183fce3287) Thanks [@clay-good](https://github.com/clay-good)! - Suppress the first-run telemetry disclosure notice when `--json` is used. On a
  first-ever run the notice was written to stdout and could break `--json`
  consumers; it is now deferred to the first later non-JSON run, keeping `--json`
  output valid while still guaranteeing the disclosure.

## 1.8.0

### Minor Changes

- [#1303](https://github.com/Fission-AI/OpenSpec/pull/1303) [`1aa0f2a`](https://github.com/Fission-AI/OpenSpec/commit/1aa0f2abfc19f2487f5b8566e6eb3bf15f41c20a) Thanks [@solanab](https://github.com/solanab)! - Add the vendor-neutral `agents` target: `openspec init --tools agents` installs the workflow skills to `.agents/skills/openspec-*/SKILL.md`, the shared location AGENTS.md-compatible assistants read. It is skills-only, so no slash commands are generated. Because `agents` is now a real target, `--tools all` includes it and creates `.agents/skills/` where it previously did not.

- [#1274](https://github.com/Fission-AI/OpenSpec/pull/1274) [`7a4a745`](https://github.com/Fission-AI/OpenSpec/commit/7a4a745d803b698c34947eda6d73b5a24aebb58c) Thanks [@NicoAvanzDev](https://github.com/NicoAvanzDev)! - Generate GitHub Copilot coding agent setup and custom agent files during `openspec init` and keep them synchronized during `openspec update`.

- [#1214](https://github.com/Fission-AI/OpenSpec/pull/1214) [`161f945`](https://github.com/Fission-AI/OpenSpec/commit/161f9454a372aab67c495d780928bba89c829f3e) Thanks [@showms](https://github.com/showms)! - Add MiniMax Code as a global skills-only tool target.

- [#1518](https://github.com/Fission-AI/OpenSpec/pull/1518) [`568e56c`](https://github.com/Fission-AI/OpenSpec/commit/568e56c67231dbe2447aca4f0e7995c05ada95a3) Thanks [@clay-good](https://github.com/clay-good)! - ### New Features

  - **Atlassian Rovo Dev CLI** — `openspec init --tools rovodev` installs the OpenSpec workflow skills for Atlassian's Rovo Dev CLI. It is skills-only (no slash commands), written to `.rovodev`.

  ### Bug Fixes

  - **Codex skills now live in the shared `.agents` directory** — `openspec init` and `openspec update` install Codex skills under `.agents/skills/` (the canonical location assistants read) and migrate an existing `.codex` skills directory in place. Files you customized are preserved, not overwritten.
  - **`openspec status` separates planning from implementation** — status now reports `isPlanningComplete` (every non-skipped planning artifact exists; skipped artifacts count as satisfied without being written) distinctly from overall progress, and its messages no longer imply a change is finished before it has been implemented. `isComplete` is kept as a compatibility alias, so existing scripts keep working.

- [#1517](https://github.com/Fission-AI/OpenSpec/pull/1517) [`73207a6`](https://github.com/Fission-AI/OpenSpec/commit/73207a6f2cd235729ac3fe3cb1e44152b8f63f12) Thanks [@clay-good](https://github.com/clay-good)! - Make GitHub Copilot cloud coding-agent files opt-in. Selecting the `github-copilot` tool no longer silently writes a GitHub Actions workflow into `.github/`; `openspec init` now asks first (default No) and remembers the choice in `openspec/config.yaml` (`githubCopilot.cloudAgent`). Use `--copilot-cloud` / `--no-copilot-cloud` to decide non-interactively.

  - `openspec update` never prompts — it only refreshes cloud files for projects that opted in (or that already have generated cloud files, so existing setups keep working).
  - Opting out (`--no-copilot-cloud` or `cloudAgent: false`) removes OpenSpec-managed cloud files; a user-customized file is always preserved, never overwritten or deleted.
  - `init` and `update` now report whether cloud files were written, skipped, or left untouched — and if you already have your own `copilot-setup-steps.yml`, they say it was preserved and that you need to add the OpenSpec install step by hand.

- [#1484](https://github.com/Fission-AI/OpenSpec/pull/1484) [`521ee33`](https://github.com/Fission-AI/OpenSpec/commit/521ee33e6ece269241b45e08017ee60f13fdef08) Thanks [@clay-good](https://github.com/clay-good)! - Retire a capability when a change removes its last requirement. A change that declares `retire_capabilities: true` in its `.openspec.yaml` (alongside the `schema:` that file requires) may now be archived even when its REMOVED entries take a capability's last requirement: `openspec archive` deletes that capability's main spec instead of aborting with "Spec must have at least one requirement". Without the marker nothing changes — the archive aborts exactly as before, except the message now names the marker as the way out. Retirement happens only when the emptied spec could not have been written at all, every one is named in the archive output, a pasteable `git checkout` is included when the spec lived in the caller's checkout, and `--no-validate` never retires. Archive now also rejects a main spec with duplicate canonical requirement names instead of letting delta reconciliation collapse one of the duplicate blocks. One thing to know before retiring: a capability's spec is the base another change's MODIFIED block is checked against, so an in-flight change that modifies the capability you just retired will keep validating clean and then refuse to archive ("target spec does not exist; only ADDED requirements are allowed for new specs") — close or rework that change alongside the retirement.

### Patch Changes

- [#1502](https://github.com/Fission-AI/OpenSpec/pull/1502) [`ece8660`](https://github.com/Fission-AI/OpenSpec/commit/ece8660d44bd19b86440376327752cda3d7b0717) Thanks [@clay-good](https://github.com/clay-good)! - `openspec validate` now treats the English `SHALL`/`MUST` convention as guidance in normal mode, so requirements written in other languages can validate. Strict mode continues to enforce the convention.

- [#1483](https://github.com/Fission-AI/OpenSpec/pull/1483) [`2b3d368`](https://github.com/Fission-AI/OpenSpec/commit/2b3d368539132be6311e55db58899abbf5306b81) Thanks [@clay-good](https://github.com/clay-good)! - Tell the caller which flag to pass when `openspec archive` cannot ask its confirmation questions. An AI agent (or any script) runs the CLI with stdin closed, so every prompt rejects with `@inquirer`'s `User force closed the prompt with 0 null` — the archive aborted with an error that named neither the question nor the flag, and agents burned a turn guessing ([#1479](https://github.com/Fission-AI/OpenSpec/issues/1479)). Each confirmation now reports what it needed and a pasteable rerun that carries the flags you already passed: `openspec archive <name> --skip-specs --yes` stays a `--skip-specs` run, so following the suggestion cannot merge specs you opted out of merging, and a change name that needs quoting gets double quotes, the one form bash, zsh, PowerShell and cmd.exe all read the same way (a name no shell reads literally even quoted — one containing `$`, a backtick, or the `%`/`!` that cmd.exe still expands inside quotes — is left as a `<change-name>` placeholder rather than a command that would target something else). `openspec archive` with no change name used to swallow the same failure, print `No change selected. Aborting.` and exit 0 — success for a run that archived nothing; it now exits 1 asking for a change name, matching how `openspec show` and `openspec validate` already behave without a terminal. The check is reactive — it inspects a prompt that already failed — so answers piped into the command, `--yes`, `--json`, and Ctrl-C all behave exactly as before, and a run that OpenSpec already considers non-interactive (`CI`, `OPEN_SPEC_INTERACTIVE=0`, `--no-interactive`) gets the guidance even when the runner allocated a pty. The onboarding walkthrough, the only generated guidance that tells an agent to run `openspec archive`, now shows `--yes`.

- [#1486](https://github.com/Fission-AI/OpenSpec/pull/1486) [`427abf4`](https://github.com/Fission-AI/OpenSpec/commit/427abf40ac45a9a44f78eb74c81f53f9f4197ccf) Thanks [@clay-good](https://github.com/clay-good)! - Task progress now counts indented sub-tasks. A `tasks.md` whose sub-tasks were unfinished reported `✓ Complete` in `openspec list` and `openspec view`, was missing those tasks from the `openspec instructions apply` list, and archived with no incomplete-task warning, because both checkbox parsers only matched checkboxes at column 0.

  Progress counting and the apply task list now share one parser, so `list`, `view`, `archive` and `apply` agree about which lines of a tasks file are tasks. A checkbox with no text after it is left out of the apply list, which has nothing to act on, but still counts toward every progress number; a file of nothing but such checkboxes now asks to be rewritten rather than reporting itself done. The shared pattern matches every line the two it replaced matched, and more, so task counts can rise but never fall: no change starts reporting less work than before, and archive's incomplete-task warning can only become stricter. Checkboxes are still counted wherever they appear, including inside a code fence, an HTML comment or an indented block, so a `tasks.md` that shows a checklist as a format example can now count that example as work — remove it from the file, or pass `--yes` to archive.

- [#1500](https://github.com/Fission-AI/OpenSpec/pull/1500) [`26bd1d4`](https://github.com/Fission-AI/OpenSpec/commit/26bd1d4e5c6c6ba75bd7d6136424019b2bf89ced) Thanks [@clay-good](https://github.com/clay-good)! - Keep generated workflows on the selected store, handle optional workflow fallbacks safely, and validate synced specs before reporting success.

- [#1490](https://github.com/Fission-AI/OpenSpec/pull/1490) [`45cca5d`](https://github.com/Fission-AI/OpenSpec/commit/45cca5db6137ed209117cc70510eb3e057fb981b) Thanks [@clay-good](https://github.com/clay-good)! - Say before confirmation when archiving a change will delete a note written next to a requirement. A requirement absorbs anything below it that OpenSpec doesn't recognize as a new heading — a note indented by the one to three spaces Markdown allows, for example — so removing or modifying that requirement took the note with it, silently. `openspec archive` now names content the rebuilt spec would actually drop and where to move it to keep it. The merge itself is unchanged: nothing is relocated, because a `#` line inside a scenario looks identical to a note and moving one of those would rewrite the spec wrongly.

- [#1492](https://github.com/Fission-AI/OpenSpec/pull/1492) [`690a27e`](https://github.com/Fission-AI/OpenSpec/commit/690a27e649c4a3325daeb0f6667ebe0f82792179) Thanks [@mc856](https://github.com/mc856)! - `openspec init` and `openspec update` no longer delete the CoStrict and Junie command files they just generated. Legacy cleanup removes artifacts older OpenSpec versions left behind, and two of its patterns named paths the current adapters still write to. CoStrict's was a whole-directory removal of `.cospec/openspec/commands/`, the folder the adapter writes `opsx-<id>.md` into, so every run wiped the directory — including any file the user kept there — while the banner above it read `No user content to preserve`. Junie's `.junie/commands/opsx-*.md` listed its own current output. Cleanup runs before the config migration, so on a config that has no `profile` key yet the missing command files make delivery detection read the project as skills-only and persist that to the global config: the files are not regenerated, and the preference changes for every other project too.

  CoStrict is now a file pattern, `.cospec/openspec/commands/openspec-*.md`, matching the three commands the pre-`opsx` CoStrict integration wrote there (`openspec-proposal.md`, `openspec-apply.md`, `openspec-archive.md`) and the same shape every other file-based tool already uses. Junie's entry is removed outright: Junie support arrived after the slash configurators that wrote `openspec-*` files were deleted, so no OpenSpec version ever created those files there. Genuinely legacy files are still detected and removed, and no other tool's patterns change — they never overlapped their adapter's current output.

- [#1501](https://github.com/Fission-AI/OpenSpec/pull/1501) [`0b20ae3`](https://github.com/Fission-AI/OpenSpec/commit/0b20ae3964283bdcb4e34ea7380770857f6a339c) Thanks [@clay-good](https://github.com/clay-good)! - Keep the propose workflow focused on planning, clarify material ambiguities before creating a change, and hand implementation off to the apply workflow.

- [#1503](https://github.com/Fission-AI/OpenSpec/pull/1503) [`8a3850d`](https://github.com/Fission-AI/OpenSpec/commit/8a3850da735e241c14ad94935463f879b33f21a9) Thanks [@clay-good](https://github.com/clay-good)! - When exploration turns into a new change, generated explore guidance now instructs agents to run `openspec new change` before writing requested artifacts. This preserves the required `.openspec.yaml` metadata instead of letting an agent create an incomplete change directory by hand. After the user accepts a capture, explore also creates the requested artifacts without requiring another workflow command.

- [#1513](https://github.com/Fission-AI/OpenSpec/pull/1513) [`622c509`](https://github.com/Fission-AI/OpenSpec/commit/622c509a1349c3ad9c52cd1a4ee007bd47549204) Thanks [@FasterPHP](https://github.com/FasterPHP)! - Honor `telemetry.enabled` in global config. `false` disables anonymous telemetry and `openspec update` version checks; unset keeps telemetry enabled, and env/CI opt-outs still take precedence.

- [#1499](https://github.com/Fission-AI/OpenSpec/pull/1499) [`9cd845f`](https://github.com/Fission-AI/OpenSpec/commit/9cd845fc459b71486d9f2424c2e1f38e2ca8766e) Thanks [@clay-good](https://github.com/clay-good)! - Keep generated files, specs, archive moves, and local state inside their intended security boundaries without breaking linked monorepo workflows.

- [#1482](https://github.com/Fission-AI/OpenSpec/pull/1482) [`84ebc57`](https://github.com/Fission-AI/OpenSpec/commit/84ebc57cb3f0e91b93484484092fdc2f9fcf39e6) Thanks [@clay-good](https://github.com/clay-good)! - `openspec validate <change>` now reports a MODIFIED requirement that omits a scenario the main spec still has — the same loss archive already refuses to apply — so the change fails at authoring time instead of at archive time. A change carrying a stale MODIFIED block will start failing validation; it was already unarchivable, and the message names the scenarios to copy back in.

## 1.7.0

### Minor Changes

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Add CodeArts Agent skills support: `openspec init --tools codeartsagent` installs the workflow skills.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Add Hermes Agent as a supported AI tool: `openspec init --tools hermes` installs the workflow skills (Hermes is skills-only and invokes them directly).

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Add ZCode as a supported AI tool: `openspec init --tools zcode` generates its skills and `/opsx:*` commands.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Codex is now skills-only: workflows install as `$openspec-*` skills and previously managed custom prompts are retired (existing ones are cleaned up on update).

- [#1062](https://github.com/Fission-AI/OpenSpec/pull/1062) [`eac2973`](https://github.com/Fission-AI/OpenSpec/commit/eac2973819037727b10214f70db2f54d82f2d891) Thanks [@showms](https://github.com/showms)! - Add current project context and per-operation guidance to apply and archive workflows. Projects can configure `operations.apply.guidance` and `operations.archive.guidance`; `openspec instructions apply` returns apply inputs, and the new read-only `openspec instructions archive` surface returns archive inputs for the selected root.

  Archive, bulk archive, and sync skills now load current archive inputs and `specs` artifact rules at execution time, fail before writes or moves when required instruction lookups fail, and reuse specs-rule snapshots during inline sync.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Publish the workflow skills as static `skills/<name>/SKILL.md` files so `npx skills add Fission-AI/OpenSpec` works.

- [#1399](https://github.com/Fission-AI/OpenSpec/pull/1399) [`27b22ab`](https://github.com/Fission-AI/OpenSpec/commit/27b22ab4cbf530fa00e17f0f6b75a44d56777542) Thanks [@clay-good](https://github.com/clay-good)! - Add `skip_specs: true` change metadata for work with no spec-level behavior change (pure refactors, tooling, docs). `openspec validate` accepts a zero-delta change that declares the marker (honored only when the metadata parses under the shared change-metadata schema and names a schema that loads) and errors when the marker and delta specs are both present, the artifact graph no longer blocks `tasks` on spec files for such changes, `openspec status` renders the specs stage as explicitly skipped, and the propose/specs guidance points to the marker instead of contradicting the validator.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Resolve symlinked schema directories so schemas shared via symlink (e.g. from a dotfiles repo) are discovered.

- [#1470](https://github.com/Fission-AI/OpenSpec/pull/1470) [`6295515`](https://github.com/Fission-AI/OpenSpec/commit/6295515d4da4f7c76eaed00b7f1926771eae92de) Thanks [@clay-good](https://github.com/clay-good)! - `openspec update` now offers to upgrade the CLI when yours is behind the published one. Instruction files are generated by the installed CLI, so a stale install reported `✓ All 1 tool(s) up to date (v1.6.0)` while the workflows added in newer releases were never written:

  ```text
  A newer OpenSpec CLI is available (v1.6.0 → v1.7.0).
    Running from: /usr/local/lib/node_modules/@fission-ai/openspec
  ? Upgrade to v1.7.0 now? (Y/n)
  ```

  Say yes and it upgrades, confirms the new version is the one that answers, then re-runs the update so the new workflows arrive in the same command. Say no and it prints the command matching how you installed OpenSpec, and updates with what you have. Nothing happens to your machine that you did not agree to: the offer appears only in an interactive terminal and only where `npm install -g` would help, and the check is skipped in CI or when `OPENSPEC_NO_UPDATE_CHECK`, `DO_NOT_TRACK=1`, or `OPENSPEC_TELEMETRY=0` is set.

  See [CLI reference → `openspec update`](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md#openspec-update) for the per-install-method behavior and every opt-out.

### Patch Changes

- [#1404](https://github.com/Fission-AI/OpenSpec/pull/1404) [`a84ae70`](https://github.com/Fission-AI/OpenSpec/commit/a84ae70e8c6ef6ffaab56599d6f91fa39873e63d) Thanks [@clay-good](https://github.com/clay-good)! - Generated skills for tools without a command adapter (Kimi Code, Mistral Vibe, Hermes, ForgeCode, CodeArts) no longer reference `/opsx:*` commands that were never generated: skill cross-references, the init getting-started hint, and the profile-migration message now use each tool's documented skill invocation (Kimi Code: `/skill:openspec-*`; others: `/openspec-*`), and Codex — skills-invocable with no slash surface — gets a syntax-neutral hint that names the skill. Selections that mix invocation syntaxes print one labeled hint per distinct form, so every advertised instruction is usable by the tool it names. When `delivery: commands` would generate nothing for a selected tool, init prints a configuration correction naming that tool, even when other tools did get commands or skills. The committed skills.sh distribution is regenerated with skill references (default `/openspec-*` form, as that channel installs skills only).

- [#1363](https://github.com/Fission-AI/OpenSpec/pull/1363) [`5199f41`](https://github.com/Fission-AI/OpenSpec/commit/5199f41a5d523b9212dd2854ec5e505d2f80e2e7) Thanks [@clay-good](https://github.com/clay-good)! - ### Features

  - **One default store for every repo on your machine** — `openspec config set defaultStore <id>` sets a machine-level fallback root: any command run outside a planning root, with no `--store` flag and no project `store:` pointer, resolves to that store. It sits at the bottom of the precedence list, so `--store`, a local root, and a project pointer all still win. The root banner and JSON `root` block report the distinct provenance `source: "global_default"`, so users and tooling can tell a machine-wide default from a repo's own pointer. A stale id degrades to the underlying store error with a fix that names `openspec config unset defaultStore`.

- [#1435](https://github.com/Fission-AI/OpenSpec/pull/1435) [`6a5171e`](https://github.com/Fission-AI/OpenSpec/commit/6a5171e18630db4ed8e78c9edfaae4be532e2af6) Thanks [@clay-good](https://github.com/clay-good)! - `openspec new change` now accepts numeric-prefixed names like `100-add-feature` or `00001-add-auth`, useful for ordering or tiering changes. Change names now use the same kebab-case grammar as store ids and change metadata (a leading digit is allowed); `archive` already treated date-prefixed names as a supported convention. Uppercase, spaces, underscores, and leading/trailing or consecutive hyphens are still rejected, and every previously valid name stays valid.

- [#1425](https://github.com/Fission-AI/OpenSpec/pull/1425) [`040a869`](https://github.com/Fission-AI/OpenSpec/commit/040a86931f5398167137a483b2e8081aec13016e) Thanks [@clay-good](https://github.com/clay-good)! - Compare config key guards literally instead of through a helper.

  `setNestedValue` and `deleteNestedValue` rejected prototype-reaching key segments through a helper that did a `Set` lookup. That is correct, but static analysis could not follow it, so CodeQL kept reporting prototype-pollution on the very assignments the guard protects. The segments are now compared literally in the same function, still checked across the whole path before anything is written. Behavior is unchanged for every input, verified against the previous implementation across 400,000 generated cases.

- [#1431](https://github.com/Fission-AI/OpenSpec/pull/1431) [`6a4f0d7`](https://github.com/Fission-AI/OpenSpec/commit/6a4f0d7f3384486132cb9c516b635c23cadc1fa2) Thanks [@clay-good](https://github.com/clay-good)! - A delta spec that introduces a brand-new capability can now open with a `## Purpose`, and `openspec archive` uses it as the Purpose of the main spec it creates instead of writing the `TBD - created by archiving change <name>. Update Purpose after archive.` placeholder over it. The `specs` artifact instruction, its example, the delta template and the `openspec-sync-specs` skill all tell authors and agents to write one, so the CLI and agent-driven sync paths produce the same main spec.

  Archive keeps the placeholder when the delta has no usable `## Purpose`:

  - no `## Purpose` header outside a code fence or HTML comment, or a body that is only a code fence or only a comment
  - a body that would leave a spec its own parser cannot read — a heading or requirement header that truncates a section, an unterminated fence, or any HTML comment
  - in the second case archive also says why, and still completes rather than aborting

  A carried Purpose under 50 characters is kept but warned about, since `openspec validate --strict` reports it as too brief. The Purpose of an existing main spec is never touched; archive warns when it ignores a delta's Purpose there.

- [#1437](https://github.com/Fission-AI/OpenSpec/pull/1437) [`19d4171`](https://github.com/Fission-AI/OpenSpec/commit/19d41714c8b790488732687443713e406ef5aeef) Thanks [@clay-good](https://github.com/clay-good)! - `openspec archive` no longer aborts when a REMOVED delta's requirement is already gone from the main spec (the early-sync pattern the sync skill teaches): it warns, treats the removal as already applied, and reports applied-only totals. In `--json` mode those warnings are carried in a new optional `warnings` array on the archive result. When every operation for a spec was already synced, archive skips rewriting that file instead of churning normalization differences into it. A delta that both RENAMEs and REMOVEs the same requirement is now rejected explicitly, by both `validate` and `archive` — the two spellings are compared case- and whitespace-insensitively — and a REMOVED header that differs only in case or whitespace from an existing requirement still aborts (that is a typo, not an early sync). Also fixed: the archive delta gate matches section headers case-insensitively like the parser; symlinked `specs/<capability>/spec.md` files are discovered instead of silently dropped; `openspec show <change>` no longer prints a spurious "scenarios" flag warning; files generated for qwen and bob reference commands by their real hyphenated names (`/opsx-<id>`), and init's getting-started hint follows suit; apply/update/onboard guidance names the CLI fallback for profiles that don't install `/opsx:continue` or `/opsx:new`.

- [#1411](https://github.com/Fission-AI/OpenSpec/pull/1411) [`c439a4e`](https://github.com/Fission-AI/OpenSpec/commit/c439a4ee48ef02dcdae6ac8101b7d12924695e7e) Thanks [@clay-good](https://github.com/clay-good)! - Fix phantom requirements parsed from delta specs, which made `openspec archive` warn about problems `openspec validate` never reported.

  A header inside a delta section that is not a `### Requirement:` header — a divider such as `### Documentation Requirements` — was read as a requirement with no scenario. `openspec archive` warned that it was missing a scenario, and `openspec show <change> --json` and `openspec change list` counted it as an extra delta. The change parser now ignores those headers, matching the delta reader, so the phantom is gone from the warnings and from the JSON. Main spec parsing is unchanged.

  `openspec archive` also no longer repeats requirement-level issues from the delta specs in its non-blocking "Proposal warnings in proposal.md" block. Each defect was printed twice there, and a `## REMOVED Requirements` entry — names-only by design — was reported as missing a scenario on every correct removal. Delta spec validation still reports and blocks on genuine defects, and proposal-level warnings are unchanged.

- [#1394](https://github.com/Fission-AI/OpenSpec/pull/1394) [`b474f81`](https://github.com/Fission-AI/OpenSpec/commit/b474f81cb4bebbeff0e447fd78c34a613ebd02fa) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Archive no longer races the spec sync, or reports a sync that never landed** — the generated `openspec-archive-change` skill (and the matching `opsx:archive` command) handed the spec sync to a background task and then moved the change folder immediately. The archive could move the delta specs out from under the running sync: the change ended up archived, `openspec/specs/` was never updated, and the summary still reported `Specs: ✓ Synced`. The sync now runs inline, and the archive only proceeds once every capability with a delta spec has been checked against it — ADDED present, MODIFIED changes applied, REMOVED gone, RENAMED under the new name and not the old. If the sync fails or a capability doesn't match, the archive stops and reports what differs instead of claiming success; nothing has moved, so you can fix it and retry.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Apply profile changes with the installed CLI instead of shelling out to `npx`, which could run a different version.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Delta and main-spec parsers strip a UTF-8 BOM, so files saved by Windows editors or PowerShell redirects no longer fail with "No delta sections found".

- [#1398](https://github.com/Fission-AI/OpenSpec/pull/1398) [`97d441a`](https://github.com/Fission-AI/OpenSpec/commit/97d441a8ee2738d3008709e61acfc91925c7ae3a) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Bulk archive now stops when you pick "Cancel"** — the generated `openspec-bulk-archive-change` skill (and the matching `opsx:bulk-archive` command) offered a "Cancel" option at the confirmation prompt but never told the agent what to do with it, so the next step archived every selected change anyway. The prompt now routes each answer by intent: "Cancel" stops without archiving anything, the archive options proceed (the ready-only option archives just the changes the status table marks `Ready` or `Ready*`), and any other answer re-asks instead of archiving. The single-change archive skill already routes Cancel this way; this brings the bulk variant in line.

- [#1375](https://github.com/Fission-AI/OpenSpec/pull/1375) [`52a8bce`](https://github.com/Fission-AI/OpenSpec/commit/52a8bce1fd2bc98c51fa35cf0cfa05e799eb4404) Thanks [@clay-good](https://github.com/clay-good)! - `--change` now accepts any change name that exists on disk (e.g. date-prefixed names like `2026-07-04-voice-copilot-v1`), matching what `list`, `validate`, and `archive` already resolve. Lookup still rejects unsafe names (path separators, `..`, hidden entries); the kebab-case naming rule still applies when creating a change.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec new change` rejects names over 200 characters with a validation message instead of surfacing a raw ENAMETOOLONG filesystem error.

- [#1447](https://github.com/Fission-AI/OpenSpec/pull/1447) [`fb19699`](https://github.com/Fission-AI/OpenSpec/commit/fb196995dad017074415a638824eb546f3321cbc) Thanks [@hsusul](https://github.com/hsusul)! - Generated tool command files now carry valid YAML frontmatter for every supported tool. Command names ship as `OPSX: Explore`, and the unquoted `name: OPSX: Explore` that adapters emitted is not parseable YAML — strict parsers rejected the whole file, so the command failed to load. Several adapters also re-implemented their own escaping, and a few interpolated descriptions in raw.

  Escaping now lives in one place (`escapeYamlValue` / `formatTagsArray`) and every adapter uses it. String frontmatter values are always double-quoted, which also keeps values like `true`, `null` and `123` from round-tripping as booleans, nulls and numbers. Non-string fields such as `allowed-tools` and `invokable` are unchanged. Expect the first `openspec update` after upgrading to rewrite the frontmatter lines of your generated command files.

  Archive workflow guidance also gets two corrections: bulk archive now carries its per-delta include/exclude decisions into execution, so a delta whose implementation was not found is reported as `sync skipped` instead of being synced anyway, and both archive workflows verify the main specs before moving the change directory.

- [#1471](https://github.com/Fission-AI/OpenSpec/pull/1471) [`9a937cb`](https://github.com/Fission-AI/OpenSpec/commit/9a937cb9b36fb1040bdbde3bab3fa3903944ef10) Thanks [@clay-good](https://github.com/clay-good)! - Reference slash commands by the name each tool actually registers. Command bodies, generated `SKILL.md` cross-references, and the `init`/`update`/migration hints all advertised `/opsx:<id>`, but only 7 of the 28 tools with a command adapter register that name — the ones whose files sit in an `opsx/` directory. The other 21 write `.../opsx-<id>.md`, where the filename is the command, so tools such as Cursor, GitHub Copilot, Windsurf and Kilo Code were told to type a command their palette never had; a single generated Cursor file named itself `/opsx-apply` in frontmatter and then told the reader to run `/opsx:apply`. The command _name_ is now derived from the command file each adapter writes rather than a hand-maintained tool list, so a newly added adapter cannot drift, and the _wrapper_ around it is adapter metadata: Amazon Q loads its files into a prompt library invoked with `@`, so it now gets `@opsx-<id>` in command bodies, skills, and the onboarding hint instead of a slash command it never registers. Codex, which generates no command files at all, now gets `$openspec-<skill>` — the syntax its CLI actually accepts — everywhere it previously advertised `/opsx:*`, superseding the syntax-neutral hint described in the pending `adapterless-skill-references` note. Command filenames and paths are unchanged, and Claude Code output is byte-identical.

- [#1364](https://github.com/Fission-AI/OpenSpec/pull/1364) [`f58b445`](https://github.com/Fission-AI/OpenSpec/commit/f58b4456925b6331f3e5902a1c57905afe7edbf5) Thanks [@clay-good](https://github.com/clay-good)! - Fix `openspec completion install` detecting the wrong shell for fish (and other)
  users whose interactive shell differs from their login shell. Detection now
  consults the parent process before falling back to `$SHELL`, so running the
  command from fish installs fish completions instead of defaulting to bash.

- [#1377](https://github.com/Fission-AI/OpenSpec/pull/1377) [`285dfd7`](https://github.com/Fission-AI/OpenSpec/commit/285dfd7d764752b2a1e7e8cc843d613421e62652) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - Config `rules:` keys are no longer reported as `Unknown artifact ID` when they belong to a different schema. The global rules map is now validated against the union of artifact IDs across every available schema, so multi-schema projects stop seeing spurious warnings on every command ([#1322](https://github.com/Fission-AI/OpenSpec/issues/1322)).

- [#1401](https://github.com/Fission-AI/OpenSpec/pull/1401) [`b33b15d`](https://github.com/Fission-AI/OpenSpec/commit/b33b15d98ae929624c991632c7382ebc234d4ca7) Thanks [@clay-good](https://github.com/clay-good)! - Stop `design.md` from restating the proposal. In the default `spec-driven` schema, the design instruction asked for "Background, current state, constraints, stakeholders" and "What this design achieves and excludes" without saying that motivation and scope already live in `proposal.md`, so agents restated the proposal's Why and What Changes instead of adding the design's own value - approach, alternatives, and trade-offs. The instruction and the design template now state the boundary explicitly (the proposal covers why and what, design covers how) and tell the agent to reference those documents rather than repeat them ([#1382](https://github.com/Fission-AI/OpenSpec/issues/1382)).

- [#1167](https://github.com/Fission-AI/OpenSpec/pull/1167) [`1637856`](https://github.com/Fission-AI/OpenSpec/commit/1637856c423f2e84457652d1ab58885fe9744fb2) Thanks [@mehdishahdoost](https://github.com/mehdishahdoost)! - **Windsurf is now Devin Desktop.** Windsurf was rebranded on June 2, 2026 and its config directory moved: `.devin/` is the preferred read + write location, `.windsurf/` a legacy read-only fallback that the Devin Local agent does not read at all. OpenSpec follows the rename rather than carrying two ids for one product — the tool id is `devin`, writing `.devin/workflows/opsx-<id>.md` and `.devin/skills/openspec-*/SKILL.md`, and it is detected from either directory.

  - `--tools windsurf` still resolves, so existing setup scripts keep working; it now configures `.devin/`.
  - If your OpenSpec files are still in `.windsurf/`, `openspec update` explains the rebrand and offers to move them. `--force` and non-interactive runs take the move; declining leaves every file exactly where it is. Only the files OpenSpec generates move — each skill's `SKILL.md` and commands named `opsx-*`. A hand-written Cascade workflow, a reference file you keep beside a `SKILL.md`, a command file you edited, and `.devin/rules/` all stay exactly where they are.
  - Devin skills and the getting-started hint reference `/openspec-*` skills rather than `/opsx-*` workflows, because only Devin Desktop reads workflows; the `/openspec-*` form works on both agents. Workflow bodies still use `/opsx-<id>`, the name Devin registers for a workflow file.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec doctor` now notes when a store checkout is behind its upstream ref.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Make the archive scenario-drift check multiplicity-aware: a MODIFIED block that keeps only one of two same-named scenarios no longer silently drops the other.

- [#1408](https://github.com/Fission-AI/OpenSpec/pull/1408) [`378d468`](https://github.com/Fission-AI/OpenSpec/commit/378d468ad348dc1e973ed30c5cfa458fb77c9de3) Thanks [@clay-good](https://github.com/clay-good)! - Explore now reads the project's context and rules from `openspec/config.yaml` (or `config.yml`) at the start of a session, so it reasons with the same tech stack and conventions the artifact-creating workflows already receive.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec feedback` shows the formatted text and a pre-filled submission URL on any gh failure (issues disabled, network, rate limit), not only when gh is missing or unauthenticated.

- [#1396](https://github.com/Fission-AI/OpenSpec/pull/1396) [`60f720c`](https://github.com/Fission-AI/OpenSpec/commit/60f720c43acd94de7645ac8629c614ede4682b6a) Thanks [@clay-good](https://github.com/clay-good)! - Fix `openspec feedback` failing when the repository does not define the `feedback` label. The command now retries without the label and notes that it was not applied, instead of exiting with an error and discarding the feedback.

- [#1151](https://github.com/Fission-AI/OpenSpec/pull/1151) [`18cbf5d`](https://github.com/Fission-AI/OpenSpec/commit/18cbf5d32ffe1bff4fff692e24568c605cf1e0fa) Thanks [@javigomez](https://github.com/javigomez)! - ### Fixed

  - Ignore Markdown structure (requirement headers, delta sections, scenarios, REMOVED/RENAMED entries) that appears inside fenced code blocks when parsing delta specs. Previously a fenced `### Requirement:` example was parsed as a real (phantom) requirement, producing spurious `validate` errors and risking incorrect `archive` output. Fenced-code detection is now shared across the Markdown parsers so `validate` and `archive` behave consistently.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - The archive scenario-drift check now ignores `#### Scenario:` lines inside fenced code blocks, matching validate: a fenced example no longer false-aborts an archive, and a fenced name no longer masks a genuinely dropped scenario.

- [#1316](https://github.com/Fission-AI/OpenSpec/pull/1316) [`9b70481`](https://github.com/Fission-AI/OpenSpec/commit/9b70481df727ab9f7a00dd0118e4e09373a36fb9) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **`archive` no longer stacks a second date prefix** — archiving a change whose name already starts with a `YYYY-MM-DD-` prefix (a common authoring convention) keeps the name as-is instead of prepending today's date. Previously `openspec archive 2026-07-04-voice-copilot-v1 --yes` produced `2026-07-06-2026-07-04-voice-copilot-v1`, and when run on a later day the folder sorted under a day on which the change did not happen. Names without a full date prefix (including partial dates like `2026-07-feature`) are dated as before, and the naming is now idempotent.

- [#1374](https://github.com/Fission-AI/OpenSpec/pull/1374) [`da3907b`](https://github.com/Fission-AI/OpenSpec/commit/da3907b8a9170711c8b7f63e18352e8577cf7df5) Thanks [@clay-good](https://github.com/clay-good)! - fix(completion): make the PowerShell completion script parse and load again

  The generated `OpenSpecCompletion.ps1` contained 18 empty `switch ($positionalIndex) { }` blocks — emitted for commands whose positionals are all `path`-typed (PowerShell completes paths natively, so those cases produce no clauses). A switch with no clauses is a PowerShell parse error ("Missing condition in switch statement clause"), and PowerShell parses the whole file before running it, so the script never loaded and completions never registered. The generator now skips the positional-index block entirely when no positional produces completions, so the script parses clean (18 → 0 errors) and tab completion works.

- [#1388](https://github.com/Fission-AI/OpenSpec/pull/1388) [`9b5d2cd`](https://github.com/Fission-AI/OpenSpec/commit/9b5d2cdd0c1aa4b1b49da4f95c6cec8d7d38b155) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **Archive workflow templates no longer teach agents to stack a second date prefix** — the `openspec-archive-change` and `openspec-bulk-archive-change` skill/command templates (and the onboarding walkthrough's archived-path example) now mirror the `openspec archive` rule: a change whose name already starts with a `YYYY-MM-DD-` prefix is archived under its own name, while other names get the current date prepended as before. Previously an agent following the workflow instructions on a change named `2026-07-04-voice-copilot-v1` produced `archive/2026-07-07-2026-07-04-voice-copilot-v1`, whatever the CLI did.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Gemini command files escape TOML-active characters (quotes, backslashes, control characters) in the description and prompt, so a template value containing them can no longer produce an invalid `.toml` file.

- [#1464](https://github.com/Fission-AI/OpenSpec/pull/1464) [`5bcf057`](https://github.com/Fission-AI/OpenSpec/commit/5bcf05766a70ec0163c3e700a3029b1c1da895d8) Thanks [@clay-good](https://github.com/clay-good)! - Workflow skills and commands no longer tell agents to use the Claude Code-only AskUserQuestion tool. The same templates are generated for every supported tool, and agents without that tool (OpenCode, Factory Droid, Codex, and others) errored or stalled on the instruction. The guidance is now runtime-neutral: agents are simply told to ask the user.

- [#1403](https://github.com/Fission-AI/OpenSpec/pull/1403) [`2d6c447`](https://github.com/Fission-AI/OpenSpec/commit/2d6c447100c51fb1e5f65c6f6a35ce02a3196a10) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Propose and fast-forward skills no longer name the Claude-only TodoWrite tool** — the generated `openspec-propose` and `openspec-ff-change` skills (and their `/opsx:propose` / `/opsx:ff` commands) told every agent to "Use the **TodoWrite tool**", which only exists in Claude Code. Codex, Cursor, Gemini, Copilot, and the other supported tools have no such tool, so agents either errored or stalled looking for it. The instruction is now runtime-neutral ("Use a todo list to track progress"), which works everywhere — including Claude Code.

- [#1415](https://github.com/Fission-AI/OpenSpec/pull/1415) [`e2f748c`](https://github.com/Fission-AI/OpenSpec/commit/e2f748c64f05efaeac720f83c71fb6f1b6f6e18d) Thanks [@clay-good](https://github.com/clay-good)! - Reject config key paths that reach the prototype chain, and update the bundled `yaml` dependency.

  `openspec config set --allow-unknown __proto__.polluted <value>` reported success and assigned onto `Object.prototype` for the rest of the process. `--allow-unknown` was meant to relax the known-key check only, but it skipped every key check, so `__proto__`, `constructor`, and `prototype` segments reached the nested-write helper. Those segments are now rejected in `config set` whether or not `--allow-unknown` is passed, and `setNestedValue` / `deleteNestedValue` refuse them regardless of caller. Ordinary keys such as `featureFlags.myFlag` behave exactly as before.

  The `yaml` runtime dependency moves from 2.8.2 to 2.9.0, picking up the fix for a stack overflow on deeply nested input (GHSA / advisory patched in 2.8.3).

- [#1376](https://github.com/Fission-AI/OpenSpec/pull/1376) [`7958924`](https://github.com/Fission-AI/OpenSpec/commit/7958924e95654af981437951e967983385da8001) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Archive after early sync** — `openspec archive` no longer fails with `ADDED failed … already exists` when a change's specs were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If an ADDED requirement already exists in the target spec with identical content, applying it is treated as a no-op; a same-named requirement with different content still aborts the archive as a genuine conflict ([#1332](https://github.com/Fission-AI/OpenSpec/issues/1332)).

- [#1386](https://github.com/Fission-AI/OpenSpec/pull/1386) [`b419e96`](https://github.com/Fission-AI/OpenSpec/commit/b419e965bbf413cc658bbac37325ebc147b1c869) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **Archive after early sync (RENAMED)** — `openspec archive` no longer fails with `RENAMED failed … source not found` when a change's renames were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If a RENAMED requirement's source header is gone but the target header exists in the spec, applying the rename is treated as a no-op; a rename whose source and target are both missing still aborts the archive as a genuine error, and reported counts reflect only renames actually applied.

- [#1462](https://github.com/Fission-AI/OpenSpec/pull/1462) [`ebf66c7`](https://github.com/Fission-AI/OpenSpec/commit/ebf66c7ee1df3f7465d7f480753f952483133a73) Thanks [@clay-good](https://github.com/clay-good)! - Respect reduced-motion preferences in `openspec init`: the welcome animation is skipped when the OS reduced-motion setting is on (macOS Reduce Motion, GNOME animations disabled), when `OPENSPEC_NO_ANIMATION` is set, or when the new `--no-animation` flag is passed. The static welcome screen is shown instead.

- [#1405](https://github.com/Fission-AI/OpenSpec/pull/1405) [`5dfef4b`](https://github.com/Fission-AI/OpenSpec/commit/5dfef4b00c233fbe78f40488bd4ff98f4204684c) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Custom schema instructions are no longer overridden by hard-coded spec-driven patterns** — the `openspec-continue-change` skill/command embedded one-line "common artifact patterns" for proposal.md, specs, design.md, and tasks.md, so agents followed those shortcuts instead of the schema's `instruction` field whenever a custom schema reused familiar artifact names. The templates now state that the `instruction` field is the authoritative guidance, and the `propose`, `continue`, and `ff` workflows direct the agent — both in the artifact-creation step and in the guidelines — to invoke a skill when the instruction delegates artifact creation to one, verifying the artifact exists afterward (fixes [#777](https://github.com/Fission-AI/OpenSpec/issues/777)).

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Follow the Kimi CLI rename to Kimi Code: new install paths with automatic migration of existing `.kimi` setups.

- [#1415](https://github.com/Fission-AI/OpenSpec/pull/1415) [`e2f748c`](https://github.com/Fission-AI/OpenSpec/commit/e2f748c64f05efaeac720f83c71fb6f1b6f6e18d) Thanks [@clay-good](https://github.com/clay-good)! - Parse spec headings in linear time when the title is padded with whitespace.

  Building the reference index read the first Purpose line with a regex that backtracked quadratically on a heading full of spaces: 10,000 characters of padding took 60ms, and 100,000 would have taken roughly six seconds. The heading scan is now hand-rolled and linear. Behavior is unchanged — the replacement was checked against the old implementation across 303,000 generated inputs, including CommonMark closing sequences (`## Purpose ##`), seven-hash lines, and headings with no space after the hashes.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Use local dates for CLI date-only values (archive names, timestamps) instead of UTC, so late-evening archives no longer get tomorrow's date.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec update` warns when a custom profile is missing core workflows instead of silently generating a partial install.

- [#1428](https://github.com/Fission-AI/OpenSpec/pull/1428) [`81d5109`](https://github.com/Fission-AI/OpenSpec/commit/81d5109b86f16537deb99f84a772a83235dc9e09) Thanks [@taltas](https://github.com/taltas)! - Update current Roo Code product references to its community successor, Zoo Code.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Archive treats a MODIFIED delta whose content already matches the main spec as a no-op: a fully early-synced change now reports "Specs already in sync" instead of rewriting the file and claiming modifications.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Render multi-select prompts with `[x]`/`[ ]` checkbox markers instead of radio-button icons.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Discover nested spec paths like `specs/<area>/<capability>/spec.md` recursively and consistently across parse, apply, and archive.

- [#1410](https://github.com/Fission-AI/OpenSpec/pull/1410) [`b3b05e1`](https://github.com/Fission-AI/OpenSpec/commit/b3b05e1abeb312caefd57e60be799aeb466c1d0e) Thanks [@clay-good](https://github.com/clay-good)! - Only advertise onboarding commands that will actually exist. The `openspec init` welcome screen and the `openspec update` "Getting started" summary listed `/opsx:new` and `/opsx:continue`, which the default `core` profile never generates, so users were told to run commands that did not exist. Both surfaces now list the commands for the installed workflows. The `init` and `update` completion hints also name the skill (`/openspec-propose`) instead of a command for tools that receive no command files — Codex, and any tool under skills-only delivery.

- [#1412](https://github.com/Fission-AI/OpenSpec/pull/1412) [`1dc670d`](https://github.com/Fission-AI/OpenSpec/commit/1dc670deea741b8313b8a22fb975741f84677b3f) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixed

  - **`/opsx:propose` and `/opsx:ff` no longer finish a change with no spec written.** The workflows listed only `proposal`/`design`/`tasks` and treated the apply phase's `tasks` artifact as the stop condition — but `status` marks an artifact `done` as soon as a matching file exists, so writing `tasks.md` early satisfied the loop while `specs/<capability>/spec.md` was never created (a spec-less change in a spec-driven tool). The loop now derives the full required set — every apply dependency plus everything it transitively `requires` — from a single `status` call, creates each missing artifact, and only skips one when its own `instruction` field marks it conditional. ([#1260](https://github.com/Fission-AI/OpenSpec/issues/1260), [#788](https://github.com/Fission-AI/OpenSpec/issues/788))

  ### Changed

  - **`openspec status --json` now reports each artifact's `requires` edges.** Every entry in the `artifacts` array carries a `requires` array of the ids it directly depends on, present for every status (including `done`) so agents can compute the transitive required set from `status` alone. Additive and backward-compatible — existing fields are unchanged.

- [#1191](https://github.com/Fission-AI/OpenSpec/pull/1191) [`7704702`](https://github.com/Fission-AI/OpenSpec/commit/7704702d61fa71e4f553c21a06bdf8e4ee803b4a) Thanks [@mc856](https://github.com/mc856)! - Generate Markdown commands for Qwen Code instead of deprecated TOML format. Qwen Code now recommends Markdown custom commands with YAML frontmatter; the old `.qwen/commands/opsx-*.toml` files are cleaned up as legacy artifacts on update.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - An already-synced RENAMED delta aborts when a case/whitespace variant of the source requirement still exists — the same typo guard REMOVED deltas have.

- [#1368](https://github.com/Fission-AI/OpenSpec/pull/1368) [`de78c31`](https://github.com/Fission-AI/OpenSpec/commit/de78c31ffd885a0558ae55d332f74d5485dc01c0) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixes

  - **Regenerated artifacts now pick up your manual edits** — the continue, propose, and fast-forward workflows (and the `openspec instructions` dependency block) now tell the agent to re-read dependency artifacts from disk before creating the next one, instead of trusting whatever version it saw earlier in the conversation. Previously, editing `spec.md` and deleting `design.md`/`tasks.md` to regenerate them could silently produce artifacts based on the stale, pre-edit content.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Proposal guidance now resolves blocking open questions with the user instead of deferring them to design.md.

- [#1392](https://github.com/Fission-AI/OpenSpec/pull/1392) [`a13abea`](https://github.com/Fission-AI/OpenSpec/commit/a13abeac47d419462b0193dbf9423dd466ffe6c7) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixed

  - Stop a delta spec written directly at a change's `specs/` root from being silently dropped. `validate` accepted `specs/spec.md` and counted its deltas, but the apply/archive merge only reads capability folders (`specs/<capability>/spec.md`), so the change could pass validation and be archived while its requirements never reached `openspec/specs/`. `validate` now uses the same discovery rules as the merge path and reports the misplaced file with a fix hint, and `archive` blocks instead of completing.

- [#1465](https://github.com/Fission-AI/OpenSpec/pull/1465) [`f917b8b`](https://github.com/Fission-AI/OpenSpec/commit/f917b8be5e1100189ef62320ba9322763053640e) Thanks [@clay-good](https://github.com/clay-good)! - Order artifacts by the schema's declaration order instead of alphabetically.

  `specs` and `design` both require only `proposal`, so both become ready at once - and the tie used to be broken alphabetically, which put `design` first. `openspec status` listed design above specs and `nextSteps` recommended writing `design.md` before any spec existed, contradicting the spec-driven schema's own documented `proposal → specs → design → tasks` sequence.

  Ties now follow the order the schema declares its artifacts, so `openspec status`, `status --json`, `nextSteps`, `blocked by:` lists, and an artifact's `unlocks` all agree. No dependency edges changed, so nothing newly blocks and `design.md` stays optional - only the order of equally-ready artifacts moved. Custom schemas get the same guarantee: dependency order still comes first, but wherever your schema leaves two artifacts equally ready, the order of its `artifacts:` list now decides which one the CLI recommends - so reorder that list if it was never deliberate.

- [#1446](https://github.com/Fission-AI/OpenSpec/pull/1446) [`5348da9`](https://github.com/Fission-AI/OpenSpec/commit/5348da930c4038ffd5b5a521702b71315dcd0019) Thanks [@showms](https://github.com/showms)! - ### Bug Fixes

  - Preserve an existing project-local schema when `openspec schema init --force` rejects an unknown artifact ID. Forced replacement now begins only after artifact validation succeeds.

- [#1433](https://github.com/Fission-AI/OpenSpec/pull/1433) [`26f009d`](https://github.com/Fission-AI/OpenSpec/commit/26f009d940f311b99db7f310816bb166a99fb3ef) Thanks [@clay-good](https://github.com/clay-good)! - Change lookup no longer requires `proposal.md`. `openspec show`, `openspec change list/show/validate`, and shell completion now resolve a change by its directory, matching `openspec list`, `status`, `instructions`, and `validate`.

  Previously a change created by `openspec new change` — which scaffolds only `.openspec.yaml` — was reported as `Unknown item` by `openspec show` and was missing from completions and `openspec change list` until a proposal was written, and a change from a schema with no proposal artifact was never resolvable. `openspec change list` now reports the same set as `openspec list`, keeps task counts for a change that has no proposal yet, and labels it `(no proposal.md yet)` rather than `(unable to read)`. Showing such a change explains that the proposal is not written yet and points at `openspec status --change <name>`.

- [#1468](https://github.com/Fission-AI/OpenSpec/pull/1468) [`fc886af`](https://github.com/Fission-AI/OpenSpec/commit/fc886af7f93068482bbf2c66fd1eb76b40c6a22f) Thanks [@clay-good](https://github.com/clay-good)! - The continue, update, verify, sync, and archive workflow skills now select a change the same way apply does: use the provided name, infer it from conversation context, auto-select when exactly one active change exists, and only prompt when the choice is genuinely ambiguous. Previously these workflows were told to always prompt ("Do NOT guess or auto-select"), so invoking them with a single active change stalled on a question with only one possible answer. The selection is always announced ("Using change: <name>") with how to override, and bulk archive still always prompts.

- [#1194](https://github.com/Fission-AI/OpenSpec/pull/1194) [`b7c85c7`](https://github.com/Fission-AI/OpenSpec/commit/b7c85c741ca56748a4ae095b573fe4550c5c977f) Thanks [@mc856](https://github.com/mc856)! - Fix skills-only delivery emitting `/opsx:*` command references. SKILL.md files generated by init, update, and workspace skill setup now reference the corresponding skills (e.g. `/openspec-apply-change`) when `delivery: 'skills'` is configured, instead of commands that were never generated.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Specs instructions include the spec content guidance from the concepts docs, so generated specs follow the requirement/scenario format.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - The static welcome screen (reduced motion, `--no-animation`, narrow terminals) now waits for the Enter it asks for instead of letting the keystroke submit the tool picker unseen.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Sync and archive workflows resolve main specs through the store-aware root instead of assuming `openspec/specs` in the repo.

- [#1402](https://github.com/Fission-AI/OpenSpec/pull/1402) [`0da5f98`](https://github.com/Fission-AI/OpenSpec/commit/0da5f98e147543a44379e32295e2e9798d775d83) Thanks [@clay-good](https://github.com/clay-good)! - Show the main spec format in the sync-specs skill so agents stop leaving delta operation headers (`## ADDED/MODIFIED Requirements`) in `openspec/specs/` — merged main specs with those headers parse as 0 requirements in `openspec view` ([#1120](https://github.com/Fission-AI/OpenSpec/issues/1120)).

- [#1476](https://github.com/Fission-AI/OpenSpec/pull/1476) [`8731290`](https://github.com/Fission-AI/OpenSpec/commit/87312900f532c6c13ea556d4badaff2efdfa9602) Thanks [@clay-good](https://github.com/clay-good)! - Telemetry no longer depends on `posthog-node`: the single usage event is sent with a plain fetch to the same endpoint. Installing OpenSpec no longer pulls the fast-publishing `posthog-node`/`@posthog/core`/`@posthog/types` tree, which broke downstream installs under supply-chain age policies like pnpm's `minimumReleaseAge` ([#1390](https://github.com/Fission-AI/OpenSpec/issues/1390)).

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - The stale-CLI check hardens its install detection: a directory merely named `volta` no longer changes the upgrade hint, the Windows npm-ownership check corroborates against the `openspec.cmd` shim npm actually writes, and a registry redirect from https to plain http is no longer followed.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - The stale-CLI check tears down a redirected registry connection when its time budget expires instead of leaving the socket open.

- [#1442](https://github.com/Fission-AI/OpenSpec/pull/1442) [`10fa39b`](https://github.com/Fission-AI/OpenSpec/commit/10fa39b1c3a3e88c02ae7d3053864c03a793ff47) Thanks [@hsusul](https://github.com/hsusul)! - `openspec update` now refreshes tools that are configured with command files but no skills (delivery `commands`). Previously it read the generating version only from skill files, so such a tool was reported as "up to date" forever and its command files were never regenerated after a CLI upgrade. Command files carry no version stamp, so OpenSpec compares their contents against what it would generate now — including removing a command file left behind by a workflow you have since deselected. CRLF line endings and a UTF-8 BOM are treated as checkout artifacts rather than drift, so a Windows clone does not report a spurious update.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec update` with `delivery: commands` prints the same configuration correction as init when it removes the skills of a tool that supports only skills, instead of deleting them silently.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - `openspec validate` reports an unreadable specs/ directory as the error it is instead of misdiagnosing it as "no deltas found".

- [#1455](https://github.com/Fission-AI/OpenSpec/pull/1455) [`6b3623a`](https://github.com/Fission-AI/OpenSpec/commit/6b3623a39e96f49995d38d642738b31f68e92039) Thanks [@c4patino](https://github.com/c4patino)! - `openspec view` now resolves the configured OpenSpec root instead of always reading the current directory, and accepts `--store <id>` like its sibling commands. Projects whose `openspec/config.yaml` points at an external store saw an empty dashboard — 0 specs, 0 requirements — while `openspec list` read the same store correctly.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - Preserve keyboard input on Windows after the welcome screen instead of dropping the first keystrokes.

- [#1475](https://github.com/Fission-AI/OpenSpec/pull/1475) [`17af60c`](https://github.com/Fission-AI/OpenSpec/commit/17af60c66e4c049e3986fdbafcdc16b202cda59f) Thanks [@clay-good](https://github.com/clay-good)! - zsh completion install honors `$ZSH` and `$ZSH_CUSTOM`, so Oh My Zsh setups at custom locations get the completion where their shell actually loads it.

## 1.6.0

### Minor Changes

- [#1090](https://github.com/Fission-AI/OpenSpec/pull/1090) [`3f0ca3f`](https://github.com/Fission-AI/OpenSpec/commit/3f0ca3f6ce6f2ec41260c5cbe7954b7e46adcf43) Thanks [@jjxyxsjr](https://github.com/jjxyxsjr)! - ### New Features

  - **TRAE command adapter** — Added command adapter for Trae IDE, enabling generation of `.trae/commands/opsx-<id>.md` files for custom slash commands

- [#1340](https://github.com/Fission-AI/OpenSpec/pull/1340) [`1552731`](https://github.com/Fission-AI/OpenSpec/commit/15527310f9be13cc9a4035ea01b93ba85873d956) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Oh My Pi support** — Generate native OPSX commands and skills for Oh My Pi projects, including tool detection and the expected `.omp` directory layout.
  - **Update planning artifacts in place** — Use `/opsx:update` to revise an existing change's planning artifacts, reconcile related artifacts, and keep implementation work delegated to `/opsx:apply`.

  ### Bug Fixes

  - **Fresh store registration** — Register and use newly created stores before their empty changes, specs, or archive directories have been committed.
  - **Safer requirement archiving** — Stop stale `MODIFIED` requirements from silently deleting scenarios that were added by an earlier archive.

### Patch Changes

- [#1300](https://github.com/Fission-AI/OpenSpec/pull/1300) [`a5bfeda`](https://github.com/Fission-AI/OpenSpec/commit/a5bfedafc8b3d914fe01d05eb36ad9ad3fbe35a2) Thanks [@clay-good](https://github.com/clay-good)! - ### Features

  - **Auto-approve the OpenSpec CLI in generated skills and commands** — every generated `SKILL.md` (all tools) and every Claude Code `/opsx:*` slash command now carries `allowed-tools: Bash(openspec:*)` in its frontmatter, so agents that honor the Agent Skills standard run `openspec` commands without prompting for approval on each call; tools that don't recognize the field ignore it. Scope is limited to the `openspec` CLI; because `allowed-tools` pre-approves rather than restricts, every other tool a skill or command uses stays available under your normal permission settings.

- [#1311](https://github.com/Fission-AI/OpenSpec/pull/1311) [`5956a8e`](https://github.com/Fission-AI/OpenSpec/commit/5956a8e872f41a8f690922b5c9b6927970252b2a) Thanks [@danilopopeye](https://github.com/danilopopeye)! - ### Bug Fixes

  - **`archive` exits non-zero when blocked in human mode** — `openspec archive <change> -y` (and any non-`--json` invocation) no longer returns exit code 0 when validation fails and nothing is archived. The three blocking paths in human mode — delta-spec validation failure, spec rebuild failure, and rebuilt-spec validation failure — now set `process.exitCode = 1`, matching the existing `--json` behavior. Previously the command printed "Validation failed" (or "Aborted. No files were changed.") and exited 0, letting scripts and CI believe the archive succeeded. Aligns `archive` with the same exit-code guarantee already approved for `apply` instructions (#1250).

- [#1280](https://github.com/Fission-AI/OpenSpec/pull/1280) [`a325305`](https://github.com/Fission-AI/OpenSpec/commit/a3253051ea1934fd0d76620addb855dfce801742) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **`validate` resolves changes like `status`** — `openspec validate <change>` (and `--all`/`--changes` and the interactive selector) now resolves a change by directory existence, matching `status`/`instructions`, instead of requiring `proposal.md`. A scaffolded or still-authoring change is validated rather than reported as `Unknown item`, and a resolved-but-invalid change now exits non-zero. Delta discovery also recurses the nested `specs/<area>/<capability>/spec.md` layout. (#1182)
  - **Task progress reads nested/glob `tasks.md`** — `openspec view`, `list`, and the `archive` incomplete-task gate now resolve task progress through the tracked-tasks artifact's `generates` glob (the same file-resolution `status` uses), so a change whose tasks live in nested `tasks.md` files is classified correctly and can no longer archive while unfinished. (#1202)
  - **SHALL/MUST body-keyword hint applies to main specs** — A main-spec requirement whose normative keyword sits only in the `### Requirement:` header now receives the same targeted "move it to the body line" remediation as a change delta, emitted exactly once. (#1156)

- [#1281](https://github.com/Fission-AI/OpenSpec/pull/1281) [`9a0dfb5`](https://github.com/Fission-AI/OpenSpec/commit/9a0dfb5cd136b423c9f13c0b29ec3ea69761b4e6) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Requirement reading fidelity** — The requirement reader used by `validate <change>`, `validate <spec>`, and `archive` is now unified into one fence-, metadata-, and multi-line-aware extraction, closing the known divergences between the change-delta path and the main-spec path (the remaining ones are documented in the change's design doc):

    - A `SHALL`/`MUST` keyword that wraps onto a later body line is detected instead of dropped (#361).
    - Metadata lines (`**ID**:`, `**Priority**:`) before the description are skipped on the spec path, matching the change path (#418). A requirement written entirely as metadata (e.g. `**Constraint**: The system MUST ...`) keeps that line as its text instead of being emptied.
    - A fenced code block before the prose line no longer becomes the requirement text (#312).
    - A `#### Scenario:` inside a fenced example no longer counts as a real scenario in `validate <change>`, matching `validate <spec>`.
    - `SHALL`/`MUST` detection uses one whole-word predicate across all readers, and a requirement with no body text falls back to its header title on both paths.

    Displayed requirement text (e.g. in JSON output and delta descriptions) now reflects the full requirement body rather than only its first line. Archived spec content is unchanged — the archive rebuild reads raw `### Requirement:` blocks, not the parsed text.

  - **Surface non-canonical delta headers** — `validate <change>` now emits an INFO note when an `## ADDED`/`## MODIFIED Requirements` section contains a level-3 header that is not a canonical `### Requirement:` header (one the delta reader silently skips, such as a stray `### Documentation Requirements` divider). The note never changes the `valid` result, including under `--strict` (#498).

## 1.5.0

### Minor Changes

- [#1267](https://github.com/Fission-AI/OpenSpec/pull/1267) [`96f6cac`](https://github.com/Fission-AI/OpenSpec/commit/96f6cacb206c65bee30066f6a1f4e9b855a0d783) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Stores (very early beta)** — Introduces stores as a simpler way to organize specs and changes, replacing the workspace and initiative model. This feature is in very early beta — expect rough edges and breaking changes in upcoming releases.

  ### Bug Fixes

  - **Config parsing** — Configuration values wrapped in JSON containers are now parsed correctly.

### Patch Changes

- [#1240](https://github.com/Fission-AI/OpenSpec/pull/1240) [`cbf386b`](https://github.com/Fission-AI/OpenSpec/commit/cbf386bd6888f103f8ff7d59b3eab98ce5b57998) Thanks [@zied-jlassi](https://github.com/zied-jlassi)! - fix(adapters): escape carriage returns in generated YAML frontmatter

  `escapeYamlValue` flagged `\r` as a character requiring quoting but never escaped it, leaving a literal carriage return inside the double-quoted scalar where YAML line folding/normalization could silently corrupt the value (realistic with CRLF-authored command descriptions). Carriage returns are now escaped as `\r`. The helper — previously duplicated verbatim across five adapters (bob, claude, cursor, pi, windsurf) — is extracted into a shared `command-generation/yaml.ts` module so the behavior stays consistent and is fixed in one place.

## 1.4.1

### Patch Changes

- [#1165](https://github.com/Fission-AI/OpenSpec/pull/1165) [`0a01146`](https://github.com/Fission-AI/OpenSpec/commit/0a01146c181a3af8dbf645547bcbe20c0d48d615) Thanks [@TabishB](https://github.com/TabishB)! - Move beta workspace view state to `.openspec-workspace/view.yaml`, stop top-level `openspec update` from routing into workspace updates, and ignore foreign root `workspace.yaml` files so Dagster projects keep updating normally.

## 1.4.0

### Minor Changes

- [#1003](https://github.com/Fission-AI/OpenSpec/pull/1003) [`342ed43`](https://github.com/Fission-AI/OpenSpec/commit/342ed43e694abba65a3ea275f94ba3b77df85da3) Thanks [@Miss-you](https://github.com/Miss-you)! - ### New Features

  - **Kimi CLI support** — OpenSpec can now initialize Kimi CLI as a supported skills-only tool using `.kimi/skills/`

  ### Other

  - Added Kimi-specific docs and init coverage aligned with skill-based `/skill:openspec-*` usage

- [#1154](https://github.com/Fission-AI/OpenSpec/pull/1154) [`aa16080`](https://github.com/Fission-AI/OpenSpec/commit/aa16080d16b70f7b26cebd465334b2e16c0e7a43) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Mistral Vibe support** — OpenSpec can now initialize Mistral Vibe as a supported skills-only tool using `.vibe/skills/`

  ### Bug Fixes

  - **Case-insensitive requirement headers** — Requirement headers are now parsed regardless of capitalization, so specs no longer fail to parse over header casing
  - **Zsh completions on oh-my-zsh** — Fixed shell completion setup so tab completion installs correctly under oh-my-zsh's `compinit`

  ### Other

  - **Clearer validation hints** — When a requirement has SHALL/MUST only in its header, `openspec validate` now points you to move the keyword onto the requirement body line instead of showing the generic error

- [#1030](https://github.com/Fission-AI/OpenSpec/pull/1030) [`485c97e`](https://github.com/Fission-AI/OpenSpec/commit/485c97e97d766e35dd16c02370baee2044abc4f4) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - Include the sync workflow in the default core profile so new installs generate `/opsx:sync` skills and commands by default.

### Patch Changes

- [#1111](https://github.com/Fission-AI/OpenSpec/pull/1111) [`7fdb177`](https://github.com/Fission-AI/OpenSpec/commit/7fdb1771585b1688597d73dde5a8bc906084d0de) Thanks [@TabishB](https://github.com/TabishB)! - ### Fixed

  - Preserve workspace planning detection when Windows short paths or symlink aliases resolve to a canonical workspace root.

## 1.3.1

### Patch Changes

- [#995](https://github.com/Fission-AI/OpenSpec/pull/995) [`d1f3861`](https://github.com/Fission-AI/OpenSpec/commit/d1f3861d9ec694cc924b042b5da01963dcf93137) Thanks [@TabishB](https://github.com/TabishB)! - ### Bug Fixes

  - **Canonical artifact paths** — Workflow artifact paths are now resolved via the native `realpath`, so symlinks and case-insensitive filesystems no longer cause path mismatches during apply and archive.
  - **Glob apply instructions** — Apply instructions with glob artifact outputs now resolve correctly, and literal artifact outputs are enforced to be file paths.
  - **Hidden main spec requirements** — Requirements nested inside fenced code blocks or otherwise hidden in main specs are now detected during validation.
  - **Clean `--json` output** — Spinner progress text no longer leaks into stderr when `--json` is passed, so AI agents that combine stdout and stderr can parse the JSON reliably.
  - **Silent telemetry in firewalled environments** — PostHog network errors are now swallowed with a 1s timeout and retries/remote config disabled, so OpenSpec no longer surfaces `PostHogFetchNetworkError` in locked-down networks. Telemetry opt-out is documented earlier in the README, installation guide, and CLI reference.

## 1.3.0

### Minor Changes

- [#952](https://github.com/Fission-AI/OpenSpec/pull/952) [`cce787e`](https://github.com/Fission-AI/OpenSpec/commit/cce787ec4083da2b27781f6786f5ce0002909a7b) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Junie support** — Added tool and command generation for JetBrains Junie
  - **Lingma IDE support** — Added configuration support for Lingma IDE
  - **ForgeCode support** — Added tool support for ForgeCode
  - **IBM Bob support** — Added support for IBM Bob coding assistant

  ### Bug Fixes

  - **Shell completions opt-in** — Completion install is now opt-in, fixing PowerShell encoding corruption
  - **Copilot auto-detection** — Prevented false GitHub Copilot detection from a bare `.github/` directory
  - **pi.dev command generation** — Fixed command reference transforms and template argument passing

### Patch Changes

- [#760](https://github.com/Fission-AI/OpenSpec/pull/760) [`61eb999`](https://github.com/Fission-AI/OpenSpec/commit/61eb999f7c6c0fc98d2e7f3678756fce6a3f4378) Thanks [@fsilvaortiz](https://github.com/fsilvaortiz)! - fix: OpenCode adapter now uses `.opencode/commands/` (plural) to match OpenCode's official directory convention. Fixes #748.

- [#759](https://github.com/Fission-AI/OpenSpec/pull/759) [`afdca0d`](https://github.com/Fission-AI/OpenSpec/commit/afdca0d5dab1aa109cfd8848b2512333ccad60c3) Thanks [@fsilvaortiz](https://github.com/fsilvaortiz)! - fix: `openspec status` now exits gracefully when no changes exist instead of throwing a fatal error. Fixes #714.

## 1.2.0

### Minor Changes

- [#747](https://github.com/Fission-AI/OpenSpec/pull/747) [`1e94443`](https://github.com/Fission-AI/OpenSpec/commit/1e94443a3551b228eecbc89e95d96d3b9600a192) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Profile system** — Choose between `core` (4 essential workflows) and `custom` (pick any subset) profiles to control which skills get installed. Manage profiles with the new `openspec config profile` command
  - **Propose workflow** — New one-step workflow creates a complete change proposal with design, specs, and tasks from a single request — no need to run `new` then `ff` separately
  - **AI tool auto-detection** — `openspec init` now scans your project for existing tool directories (`.claude/`, `.cursor/`, etc.) and pre-selects detected tools
  - **Pi (pi.dev) support** — Pi coding agent is now a supported tool with prompt and skill generation
  - **Kiro support** — AWS Kiro IDE is now a supported tool with prompt and skill generation
  - **Sync prunes deselected workflows** — `openspec update` now removes command files and skill directories for workflows you've deselected, keeping your project clean
  - **Config drift warning** — `openspec config list` warns when global config is out of sync with the current project

  ### Bug Fixes

  - Fixed onboard preflight giving a false "not initialized" error on freshly initialized projects
  - Fixed archive workflow stopping mid-way when syncing — it now properly resumes after sync completes
  - Added Windows PowerShell alternatives for onboard shell commands

## 1.1.1

### Patch Changes

- [#627](https://github.com/Fission-AI/OpenSpec/pull/627) [`afb73cf`](https://github.com/Fission-AI/OpenSpec/commit/afb73cf9ec59c6f8b26d0c538c0218c203ba3c56) Thanks [@TabishB](https://github.com/TabishB)! - ### Bug Fixes

  - **OpenCode command references** — Command references in generated files now use the correct `/opsx-` hyphen format instead of `/opsx:` colon format, ensuring commands work properly in OpenCode

## 1.1.0

### Minor Changes

- [#625](https://github.com/Fission-AI/OpenSpec/pull/625) [`53081fb`](https://github.com/Fission-AI/OpenSpec/commit/53081fb2a26ec66d2950ae0474b9a56cbc5b5a76) Thanks [@TabishB](https://github.com/TabishB)! - ### Bug Fixes

  - **Codex global path support** — Codex adapter now resolves global paths correctly, fixing workflow file generation when run outside the project directory (#622)
  - **Archive operations on cross-device or restricted paths** — Archive now falls back to copy+remove when rename fails with EPERM or EXDEV errors, fixing failures on networked/external drives (#605)
  - **Slash command hints in workflow messages** — Workflow completion messages now display helpful slash command hints for next steps (#603)
  - **Windsurf workflow file path** — Updated Windsurf adapter to use the correct `workflows` directory instead of the legacy `commands` path (#610)

### Patch Changes

- [#550](https://github.com/Fission-AI/OpenSpec/pull/550) [`86d2e04`](https://github.com/Fission-AI/OpenSpec/commit/86d2e04cae76a999dbd1b4571f52fa720036be0c) Thanks [@jerome-benoit](https://github.com/jerome-benoit)! - ### Improvements

  - **Nix flake maintenance** — Version now read dynamically from package.json, reducing manual sync issues
  - **Nix build optimization** — Source filtering excludes node_modules and artifacts, improving build times
  - **update-flake.sh script** — Detects when hash is already correct, skipping unnecessary rebuilds

  ### Other

  - Updated Nix CI actions to latest versions (nix-installer v21, magic-nix-cache v13)

## 1.0.2

### Patch Changes

- [#596](https://github.com/Fission-AI/OpenSpec/pull/596) [`e91568d`](https://github.com/Fission-AI/OpenSpec/commit/e91568deb948073f3e9d9bb2d2ab5bf8080d6cf4) Thanks [@TabishB](https://github.com/TabishB)! - ### Bug Fixes

  - Clarified spec naming convention — Specs should be named after capabilities (`specs/<capability>/spec.md`), not changes
  - Fixed task checkbox format guidance — Tasks now clearly require `- [ ]` checkbox format for apply phase tracking

## 1.0.1

### Patch Changes

- [#587](https://github.com/Fission-AI/OpenSpec/pull/587) [`943e0d4`](https://github.com/Fission-AI/OpenSpec/commit/943e0d41026d034de66b9442d1276c01b293eb2b) Thanks [@TabishB](https://github.com/TabishB)! - ### Bug Fixes

  - Fixed incorrect archive path in onboarding documentation — the template now shows the correct path `openspec/changes/archive/YYYY-MM-DD-<name>/` instead of the incorrect `openspec/archive/YYYY-MM-DD--<name>/`

## 1.0.0

### Major Changes

- [#578](https://github.com/Fission-AI/OpenSpec/pull/578) [`0cc9d90`](https://github.com/Fission-AI/OpenSpec/commit/0cc9d9025af367faa1688a7b2606a2549053cd3f) Thanks [@TabishB](https://github.com/TabishB)! - ## OpenSpec 1.0 — The OPSX Release

  The workflow has been rebuilt from the ground up. OPSX replaces the old phase-locked `/openspec:*` commands with an action-based system where AI understands what artifacts exist, what's ready to create, and what each action unlocks.

  ### Breaking Changes

  - **Old commands removed** — `/openspec:proposal`, `/openspec:apply`, and `/openspec:archive` no longer exist
  - **Config files removed** — Tool-specific instruction files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `project.md`) are no longer generated
  - **Migration** — Run `openspec init` to upgrade. Legacy artifacts are detected and cleaned up with confirmation.

  ### From Static Prompts to Dynamic Instructions

  **Before:** AI received the same static instructions every time, regardless of project state.

  **Now:** Instructions are dynamically assembled from three layers:

  1. **Context** — Project background from `config.yaml` (tech stack, conventions)
  2. **Rules** — Artifact-specific constraints (e.g., "propose spike tasks for unknowns")
  3. **Template** — The actual structure for the output file

  AI queries the CLI for real-time state: which artifacts exist, what's ready to create, what dependencies are satisfied, and what each action unlocks.

  ### From Phase-Locked to Action-Based

  **Before:** Linear workflow — proposal → apply → archive. Couldn't easily go back or iterate.

  **Now:** Flexible actions on a change. Edit any artifact anytime. The artifact graph tracks state automatically.

  | Command              | What it does                                         |
  | -------------------- | ---------------------------------------------------- |
  | `/opsx:explore`      | Think through ideas before committing to a change    |
  | `/opsx:new`          | Start a new change                                   |
  | `/opsx:continue`     | Create one artifact at a time (step-through)         |
  | `/opsx:ff`           | Create all planning artifacts at once (fast-forward) |
  | `/opsx:apply`        | Implement tasks                                      |
  | `/opsx:verify`       | Validate implementation matches artifacts            |
  | `/opsx:sync`         | Sync delta specs to main specs                       |
  | `/opsx:archive`      | Archive completed change                             |
  | `/opsx:bulk-archive` | Archive multiple changes with conflict detection     |
  | `/opsx:onboard`      | Guided 15-minute walkthrough of complete workflow    |

  ### From Text Merging to Semantic Spec Syncing

  **Before:** Spec updates required manual merging or wholesale file replacement.

  **Now:** Delta specs use semantic markers that AI understands:

  - `## ADDED Requirements` — New requirements to add
  - `## MODIFIED Requirements` — Partial updates (add scenario without copying existing ones)
  - `## REMOVED Requirements` — Delete with reason and migration notes
  - `## RENAMED Requirements` — Rename preserving content

  Archive parses these at the requirement level, not brittle header matching.

  ### From Scattered Files to Agent Skills

  **Before:** 8+ config files at project root + slash commands scattered across 21 tool-specific locations with different formats.

  **Now:** Single `.claude/skills/` directory with YAML-fronted markdown files. Auto-detected by Claude Code, Cursor, Windsurf. Cross-editor compatible.

  ### New Features

  - **Onboarding skill** — `/opsx:onboard` walks new users through their first complete change with codebase-aware task suggestions and step-by-step narration (11 phases, ~15 minutes)

  - **21 AI tools supported** — Claude Code, Cursor, Windsurf, Continue, Gemini CLI, GitHub Copilot, Amazon Q, Cline, RooCode, Kilo Code, Auggie, CodeBuddy, Qoder, Qwen, CoStrict, Crush, Factory, OpenCode, Antigravity, iFlow, and Codex

  - **Interactive setup** — `openspec init` shows animated welcome screen and searchable multi-select for choosing tools. Pre-selects already-configured tools for easy refresh.

  - **Customizable schemas** — Define custom artifact workflows in `openspec/schemas/` without touching package code. Teams can share workflows via version control.

  ### Bug Fixes

  - Fixed Claude Code YAML parsing failure when command names contained colons
  - Fixed task file parsing to handle trailing whitespace on checkbox lines
  - Fixed JSON instruction output to separate context/rules from template — AI was copying constraint blocks into artifact files

  ### Documentation

  - New getting-started guide, CLI reference, concepts documentation
  - Removed misleading "edit mid-flight and continue" claims that weren't implemented
  - Added migration guide for upgrading from pre-OPSX versions

## 0.23.0

### Minor Changes

- [#540](https://github.com/Fission-AI/OpenSpec/pull/540) [`c4cfdc7`](https://github.com/Fission-AI/OpenSpec/commit/c4cfdc7c499daef30d8a218f5f59b8d9e5adb754) Thanks [@TabishB](https://github.com/TabishB)! - ### New Features

  - **Bulk archive skill** — Archive multiple completed changes in a single operation with `/opsx:bulk-archive`. Includes batch validation, spec conflict detection, and consolidated confirmation

  ### Other

  - **Simplified setup** — Config creation now uses sensible defaults with helpful comments instead of interactive prompts

## 0.22.0

### Minor Changes

- [#530](https://github.com/Fission-AI/OpenSpec/pull/530) [`33466b1`](https://github.com/Fission-AI/OpenSpec/commit/33466b1e2a6798bdd6d0e19149173585b0612e6f) Thanks [@TabishB](https://github.com/TabishB)! - Add project-level configuration, project-local schemas, and schema management commands

  **New Features**

  - **Project-level configuration** — Configure OpenSpec behavior per-project via `openspec/config.yaml`, including custom rules injection, context files, and schema resolution settings
  - **Project-local schemas** — Define custom artifact schemas within your project's `openspec/schemas/` directory for project-specific workflows
  - **Schema management commands** — New `openspec schema` commands (`list`, `show`, `export`, `validate`) for inspecting and managing artifact schemas (experimental)

  **Bug Fixes**

  - Fixed config loading to handle null `rules` field in project configuration

## 0.21.0

### Minor Changes

- [#516](https://github.com/Fission-AI/OpenSpec/pull/516) [`b5a8847`](https://github.com/Fission-AI/OpenSpec/commit/b5a884748be6156a7bb140b4941cfec4f20a9fc8) Thanks [@TabishB](https://github.com/TabishB)! - Add feedback command and Nix flake support

  **New Features**

  - **Feedback command** — Submit feedback directly from the CLI with `openspec feedback`, which creates GitHub Issues with automatic metadata inclusion and graceful fallback for manual submission
  - **Nix flake support** — Install and develop openspec using Nix with the new `flake.nix`, including automated flake maintenance and CI validation

  **Bug Fixes**

  - **Explore mode guardrails** — Explore mode now explicitly prevents implementation, keeping the focus on thinking and discovery while still allowing artifact creation

  **Other**

  - Improved change inference in `opsx apply` — automatically detects the target change from conversation context or prompts when ambiguous
  - Streamlined archive sync assessment with clearer delta spec location guidance

## 0.20.0

### Minor Changes

- [#502](https://github.com/Fission-AI/OpenSpec/pull/502) [`9db74aa`](https://github.com/Fission-AI/OpenSpec/commit/9db74aa5ac6547efadaed795217cfa17444f2004) Thanks [@TabishB](https://github.com/TabishB)! - Add `/opsx:verify` command and fix vitest process storms

  **New Features**

  - **`/opsx:verify` command** — Validate that change implementations match their specifications

  **Bug Fixes**

  - Fixed vitest process storms by capping worker parallelism
  - Fixed agent workflows to use non-interactive mode for validation commands
  - Fixed PowerShell completions generator to remove trailing commas

## 0.19.0

### Minor Changes

- eb152eb: Add Continue IDE support, shell completions, and `/opsx:explore` command

  **New Features**

  - **Continue IDE support** – OpenSpec now generates slash commands for [Continue](https://continue.dev/), expanding editor integration options alongside Cursor, Windsurf, Claude Code, and others
  - **Shell completions for Bash, Fish, and PowerShell** – Run `openspec completion install` to set up tab completion in your preferred shell
  - **`/opsx:explore` command** – A new thinking partner mode for exploring ideas and investigating problems before committing to changes
  - **Codebuddy slash command improvements** – Updated frontmatter format for better compatibility

  **Bug Fixes**

  - Shell completions now correctly offer parent-level flags (like `--help`) when a command has subcommands
  - Fixed Windows compatibility issues in tests

  **Other**

  - Added optional anonymous usage statistics to help understand how OpenSpec is used. This is **opt-out** by default – set `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1` to disable. Only command names and version are collected; no arguments, file paths, or content. Automatically disabled in CI environments.

## 0.18.0

### Minor Changes

- 8dfd824: Add OPSX experimental workflow commands and enhanced artifact system

  **New Commands:**

  - `/opsx:ff` - Fast-forward through artifact creation, generating all needed artifacts in one go
  - `/opsx:sync` - Sync delta specs from a change to main specs
  - `/opsx:archive` - Archive completed changes with smart sync check

  **Artifact Workflow Enhancements:**

  - Schema-aware apply instructions with inline guidance and XML output
  - Agent schema selection for experimental artifact workflow
  - Per-change schema metadata via `.openspec.yaml` files
  - Agent Skills for experimental artifact workflow
  - Instruction loader for template loading and change context
  - Restructured schemas as directories with templates

  **Improvements:**

  - Enhanced list command with last modified timestamps and sorting
  - Change creation utilities for better workflow support

  **Fixes:**

  - Normalize paths for cross-platform glob compatibility
  - Allow REMOVED requirements when creating new spec files

## 0.17.2

### Patch Changes

- 455c65f: Fix `--no-interactive` flag in validate command to properly disable spinner, preventing hangs in pre-commit hooks and CI environments

## 0.17.1

### Patch Changes

- a2757e7: Fix pre-commit hook hang issue in config command by using dynamic import for @inquirer/prompts

  The config command was causing pre-commit hooks to hang indefinitely due to stdin event listeners being registered at module load time. This fix converts the static import to a dynamic import that only loads inquirer when the `config reset` command is actually used interactively.

  Also adds ESLint with a rule to prevent static @inquirer imports, avoiding future regressions.

## 0.17.0

### Minor Changes

- 2e71835: Add `openspec config` command and Oh-my-zsh completions

  **New Features**

  - Add `openspec config` command for managing global configuration settings
  - Implement global config directory with XDG Base Directory specification support
  - Add Oh-my-zsh shell completions support for enhanced CLI experience

  **Bug Fixes**

  - Fix hang in pre-commit hooks by using dynamic imports
  - Respect XDG_CONFIG_HOME environment variable on all platforms
  - Resolve Windows compatibility issues in zsh-installer tests
  - Align cli-completion spec with implementation
  - Remove hardcoded agent field from slash commands

  **Documentation**

  - Alphabetize AI tools list in README and make it collapsible

## 0.16.0

### Minor Changes

- c08fbc1: Add new AI tool integrations and enhancements:

  - **feat(iflow-cli)**: Add iFlow-cli integration with slash command support and documentation
  - **feat(init)**: Add IDE restart instruction after init to inform users about slash command availability
    **feat(antigravity)**: Add Antigravity slash command support
  - **fix**: Generate TOML commands for Qwen Code (fixes #293)
  - Clarify scaffold proposal documentation and enhance proposal guidelines
  - Update proposal guidelines to emphasize design-first approach before implementation

## Unreleased

### Minor Changes

- Add Continue slash command support so `openspec init` can generate `.continue/prompts/openspec-*.prompt` files with MARKDOWN frontmatter and `$ARGUMENTS` placeholder, and refresh them on `openspec update`.

- Add Antigravity slash command support so `openspec init` can generate `.agent/workflows/openspec-*.md` files with description-only frontmatter and `openspec update` refreshes existing workflows alongside Windsurf.

## 0.15.0

### Minor Changes

- 4758c5c: Add support for new AI tools with native slash command integration

  - **Gemini CLI**: Add native TOML-based slash command support for Gemini CLI with `.gemini/commands/openspec/` integration
  - **RooCode**: Add RooCode integration with configurator, slash commands, and templates
  - **Cline**: Fix Cline to use workflows instead of rules for slash commands (`.clinerules/workflows/` paths)
  - **Documentation**: Update documentation to reflect new integrations and workflow changes

## 0.14.0

### Minor Changes

- 8386b91: Add support for new AI assistants and configuration improvements

  - feat: add Qwen Code support with slash command integration
  - feat: add $ARGUMENTS support to apply slash command for dynamic variable passing
  - feat: add Qoder CLI support to configuration and documentation
  - feat: add CoStrict AI assistant support
  - fix: recreate missing openspec template files in extend mode
  - fix: prevent false 'already configured' detection for tools
  - fix: use change-id as fallback title instead of "Untitled Change"
  - docs: add guidance for populating project-level context
  - docs: add Crush to supported AI tools in README

## 0.13.0

### Minor Changes

- 668a125: Add support for multiple AI assistants and improve validation

  This release adds support for several new AI coding assistants:

  - CodeBuddy Code - AI-powered coding assistant
  - CodeRabbit - AI code review assistant
  - Cline - Claude-powered CLI assistant
  - Crush AI - AI assistant platform
  - Auggie (Augment CLI) - Code augmentation tool

  New features:

  - Archive slash command now supports arguments for more flexible workflows

  Bug fixes:

  - Delta spec validation now handles case-insensitive headers and properly detects empty sections
  - Archive validation now correctly honors --no-validate flag and ignores metadata

  Documentation improvements:

  - Added VS Code dev container configuration for easier development setup
  - Updated AGENTS.md with explicit change-id notation
  - Enhanced slash commands documentation with restart notes

## 0.12.0

### Minor Changes

- 082abb4: Add factory function support for slash commands and non-interactive init options

  This release includes two new features:

  - **Factory function support for slash commands**: Slash commands can now be defined as functions that return command objects, enabling dynamic command configuration
  - **Non-interactive init options**: Added `--tools`, `--all-tools`, and `--skip-tools` CLI flags to `openspec init` for automated initialization in CI/CD pipelines while maintaining backward compatibility with interactive mode

## 0.11.0

### Minor Changes

- 312e1d6: Add Amazon Q Developer CLI integration. OpenSpec now supports Amazon Q Developer with automatic prompt generation in `.amazonq/prompts/` directory, allowing you to use OpenSpec slash commands with Amazon Q's @-syntax.

## 0.10.0

### Minor Changes

- d7e0ce8: Improve init wizard Enter key behavior to allow proceeding through prompts more naturally

## 0.9.2

### Patch Changes

- 2ae0484: Fix cross-platform path handling issues. This release includes fixes for joinPath behavior and slash command path resolution to ensure OpenSpec works correctly across all platforms.

## 0.9.1

### Patch Changes

- 8210970: Fix OpenSpec not working on Windows when Codex integration is selected. This release includes fixes for cross-platform path handling and normalization to ensure OpenSpec works correctly on Windows systems.

## 0.9.0

### Minor Changes

- efbbf3b: Add support for Codex and GitHub Copilot slash commands with YAML frontmatter and $ARGUMENTS

## Unreleased

### Minor Changes

- Add GitHub Copilot slash command support. OpenSpec now writes prompts to `.github/prompts/openspec-{proposal,apply,archive}.prompt.md` with YAML frontmatter and `$ARGUMENTS` placeholder, and refreshes them on `openspec update`.

## 0.8.1

### Patch Changes

- d070d08: Fix CLI version mismatch and add a release guard that validates the packed tarball prints the same version as package.json via `openspec --version`.

## 0.8.0

### Minor Changes

- c29b06d: Add Windsurf support.
- Add Codex slash command support. OpenSpec now writes prompts directly to Codex's global directory (`~/.codex/prompts` or `$CODEX_HOME/prompts`) and refreshes them on `openspec update`.

## 0.7.0

### Minor Changes

- Add native Kilo Code workflow integration so `openspec init` and `openspec update` manage `.kilocode/workflows/openspec-*.md` files.
- Always scaffold the managed root `AGENTS.md` hand-off stub and regroup the AI tool prompts during init/update to keep instructions consistent.

## 0.6.0

### Minor Changes

- Slim the generated root agent instructions down to a managed hand-off stub and update the init/update flows to refresh it safely.

## 0.5.0

### Minor Changes

- feat: implement Phase 1 E2E testing with cross-platform CI matrix

  - Add shared runCLI helper in test/helpers/run-cli.ts for spawn testing
  - Create test/cli-e2e/basic.test.ts covering help, version, validate flows
  - Migrate existing CLI exec tests to use runCLI helper
  - Extend CI matrix to bash (Linux/macOS) and pwsh (Windows)
  - Split PR and main workflows for optimized feedback

### Patch Changes

- Make apply instructions more specific

  Improve agent templates and slash command templates with more specific and actionable apply instructions.

- docs: improve documentation and cleanup

  - Document non-interactive flag for archive command
  - Replace discord badge in README
  - Archive completed changes for better organization

## 0.4.0

### Minor Changes

- Add OpenSpec change proposals for CLI improvements and enhanced user experience
- Add Opencode slash commands support for AI-driven development workflows

### Patch Changes

- Add documentation improvements including --yes flag for archive command template and Discord badge
- Fix normalize line endings in markdown parser to handle CRLF files properly

## 0.3.0

### Minor Changes

- Enhance `openspec init` with extend mode, multi-tool selection, and an interactive `AGENTS.md` configurator.

## 0.2.0

### Minor Changes

- ce5cead: - Add an `openspec view` dashboard that rolls up spec counts and change progress at a glance
  - Generate and update AI slash commands alongside the renamed `openspec/AGENTS.md` instructions file
  - Remove the deprecated `openspec diff` command and direct users to `openspec show`

## 0.1.0

### Minor Changes

- 24b4866: Initial release
