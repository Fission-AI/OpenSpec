# Manual Beta Reality Pass Notes

Use this as the scratchpad while trying the beta flow.

## What Worked

- Manual beta pass caught the bad default before building more surface area.
- After changing the default, rerunning
  `openspec context-store setup team-context --init-git` from inside the
  OpenSpec repo created the store at
  `~/.local/share/openspec/context-stores/team-context` instead of nesting it in
  the repo.
- Minimal fresh-agent handoff worked for initiative creation. A subagent given
  only the store id and a loose topic created `agent-trace-hooks` in the correct
  context-store location:
  `~/.local/share/openspec/context-stores/team-context/initiatives/agent-trace-hooks`.

## What Felt Weird

- Fresh-user guidance immediately drifted into sandbox/environment setup
  (`XDG_CONFIG_HOME`, `XDG_DATA_HOME`) instead of letting the user just run the
  beta locally. Strong reaction: this should work as a normal local workflow.
- `openspec context-store setup` with no args feels like it should start an
  interactive setup, but it does not. The command name itself creates that
  expectation.
- `openspec context-store setup team-context --init-git` created
  `team-context/` inside the current OpenSpec repo because the default path is
  `./<id>`. User expected a default outside the current repo, not a new Git repo
  nested in whatever directory they happened to run from.
- Cleaning up the accidental store had no obvious CLI path. `context-store`
  exposes setup/register/list/doctor, but no unregister/remove command, so
  cleanup required removing the folder and editing the registry manually.
- `context-store setup --init-git` initializes Git, but leaves
  `.openspec-store/` and new initiatives untracked. That may be fine, but the
  beta flow does not tell the user or agent whether to stage/commit the shared
  context store.
- `openspec workspace open` with no arguments prompts only for known local
  workspace views. It does not show registered context stores or initiatives, so
  `team-context` is absent even though the next guide step is opening an
  initiative from that store. This is technically consistent with the current
  implementation, but confusing in the beta flow because the command name reads
  like the broad "open something OpenSpec-related" entrypoint.
- The post-initiative step has the wrong first-run verb. After creating a
  context store and an initiative, the user is conceptually creating a local
  workspace view for that initiative. "Open" implies the workspace already
  exists, so the beta guide and CLI make the user infer a hidden create-or-open
  behavior.

## Missing Prompts Or Too Many Flags

- Need clearer guidance for whether a beta pass should use existing local
  OpenSpec state or create a normal local test context store. Avoid requiring
  environment variables as the default manual path.
- Missing prompt: when no context-store id is provided, ask for the store id,
  path, and Git initialization choice instead of requiring the user to know the
  positional argument/flags.
- Missing prompt/safety check: before creating a default context store under
  the current directory, show the target path and ask for confirmation or offer
  a managed default location.
- Missing handoff guidance: after context-store setup, the guide tells the user
  to ask an agent to create an initiative, but a fresh agent may not know the
  beta initiative CLI or where to find the agent playbook.
- Missing prompt: `workspace open` should either offer an "open initiative from
  context store" path when registered initiatives exist, or make the zero-arg
  prompt text explicit that it is selecting an existing local workspace view
  only. If it offers initiatives, it should likely list references like
  `team-context/agent-trace-hooks`, not just the store id.
- Missing first-run workspace creation flow: after an initiative exists, the
  user should be guided through creating the local workspace view. A simple
  interactive path could ask what to set up, list registered initiatives such as
  `team-context/agent-trace-hooks`, suggest a workspace name from the initiative
  id, optionally link existing repo/folder paths, choose an opener, then create
  the workspace view.
- Better minimal beta path: keep lazy workspace creation, but make bare
  interactive `openspec workspace open` initiative-aware. The picker should show
  existing local workspace views and registered initiatives that can create a
  local view on selection, with labels that preserve the distinction between
  "workspace" and "initiative."
- The generated initiative file contract is underexplained. The CLI creates
  exactly `initiative.yaml`, `requirements.md`, `design.md`, `decisions.md`,
  `questions.md`, and `tasks.md`, but docs describe the Markdown files as
  "typical" or "then edit" rather than naming the contract clearly.
- A user looking at the generated initiative tree may reasonably ask where that
  structure came from. The exact six-file contract is clear in code and the
  internal MVP work item, but public beta docs do not make it explicit and the
  broader direction doc still mentions future `contracts/` content.

## Agent Handoff Notes

- The first agent step has a bootstrapping problem. `context-store setup` does
  not create repo-local guidance, and `workspace open --initiative` cannot run
  until the initiative exists. A fresh agent needs either an explicit pasted
  mini-playbook, installed OpenSpec skills, or CLI output that prints the exact
  next agent prompt/command.
- In the manual subagent test, the agent ran `initiative create --help`, then
  created the initiative with `--store team-context --title ... --summary ...
  --json`. It correctly resolved the store and did not create files in the
  OpenSpec repo.
- The subagent replaced generated `TBD` placeholders with useful short content,
  which suggests the templates give enough structure but not enough guidance.
  There is no CLI option to seed richer content beyond title and summary.
