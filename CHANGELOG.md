# @fission-ai/openspec

## 1.7.0

### Minor Changes

- [#1399](https://github.com/Fission-AI/OpenSpec/pull/1399) [`27b22ab`](https://github.com/Fission-AI/OpenSpec/commit/27b22ab4cbf530fa00e17f0f6b75a44d56777542) Thanks [@clay-good](https://github.com/clay-good)! - Add `skip_specs: true` change metadata for work with no spec-level behavior change (pure refactors, tooling, docs). `openspec validate` accepts a zero-delta change that declares the marker (honored only when the metadata parses under the shared change-metadata schema and names a schema that loads) and errors when the marker and delta specs are both present, the artifact graph no longer blocks `tasks` on spec files for such changes, `openspec status` renders the specs stage as explicitly skipped, and the propose/specs guidance points to the marker instead of contradicting the validator.

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

- [#1398](https://github.com/Fission-AI/OpenSpec/pull/1398) [`97d441a`](https://github.com/Fission-AI/OpenSpec/commit/97d441a8ee2738d3008709e61acfc91925c7ae3a) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Bulk archive now stops when you pick "Cancel"** — the generated `openspec-bulk-archive-change` skill (and the matching `opsx:bulk-archive` command) offered a "Cancel" option at the confirmation prompt but never told the agent what to do with it, so the next step archived every selected change anyway. The prompt now routes each answer by intent: "Cancel" stops without archiving anything, the archive options proceed (the ready-only option archives just the changes the status table marks `Ready` or `Ready*`), and any other answer re-asks instead of archiving. The single-change archive skill already routes Cancel this way; this brings the bulk variant in line.

- [#1375](https://github.com/Fission-AI/OpenSpec/pull/1375) [`52a8bce`](https://github.com/Fission-AI/OpenSpec/commit/52a8bce1fd2bc98c51fa35cf0cfa05e799eb4404) Thanks [@clay-good](https://github.com/clay-good)! - `--change` now accepts any change name that exists on disk (e.g. date-prefixed names like `2026-07-04-voice-copilot-v1`), matching what `list`, `validate`, and `archive` already resolve. Lookup still rejects unsafe names (path separators, `..`, hidden entries); the kebab-case naming rule still applies when creating a change.

- [#1364](https://github.com/Fission-AI/OpenSpec/pull/1364) [`f58b445`](https://github.com/Fission-AI/OpenSpec/commit/f58b4456925b6331f3e5902a1c57905afe7edbf5) Thanks [@clay-good](https://github.com/clay-good)! - Fix `openspec completion install` detecting the wrong shell for fish (and other)
  users whose interactive shell differs from their login shell. Detection now
  consults the parent process before falling back to `$SHELL`, so running the
  command from fish installs fish completions instead of defaulting to bash.

- [#1377](https://github.com/Fission-AI/OpenSpec/pull/1377) [`285dfd7`](https://github.com/Fission-AI/OpenSpec/commit/285dfd7d764752b2a1e7e8cc843d613421e62652) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - Config `rules:` keys are no longer reported as `Unknown artifact ID` when they belong to a different schema. The global rules map is now validated against the union of artifact IDs across every available schema, so multi-schema projects stop seeing spurious warnings on every command ([#1322](https://github.com/Fission-AI/OpenSpec/issues/1322)).

- [#1401](https://github.com/Fission-AI/OpenSpec/pull/1401) [`b33b15d`](https://github.com/Fission-AI/OpenSpec/commit/b33b15d98ae929624c991632c7382ebc234d4ca7) Thanks [@clay-good](https://github.com/clay-good)! - Stop `design.md` from restating the proposal. In the default `spec-driven` schema, the design instruction asked for "Background, current state, constraints, stakeholders" and "What this design achieves and excludes" without saying that motivation and scope already live in `proposal.md`, so agents restated the proposal's Why and What Changes instead of adding the design's own value - approach, alternatives, and trade-offs. The instruction and the design template now state the boundary explicitly (the proposal covers why and what, design covers how) and tell the agent to reference those documents rather than repeat them ([#1382](https://github.com/Fission-AI/OpenSpec/issues/1382)).

- [#1408](https://github.com/Fission-AI/OpenSpec/pull/1408) [`378d468`](https://github.com/Fission-AI/OpenSpec/commit/378d468ad348dc1e973ed30c5cfa458fb77c9de3) Thanks [@clay-good](https://github.com/clay-good)! - Explore now reads the project's context and rules from `openspec/config.yaml` (or `config.yml`) at the start of a session, so it reasons with the same tech stack and conventions the artifact-creating workflows already receive.

- [#1396](https://github.com/Fission-AI/OpenSpec/pull/1396) [`60f720c`](https://github.com/Fission-AI/OpenSpec/commit/60f720c43acd94de7645ac8629c614ede4682b6a) Thanks [@clay-good](https://github.com/clay-good)! - Fix `openspec feedback` failing when the repository does not define the `feedback` label. The command now retries without the label and notes that it was not applied, instead of exiting with an error and discarding the feedback.

- [#1151](https://github.com/Fission-AI/OpenSpec/pull/1151) [`18cbf5d`](https://github.com/Fission-AI/OpenSpec/commit/18cbf5d32ffe1bff4fff692e24568c605cf1e0fa) Thanks [@javigomez](https://github.com/javigomez)! - ### Fixed

  - Ignore Markdown structure (requirement headers, delta sections, scenarios, REMOVED/RENAMED entries) that appears inside fenced code blocks when parsing delta specs. Previously a fenced `### Requirement:` example was parsed as a real (phantom) requirement, producing spurious `validate` errors and risking incorrect `archive` output. Fenced-code detection is now shared across the Markdown parsers so `validate` and `archive` behave consistently.

- [#1316](https://github.com/Fission-AI/OpenSpec/pull/1316) [`9b70481`](https://github.com/Fission-AI/OpenSpec/commit/9b70481df727ab9f7a00dd0118e4e09373a36fb9) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **`archive` no longer stacks a second date prefix** — archiving a change whose name already starts with a `YYYY-MM-DD-` prefix (a common authoring convention) keeps the name as-is instead of prepending today's date. Previously `openspec archive 2026-07-04-voice-copilot-v1 --yes` produced `2026-07-06-2026-07-04-voice-copilot-v1`, and when run on a later day the folder sorted under a day on which the change did not happen. Names without a full date prefix (including partial dates like `2026-07-feature`) are dated as before, and the naming is now idempotent.

- [#1374](https://github.com/Fission-AI/OpenSpec/pull/1374) [`da3907b`](https://github.com/Fission-AI/OpenSpec/commit/da3907b8a9170711c8b7f63e18352e8577cf7df5) Thanks [@clay-good](https://github.com/clay-good)! - fix(completion): make the PowerShell completion script parse and load again

  The generated `OpenSpecCompletion.ps1` contained 18 empty `switch ($positionalIndex) { }` blocks — emitted for commands whose positionals are all `path`-typed (PowerShell completes paths natively, so those cases produce no clauses). A switch with no clauses is a PowerShell parse error ("Missing condition in switch statement clause"), and PowerShell parses the whole file before running it, so the script never loaded and completions never registered. The generator now skips the positional-index block entirely when no positional produces completions, so the script parses clean (18 → 0 errors) and tab completion works.

- [#1388](https://github.com/Fission-AI/OpenSpec/pull/1388) [`9b5d2cd`](https://github.com/Fission-AI/OpenSpec/commit/9b5d2cdd0c1aa4b1b49da4f95c6cec8d7d38b155) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **Archive workflow templates no longer teach agents to stack a second date prefix** — the `openspec-archive-change` and `openspec-bulk-archive-change` skill/command templates (and the onboarding walkthrough's archived-path example) now mirror the `openspec archive` rule: a change whose name already starts with a `YYYY-MM-DD-` prefix is archived under its own name, while other names get the current date prepended as before. Previously an agent following the workflow instructions on a change named `2026-07-04-voice-copilot-v1` produced `archive/2026-07-07-2026-07-04-voice-copilot-v1`, whatever the CLI did.

- [#1403](https://github.com/Fission-AI/OpenSpec/pull/1403) [`2d6c447`](https://github.com/Fission-AI/OpenSpec/commit/2d6c447100c51fb1e5f65c6f6a35ce02a3196a10) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Propose and fast-forward skills no longer name the Claude-only TodoWrite tool** — the generated `openspec-propose` and `openspec-ff-change` skills (and their `/opsx:propose` / `/opsx:ff` commands) told every agent to "Use the **TodoWrite tool**", which only exists in Claude Code. Codex, Cursor, Gemini, Copilot, and the other supported tools have no such tool, so agents either errored or stalled looking for it. The instruction is now runtime-neutral ("Use a todo list to track progress"), which works everywhere — including Claude Code.

- [#1415](https://github.com/Fission-AI/OpenSpec/pull/1415) [`e2f748c`](https://github.com/Fission-AI/OpenSpec/commit/e2f748c64f05efaeac720f83c71fb6f1b6f6e18d) Thanks [@clay-good](https://github.com/clay-good)! - Reject config key paths that reach the prototype chain, and update the bundled `yaml` dependency.

  `openspec config set --allow-unknown __proto__.polluted <value>` reported success and assigned onto `Object.prototype` for the rest of the process. `--allow-unknown` was meant to relax the known-key check only, but it skipped every key check, so `__proto__`, `constructor`, and `prototype` segments reached the nested-write helper. Those segments are now rejected in `config set` whether or not `--allow-unknown` is passed, and `setNestedValue` / `deleteNestedValue` refuse them regardless of caller. Ordinary keys such as `featureFlags.myFlag` behave exactly as before.

  The `yaml` runtime dependency moves from 2.8.2 to 2.9.0, picking up the fix for a stack overflow on deeply nested input (GHSA / advisory patched in 2.8.3).

- [#1376](https://github.com/Fission-AI/OpenSpec/pull/1376) [`7958924`](https://github.com/Fission-AI/OpenSpec/commit/7958924e95654af981437951e967983385da8001) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Archive after early sync** — `openspec archive` no longer fails with `ADDED failed … already exists` when a change's specs were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If an ADDED requirement already exists in the target spec with identical content, applying it is treated as a no-op; a same-named requirement with different content still aborts the archive as a genuine conflict ([#1332](https://github.com/Fission-AI/OpenSpec/issues/1332)).

- [#1386](https://github.com/Fission-AI/OpenSpec/pull/1386) [`b419e96`](https://github.com/Fission-AI/OpenSpec/commit/b419e965bbf413cc658bbac37325ebc147b1c869) Thanks [@mc856](https://github.com/mc856)! - ### Bug Fixes

  - **Archive after early sync (RENAMED)** — `openspec archive` no longer fails with `RENAMED failed … source not found` when a change's renames were already synced to the main specs before archiving (the early-sync pattern from the `sync` workflow). If a RENAMED requirement's source header is gone but the target header exists in the spec, applying the rename is treated as a no-op; a rename whose source and target are both missing still aborts the archive as a genuine error, and reported counts reflect only renames actually applied.

- [#1405](https://github.com/Fission-AI/OpenSpec/pull/1405) [`5dfef4b`](https://github.com/Fission-AI/OpenSpec/commit/5dfef4b00c233fbe78f40488bd4ff98f4204684c) Thanks [@clay-good](https://github.com/clay-good)! - ### Bug Fixes

  - **Custom schema instructions are no longer overridden by hard-coded spec-driven patterns** — the `openspec-continue-change` skill/command embedded one-line "common artifact patterns" for proposal.md, specs, design.md, and tasks.md, so agents followed those shortcuts instead of the schema's `instruction` field whenever a custom schema reused familiar artifact names. The templates now state that the `instruction` field is the authoritative guidance, and the `propose`, `continue`, and `ff` workflows direct the agent — both in the artifact-creation step and in the guidelines — to invoke a skill when the instruction delegates artifact creation to one, verifying the artifact exists afterward (fixes [#777](https://github.com/Fission-AI/OpenSpec/issues/777)).

- [#1415](https://github.com/Fission-AI/OpenSpec/pull/1415) [`e2f748c`](https://github.com/Fission-AI/OpenSpec/commit/e2f748c64f05efaeac720f83c71fb6f1b6f6e18d) Thanks [@clay-good](https://github.com/clay-good)! - Parse spec headings in linear time when the title is padded with whitespace.

  Building the reference index read the first Purpose line with a regex that backtracked quadratically on a heading full of spaces: 10,000 characters of padding took 60ms, and 100,000 would have taken roughly six seconds. The heading scan is now hand-rolled and linear. Behavior is unchanged — the replacement was checked against the old implementation across 303,000 generated inputs, including CommonMark closing sequences (`## Purpose ##`), seven-hash lines, and headings with no space after the hashes.

- [#1428](https://github.com/Fission-AI/OpenSpec/pull/1428) [`81d5109`](https://github.com/Fission-AI/OpenSpec/commit/81d5109b86f16537deb99f84a772a83235dc9e09) Thanks [@taltas](https://github.com/taltas)! - Update current Roo Code product references to its community successor, Zoo Code.

- [#1410](https://github.com/Fission-AI/OpenSpec/pull/1410) [`b3b05e1`](https://github.com/Fission-AI/OpenSpec/commit/b3b05e1abeb312caefd57e60be799aeb466c1d0e) Thanks [@clay-good](https://github.com/clay-good)! - Only advertise onboarding commands that will actually exist. The `openspec init` welcome screen and the `openspec update` "Getting started" summary listed `/opsx:new` and `/opsx:continue`, which the default `core` profile never generates, so users were told to run commands that did not exist. Both surfaces now list the commands for the installed workflows. The `init` and `update` completion hints also name the skill (`/openspec-propose`) instead of a command for tools that receive no command files — Codex, and any tool under skills-only delivery.

- [#1412](https://github.com/Fission-AI/OpenSpec/pull/1412) [`1dc670d`](https://github.com/Fission-AI/OpenSpec/commit/1dc670deea741b8313b8a22fb975741f84677b3f) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixed

  - **`/opsx:propose` and `/opsx:ff` no longer finish a change with no spec written.** The workflows listed only `proposal`/`design`/`tasks` and treated the apply phase's `tasks` artifact as the stop condition — but `status` marks an artifact `done` as soon as a matching file exists, so writing `tasks.md` early satisfied the loop while `specs/<capability>/spec.md` was never created (a spec-less change in a spec-driven tool). The loop now derives the full required set — every apply dependency plus everything it transitively `requires` — from a single `status` call, creates each missing artifact, and only skips one when its own `instruction` field marks it conditional. ([#1260](https://github.com/Fission-AI/OpenSpec/issues/1260), [#788](https://github.com/Fission-AI/OpenSpec/issues/788))

  ### Changed

  - **`openspec status --json` now reports each artifact's `requires` edges.** Every entry in the `artifacts` array carries a `requires` array of the ids it directly depends on, present for every status (including `done`) so agents can compute the transitive required set from `status` alone. Additive and backward-compatible — existing fields are unchanged.

- [#1191](https://github.com/Fission-AI/OpenSpec/pull/1191) [`7704702`](https://github.com/Fission-AI/OpenSpec/commit/7704702d61fa71e4f553c21a06bdf8e4ee803b4a) Thanks [@mc856](https://github.com/mc856)! - Generate Markdown commands for Qwen Code instead of deprecated TOML format. Qwen Code now recommends Markdown custom commands with YAML frontmatter; the old `.qwen/commands/opsx-*.toml` files are cleaned up as legacy artifacts on update.

- [#1368](https://github.com/Fission-AI/OpenSpec/pull/1368) [`de78c31`](https://github.com/Fission-AI/OpenSpec/commit/de78c31ffd885a0558ae55d332f74d5485dc01c0) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixes

  - **Regenerated artifacts now pick up your manual edits** — the continue, propose, and fast-forward workflows (and the `openspec instructions` dependency block) now tell the agent to re-read dependency artifacts from disk before creating the next one, instead of trusting whatever version it saw earlier in the conversation. Previously, editing `spec.md` and deleting `design.md`/`tasks.md` to regenerate them could silently produce artifacts based on the stale, pre-edit content.

- [#1392](https://github.com/Fission-AI/OpenSpec/pull/1392) [`a13abea`](https://github.com/Fission-AI/OpenSpec/commit/a13abeac47d419462b0193dbf9423dd466ffe6c7) Thanks [@clay-good](https://github.com/clay-good)! - ### Fixed

  - Stop a delta spec written directly at a change's `specs/` root from being silently dropped. `validate` accepted `specs/spec.md` and counted its deltas, but the apply/archive merge only reads capability folders (`specs/<capability>/spec.md`), so the change could pass validation and be archived while its requirements never reached `openspec/specs/`. `validate` now uses the same discovery rules as the merge path and reports the misplaced file with a fix hint, and `archive` blocks instead of completing.

- [#1433](https://github.com/Fission-AI/OpenSpec/pull/1433) [`26f009d`](https://github.com/Fission-AI/OpenSpec/commit/26f009d940f311b99db7f310816bb166a99fb3ef) Thanks [@clay-good](https://github.com/clay-good)! - Change lookup no longer requires `proposal.md`. `openspec show`, `openspec change list/show/validate`, and shell completion now resolve a change by its directory, matching `openspec list`, `status`, `instructions`, and `validate`.

  Previously a change created by `openspec new change` — which scaffolds only `.openspec.yaml` — was reported as `Unknown item` by `openspec show` and was missing from completions and `openspec change list` until a proposal was written, and a change from a schema with no proposal artifact was never resolvable. `openspec change list` now reports the same set as `openspec list`, keeps task counts for a change that has no proposal yet, and labels it `(no proposal.md yet)` rather than `(unable to read)`. Showing such a change explains that the proposal is not written yet and points at `openspec status --change <name>`.

- [#1194](https://github.com/Fission-AI/OpenSpec/pull/1194) [`b7c85c7`](https://github.com/Fission-AI/OpenSpec/commit/b7c85c741ca56748a4ae095b573fe4550c5c977f) Thanks [@mc856](https://github.com/mc856)! - Fix skills-only delivery emitting `/opsx:*` command references. SKILL.md files generated by init, update, and workspace skill setup now reference the corresponding skills (e.g. `/openspec-apply-change`) when `delivery: 'skills'` is configured, instead of commands that were never generated.

- [#1402](https://github.com/Fission-AI/OpenSpec/pull/1402) [`0da5f98`](https://github.com/Fission-AI/OpenSpec/commit/0da5f98e147543a44379e32295e2e9798d775d83) Thanks [@clay-good](https://github.com/clay-good)! - Show the main spec format in the sync-specs skill so agents stop leaving delta operation headers (`## ADDED/MODIFIED Requirements`) in `openspec/specs/` — merged main specs with those headers parse as 0 requirements in `openspec view` ([#1120](https://github.com/Fission-AI/OpenSpec/issues/1120)).

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