- `initiative create --json` reports `created_files` as relative names. Agents
  have to combine those with the returned root to get absolute paths.
- "Commands only" is product-ambiguous for this beta. The implementation treats
  it as "remove all skills and install only slash command files," but users may
  read it as "I prefer slash commands for workflow entry points." They still
  likely expect their coding agent to understand OpenSpec concepts, context
  stores, initiatives, and workspace handoff.

## Delivery UX Model

- Split the concept into two layers:
  - Baseline OpenSpec literacy: "Does the agent understand OpenSpec concepts and
    know how to inspect context stores, initiatives, workspaces, and repo-local
    changes?"
  - Workflow entrypoints: "How does the user invoke workflow actions such as
    propose/apply/archive?"
- Current `delivery` acts like a generated-artifact cleanup switch. That is too
  low-level for the user-facing choice.
- Better meaning:
  - `skills`: install the baseline guide skill plus workflow skills.
  - `commands`: install the baseline guide skill plus workflow slash commands.
  - `both`: install the baseline guide skill plus workflow skills and workflow
    slash commands.
- In UI copy, avoid "commands only" if it implies no skills at all. Prefer
  labels like "Slash commands as workflow entrypoints" or "Workflow commands
  only" with helper text that baseline OpenSpec guidance is still installed
  when the selected agent supports skills.
- For tools without a command adapter, commands-oriented delivery should warn
  clearly that workflow slash commands are unavailable for that tool. The tool
  should still receive the baseline guide skill if it supports skills, so the
  selected agent is not left with nothing.

## Initiative Placement UX

- A fresh agent also needs to know whether a new planning object belongs in a
  context store or in the current repo. This should not be left to vibes.
- Product distinction:
  - Initiatives in context stores are durable planning and coordination context
    that intentionally lives outside implementation repos: product intent,
    decisions, questions, roadmap notes, and tasks that should not necessarily
    be checked into the code repo.
  - Repo-local OpenSpec changes are implementation plans owned by the repo that
    will change: proposal/design/spec deltas/tasks/validation.
  - Workspaces are local views that connect shared context to local repos; they
    should not become a third durable planning home.
- Agent guidance should not assume repo-local is preferred just because work
  touches one repo. Use or create a context-store initiative when the user wants
  OpenSpec artifacts outside the repo, when a monorepo has multiple teams with
  separate planning contexts, when repo policy discourages planning artifacts,
  when work is cross-repo/team-coordinated, long-lived, pre-implementation
  discovery, or already tied to an existing context store.
- If a request is ambiguous, the agent should inspect first:
  `openspec initiative list --json`, `openspec list --json`, and workspace
  state when available. If still ambiguous, ask: "Should these OpenSpec
  artifacts live outside the repo in a context store, or inside this repo as a
  repo-local implementation change?"
- CLI/skill copy should make the linked flow explicit: create/read initiative
  in the context store, then create repo-local changes from the owning repo with
  `--initiative <store>/<initiative>`.

## Initiative Creation Rethink

- `openspec initiative create` currently creates a full six-file planning
  packet with `TBD` placeholders. That is too eager for the intended audience:
  PMs, designers, architects, and agents facilitating early product/architecture
  thinking.
- Initial creation should register the initiative shell, not invent the plan.
  The most conservative first slice is `initiative.yaml` plus either:
  - a short `brief.md` seeded from title/summary/current understanding; or
  - a lightweight `requirements.md` with no `TBD` placeholders and no claims of
    accepted requirements until the content has been reviewed.
- Follow-up artifacts should be created iteratively when they become real:
  - `requirements.md`: accepted high-level requirements, goals, non-goals,
    unresolved product questions.
  - `design.md`: reviewed product/UX/architecture direction and tradeoffs.
  - `questions.md`: optional question log when questions need tracking.
  - `decisions.md`: optional decision log appended only after decisions happen.
  - Avoid default `tasks.md`; implementation tasks belong in repo-local changes.
    If initiative-level coordination is needed later, use clearer language like
    `workstreams.md`, `milestones.md`, or `coordination.md`.
- This should ideally become schema-led. Reuse the artifact-graph idea
  (artifact ids, generated paths, templates, dependencies, status/instructions),
  but root it at the initiative directory instead of repo-local changes.
- A minimal initiative schema could start with only `requirements` and `design`,
  where design depends on requirements. `decisions` and `questions` are living
  logs, so file-existence completion semantics may not fit them.
- For next-release safety, avoid a strict top-level `schema:` field in
  `initiative.yaml` until metadata compatibility is designed. If a schema hint
  needs persistence, store it under `metadata` or keep the default implicit.

## Docs Fixes

- The beta guide says "This creates a local context store" but does not explain
  that the default location is `./<id>` relative to the current working
  directory. That needs to be explicit if the default remains.
- Immediate docs/code fix changed the default away from `./<id>` and documented
  the managed local data location instead.
- Step 2 should not assume the agent already knows the beta initiative command.
  Include a copy-paste bootstrap prompt or link/inline excerpt from the agent
  CLI playbook.
- Step 3 says "Open Your Local Workbench," but the command is actually
  create-or-open when `--initiative` is passed. The guide should make that
  explicit: "Create or open a local workspace view for the initiative." It
  should also warn that bare `openspec workspace open` selects existing
  workspace views only and will not list context stores like `team-context`.
- Better: change the user-facing flow so the first-time path is explicitly
  creation/setup. The guide should send humans to an interactive workspace setup
  path for the initiative, then reserve `workspace open` for reopening an
  existing workspace view.
- Subagent UX/model passes recommended a leaner beta change: keep
  `workspace open --initiative <store>/<initiative>` as the explicit
  create-or-reuse path, but make bare interactive `workspace open` show
  initiatives as selectable targets. Selecting an initiative should say it is
  creating/opening a local workspace view.

## Possible Implementation Slices

- Make `openspec context-store setup` interactive when no id is provided:
  prompt for store id, default path, and Git initialization; keep `--json` /
  non-interactive behavior deterministic with a helpful fix message.
- Reconsider the default context-store setup path. Options: use the managed
  OpenSpec data directory by default, or keep `./<id>` only after an interactive
  confirmation that names the full target path.
  - Implemented during the pass: use the managed OpenSpec data directory by
    default and keep `--path` for explicit locations.
- Add `openspec context-store unregister <id>` or `remove <id>` for local
  registry cleanup, with an explicit choice about whether to delete files or
  only forget the local registration.
- Add a first-run handoff affordance after context-store setup, such as printing
  "Next for your agent" guidance or adding a command that emits the agent
  playbook for shared context/initiative setup.
- Add interactive workspace creation for initiative views. Candidate surfaces:
  extend `openspec workspace setup` with initiative selection, add
  `openspec workspace setup --initiative <store>/<initiative>`, or introduce a
  clearer `workspace create` command. The key UX requirement is that a fresh
  user can run an interactive command after initiative creation and be led to
  "create a local workspace view for this initiative" without knowing
  `--initiative` or the derived workspace-name convention.
- Add an initiative-aware `workspace open` picker as the smallest product fix:
  on bare interactive open, list local workspaces plus registered initiatives.
  If the user selects an initiative, feed it through the existing
  `--initiative` create/reuse path. Do not auto-create workspaces during
  context-store setup or initiative creation, and do not make workspaces 1:1
  with initiatives.
  - Implemented during the pass: bare interactive `workspace open` now shows
    registered initiatives that do not already have a known local view, and
    selecting one creates/reuses the initiative-bound workspace view.
  - Follow-up fix: when that lazy initiative view is new, `workspace open`
    now runs the same repo/folder link prompt as `workspace setup` before
    creating the workspace view. This avoids opening an empty workspace and
    makes the first-run path collect implementation roots at the moment the
    user expects it.
- Consider splitting baseline OpenSpec literacy from workflow delivery. A
  small default `use-openspec` skill could be installed whenever a selected
  agent supports skills, even if workflow delivery is set to commands-only, so
  "commands only" means "workflow actions are slash commands" rather than "the
  agent gets no OpenSpec context."
- Simpler possible slice: treat `use-openspec` as a normal managed skill bundled
  with the configurator and installed by default. Keep it skill-only even if it
  is presented as part of the default profile, so it does not create a slash
  command, workflow artifact, or user-facing workflow action.
- Rethink `openspec initiative create` as a sparse, schema-led container
  instead of a fully scaffolded planning packet. Initial create should likely
  write only `initiative.yaml` plus a short `brief.md` seeded from title and
  summary. Follow-up agent/CLI actions can add `requirements.md`, `design.md`,
  `questions.md`, `decisions.md`, or coordination artifacts when there is
  reviewed content to capture. Avoid default `TBD` sections, fake decisions,
  and default initiative-level `tasks.md` that may be confused with repo-local
  implementation tasks.
- Manual follow-up converted the test `agent-trace-hooks` initiative to the
  proposed sparse shape: kept `initiative.yaml`, added `brief.md`, and removed
  the eager generated planning files. `initiative show` still resolves because
  current initiative identity depends on `initiative.yaml`.
- Promoted the broader fix into
  `work-items/15-context-store-project-roots-and-schema-led-initiatives/`:
  context stores should behave like OpenSpec roots for shared context, with
  store-local config, schemas, and sparse schema-led initiative artifacts.
- Workspace shape correction: managed workspace views should not look like
  repos. New workspace views should contain the generated root files
  (`AGENTS.md`, `workspace.yaml`, and `<workspace>.code-workspace`) without a
  default `changes/` directory or generated `.gitignore`; VS Code multi-root
  views should show linked repos first, then initiative context, then the small
  OpenSpec workspace folder.
- Guide correction: after opening a workspace, the user should ask the agent to
  explore or draft using the initiative. The agent should resolve workspace
  state, initiative context, and linked repo ownership, then run repo-local
  OpenSpec commands from the owning repo. The user-facing flow should not make
  humans type `openspec new change` or `cd` into implementation repos.
