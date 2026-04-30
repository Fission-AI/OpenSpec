# Workspace POC Follow-up Notes

Date: 2026-04-27

These are investigation notes from exploring the workspace POC launch flow, especially how `openspec workspace open` starts agent sessions.

## Current Terminology Decision

As of 2026-04-30, `/apply` means **implement**.

Earlier notes may mention "apply" as "materialize" or "create repo-local artifacts"; treat that as historical POC vocabulary, not the desired product contract. The workspace should remain the planning source of truth, and `/apply` should ask the agent to implement an already-planned repo slice in a selected branch/worktree checkout.

Follow-up implementation decision: remove the current top-level `openspec apply` command from the workspace POC surface. It was introduced as a materialization command, but that behavior is not the desired product contract and does not serve a clear user purpose once `/apply` is defined as an agent implementation workflow. Any future lower-level support should be designed around providing apply context or bookkeeping to the agent, not as a human-facing materialization command.

## Workspace Metadata Directory Naming

The current POC uses `.openspec/` at the coordination workspace root for workspace metadata and local overlays. That is technically workable, but the naming may be confusing because repo-local OpenSpec projects already use a visible `openspec/` directory for specs, changes, and config.

Follow-up decision to consider before this hardens:

- Prefer renaming the workspace metadata directory to `.openspec-workspace/`.
- Avoid `.workspace/` unless there is a strong reason, because it is generic and may collide conceptually with editor workspaces, monorepo managers, or other project tooling.
- Keep the visible workspace planning surface at the root, with `changes/` as the main user-facing directory.
- Keep repo-local projects using `openspec/`.

Expected mental model:

```text
repo-local project:
  openspec/

coordination workspace:
  changes/
  .openspec-workspace/
```

Rationale: `.openspec-workspace/` is longer, but it clearly belongs to OpenSpec, clearly applies only to workspace mode, and avoids having `openspec/` and `.openspec/` mean different things depending on where the user is standing.

## Current Understanding

- `openspec workspace open` builds a dynamic workspace prompt in `src/core/workspace/open.ts`.
- For Claude, the prompt is passed directly as the final positional argument to the `claude` CLI from `src/core/workspace/open-launch.ts`.
- The prompt is not read from stdin.
- The prompt is not read from `.claude/commands/opsx/workspace-open.md` during the Claude launch path.
- The generated instruction surface path for Claude is currently mostly a reporting/adapter artifact for workspace open.
- The prompt carries runtime scope that static files cannot safely capture:
  - workspace mode
  - workspace root
  - registered repos
  - active workspace changes
  - attached repos
  - change ID and path for change-scoped sessions

## Things to Look Further Into

### Static vs Dynamic Guidance

Explore whether stable behavioral rules should move into workspace-level `AGENTS.md` or `CLAUDE.md`, leaving the launch prompt to carry only dynamic scope.

Questions:

- Which rules are durable enough to live in repo/workspace docs?
- Which facts must remain launch-time state?
- Should workspace creation generate or update a workspace-level guidance file?
- How should this work for agents that read `AGENTS.md` but not `CLAUDE.md`, or vice versa?

### Prompt Minimalism

The current prompt is explicit, but may be longer than needed.

Questions:

- What is the smallest prompt that still prevents root-mode materialization mistakes?
- Can the prompt reference a stable doc instead of restating the full behavior contract?
- Should root-mode and change-scoped prompts use different templates?
- Should `Agent target: claude` be included, or is it redundant once the launcher has selected an agent?

### Instruction Surface Semantics

Workspace open builds an instruction surface through the command generation adapter, but for Claude launch it passes the prompt directly.

Questions:

- Is the Claude instruction surface useful outside `--prepare-only`?
- Should workspace open write the instruction surface for Claude, or stop presenting it as a file-like artifact?
- Should `instructionSurface` be renamed to clarify whether it is persisted, virtual, or launch-only?
- Are tests depending on an abstraction that does not match the real launch behavior?

### Claude CLI Contract

The launcher assumes Claude accepts the full prompt as a positional argument.

Questions:

- Is this stable across supported Claude Code versions?
- Is there a practical argv length limit for large workspaces with many repos or active changes?
- Would stdin or a temporary prompt file be more robust?
- How should quoting, newlines, and shell-independent spawning behavior be documented?

### Workspace Scope Safety

The prompt is currently the main behavioral guardrail for workspace-root mode.

Questions:

- Is prompt-only enforcement enough for "do not materialize repo-local changes"?
- Can commands detect workspace-root mode from environment and refuse materialization?
- Should `openspec apply` or workflow commands require a change-scoped session for certain actions?
- Can the session environment become the source of truth for mode and scope?

### Agent Parity

Claude, Codex, and GitHub Copilot receive workspace context differently.

Questions:

- Should all agents share the same dynamic prompt body?
- Should agent-specific adapters own only formatting and launch mechanics?
- Does GitHub Copilot need the same concise dynamic prompt embedded in its prompt surface?
- Are there agent-specific behaviors that require separate safety language?

### Root-to-Change Upgrade Flow

Root sessions can create a targeted workspace change and then stop so OpenSpec can reopen change-scoped.

Questions:

- Is stopping after scope creation intuitive enough?
- Can OpenSpec make the transition clearer in the prompt and CLI output?
- Should the upgrade handoff be driven by environment/session state instead of prompt instruction?
- How should failed or partial upgrade requests be surfaced?

### In-Session Directory Attachment

Instead of requiring the user to stop and reopen after a targeted workspace change is created, some agents may support adding repo directories to the current session manually, such as asking Claude to `/add-dir <repo-path>`.

Questions:

- Can `/add-dir` or equivalent agent-native commands be used as the primary upgrade path for Claude?
- If so, how does OpenSpec verify that the current session now has exactly the targeted repos attached?
- How should the session prompt/mode be updated from `workspace-root` to `change-scoped` after manual directory attachment?
- Does the workspace-open environment still saying `workspace-root` create command-behavior risks after in-session attachment?
- How would this work across Codex and GitHub Copilot, where directory attachment is launched differently?
- Should OpenSpec offer two paths: "automatic relaunch" for reliable scope enforcement and "manual /add-dir" for faster interactive continuation?

### Workspace Explore Before Proposal

There is a major UX mismatch between single-repo OpenSpec and workspace OpenSpec.

In a single-repo project, the normal user workflow is:

```text
explore -> proposal
```

The user can open an agent in the repo, inspect code, understand the problem space, discuss options, and only create a change once the scope is clear.

In the current workspace model, root sessions intentionally do not attach registered repos. That means the agent cannot inspect repo code during initial exploration. To get repo context, the user must first create a targeted workspace change, then reopen change-scoped with attached repos. This creates pressure to make a dummy or prematurely named change just to unlock the right filesystem scope.

Current workspace flow:

```text
workspace-root session
  -> user describes rough goal
  -> create targeted change early
  -> reopen with repo dirs attached
  -> finally explore actual repo context
  -> revise proposal/design/tasks
```

This is backwards for exploratory work. The product is using "change creation" as a transport mechanism for repo attachment, not because the user is actually ready to commit to a proposal.

UX problem:

- Users often do not know the exact repo scope before exploration.
- Agents need some repo context to determine scope responsibly.
- Root mode forbids repo inspection for safety.
- Change-scoped mode requires a change ID and target set.
- Therefore users are pushed into creating a placeholder change before they have done the exploration that should inform the change.

Simpler revised direction:

The product should not introduce a separate exploration scope just to make repo directories visible. That risks creating a second lifecycle concept for what users already understand as a workspace working set.

Expected user model:

```text
workspace setup / add-repo
  -> defines the workspace working set

workspace open
  -> opens that working set

new change / status / apply
  -> operate inside that working set
```

This matches how users currently experience multi-root workspaces in VS Code: adding folders to a workspace means those folders are available together for search, navigation, source control, debugging, tasks, and agent context. Users do not expect to create a proposal or change before the editor can see folders they already added to the workspace.

For OpenSpec, `openspec workspace open` should therefore open the coordination workspace plus all registered, resolvable repo roots by default. For GitHub Copilot, that means the generated `.code-workspace` should include the workspace root and the registered repos. For Claude and Codex, that means the launch path should attach the registered repo directories using each agent's directory attachment mechanism.

Example:

```yaml
repoPaths:
  openspec: /Users/tabishbidiwale/fission/repos/openspec
  openspec-landing: /Users/tabishbidiwale/fission/repos/openspec-landing
```

`openspec workspace open --agent github-copilot` should produce an editor workspace equivalent to:

```json
{
  "folders": [
    {
      "name": "workspace",
      "path": "/path/to/coordination-workspace"
    },
    {
      "name": "openspec",
      "path": "/Users/tabishbidiwale/fission/repos/openspec"
    },
    {
      "name": "openspec-landing",
      "path": "/Users/tabishbidiwale/fission/repos/openspec-landing"
    }
  ]
}
```

The safety boundary should move away from hiding registered repos and toward explicit OpenSpec workflow gates:

- repo visibility is normal workspace behavior
- creating a targeted change records proposal scope
- `apply --change <id> --repo <alias>` controls repo-local materialization
- status/reporting should distinguish registered repos, targeted repos, and materialized repos
- root sessions should still be instructed not to perform repo-local implementation unless the user explicitly asks for that workflow

This keeps the single-repo mental model intact:

```text
explore -> proposal -> apply
```

In workspace form:

```text
open the workspace working set
  -> explore across registered repos
  -> create a targeted workspace proposal when scope is clear
  -> apply/materialize repo-local execution explicitly
```

The existing `workspace open --change <id>` behavior may still be useful as a focused prompt/session entry point for an existing change, but it should not be the primary mechanism for repo visibility. Users should not need to open at the change level simply to see repos they already added to the workspace.

Important design distinction:

```text
Repository visibility is not the same as change commitment.
```

The current UX couples them:

```text
Want repo visibility? Create a change.
```

The better model should decouple them:

```text
Want repo visibility? Add repos to the workspace and open it.
Ready to propose? Create a targeted workspace change.
Ready to implement? Explicitly apply/materialize the change into repo-local execution.
```

Likely product direction:

- Make registered repos the default workspace-open working set.
- Stop treating change-scoped open as the route to basic repo context.
- Keep change targets as proposal metadata and materialization guardrails, not editor attachment gates.
- Keep `workspace open --change <id>` only if it adds focused change context beyond what plain workspace open provides.
- Make implementation/materialization explicit through OpenSpec commands rather than by hiding repos from the agent.
- Treat a generated `.code-workspace` file as the concrete VS Code/Copilot representation of the OpenSpec workspace working set.

This would restore the single-repo mental model:

```text
explore -> proposal -> apply
```

but in workspace form:

```text
workspace open with registered repos
  -> create targeted workspace proposal when ready
  -> apply/materialize repo-local execution explicitly
```

Immediate manual workaround:

Users can get the desired GitHub Copilot behavior today by creating a `.code-workspace` file that includes the coordination workspace root plus each registered repo root. Opening that file in VS Code gives Copilot the same multi-root workspace context users expect.

Example:

```json
{
  "folders": [
    {
      "name": "workspace",
      "path": "/path/to/coordination-workspace"
    },
    {
      "name": "openspec",
      "path": "/Users/tabishbidiwale/fission/repos/openspec"
    },
    {
      "name": "openspec-landing",
      "path": "/Users/tabishbidiwale/fission/repos/openspec-landing"
    }
  ]
}
```

Follow-up implementation note:

`openspec workspace setup` should create or update a managed `.code-workspace` file for the workspace. That file should represent the current registered working set:

- include the coordination workspace root
- include every registered repo with a valid local path
- use repo aliases as folder names
- avoid committing machine-specific absolute paths unless the workspace file is explicitly local/gitignored
- update when `workspace add-repo`, `workspace update-repo`, or any future repo removal command changes the registered working set
- make `openspec workspace open --agent github-copilot` open this workspace file directly, rather than requiring a change-scoped generated workspace file for repo visibility

Open question: should the managed `.code-workspace` file live inside `.openspec/` as local state, at the workspace root as a discoverable user-facing file, or both with one generated from the other?

### Workspace Skills and General Actions

The agent currently has to infer or rediscover common workspace operations, such as checking associated repos or adding more repos to the workspace inventory.

Example interaction to improve:

```text
User: What repos are associated with this workspace?

Agent: Registered repos for poc-workspace:
- openspec -> /Users/tabishbidiwale/fission/repos/openspec (inventory only; not attached to this session)

No repos are currently attached. Attachment happens when a targeted workspace change scopes one in.

User: How do I add more to the inventory?

Agent: openspec workspace add-repo <alias> <path> [--owner "<team>"] [--handoff "<next step>"]
```

Questions:

- Should workspace setup install one or more workspace-specific skills for root sessions?
- Should there be a skill that tells agents how to inspect associated repos, distinguish registered vs attached repos, and explain inventory-only status?
- Should there be a skill for general workspace actions like `add-repo`, `update-repo`, `doctor`, `targets`, `status`, and creating targeted workspace changes?
- Should those skills prefer OpenSpec CLI commands over ad hoc file inspection of `.openspec/workspace.yaml` and `.openspec/local.yaml`?
- How should skills avoid encouraging repo-local edits while in `workspace-root` mode?
- Should the launch prompt point at these skills instead of spelling out every rule inline?

### Standard OpenSpec Skills in Workspace Sessions

When a user runs `openspec workspace open`, the normal OpenSpec agent affordances should still be available. Users should be able to rely on the same mental model they use in single-repo OpenSpec:

```text
/explore -> /propose -> /apply -> /verify -> /archive
```

Current gap observed in `poc-workspace`:

- The managed workspace did not have the normal `.claude/skills/openspec-*` skill set.
- The managed workspace did not have the normal `.claude/commands/opsx/*` slash command files.
- Only the manually added workspace-session skill existed after this investigation.
- This means a workspace-open agent may not know how to perform normal OpenSpec workflows from the workspace root.

Expected behavior:

- `workspace setup` or `workspace open` should ensure the relevant OpenSpec workflow skills/commands are available in the managed workspace root for the selected agent.
- Workspace sessions should add workspace-specific guidance on top of the normal OpenSpec skills, not replace them.
- Users should be able to open a workspace and ask for exploration/proposal/apply behavior using familiar OpenSpec commands or prompts.
- The standard skills must be workspace-aware: in root/exploration mode they should not accidentally materialize repo-local changes, and in change-scoped mode they should respect confirmed target repos.

Questions:

- Should `workspace setup` internally run the same skill/command generation as `openspec init` against the managed workspace root?
- Should workspace roots get a workspace-specific profile that includes both normal OpenSpec workflows and workspace-session guidance?
- Should `workspace open` check for missing skills/commands and repair them, or should setup/update own that?
- How should this work for Claude, Codex, and GitHub Copilot, given their different command/skill surfaces?
- Do existing `openspec-explore`, `openspec-propose`, and `openspec-apply` skills need workspace-mode branches, or should they defer to a separate `openspec-workspace-session` skill?
- Should the workspace prompt explicitly mention that normal OpenSpec skills/commands are available and how to use them in workspace mode?

### Proposal-Time Target Resolution

Workspace targets should not be treated as a prerequisite for starting a conversation. Users usually begin with a product goal, not a repo ownership map:

```text
I want the OpenSpec docs to show up on the landing page.
```

At that moment, the agent may need to explore before it knows whether the honest scope is one repo, two repos, docs only, CI, deployment, or product navigation. Forcing target selection at the first `new change` step makes the user or agent answer an implementation-scope question too early.

Better mental model:

```text
intent captured -> proposal scoped -> implementation applied
```

Targets are the scope commitment that turns a general idea into a repo-owned implementation plan. They enable:

- per-repo task/spec areas
- change-scoped workspace attachment
- implementation guardrails
- per-target status and validation
- avoiding accidental edits to inventory-only repos

That means targets can be optional while exploring or capturing a rough draft, but they should be resolved before a proposal is declared apply-ready.

Recommended workflow rule:

```text
/explore may leave targets unknown.
/propose must set targets before it finishes.
/apply should assume targets are already set and only guard if they are missing.
```

The agent should add targets during `/propose`, after it has inspected workspace inventory and inferred the smallest honest target set. If confidence is high, it should set the targets directly. If the target set is ambiguous, it should ask the user to confirm the proposed targets before creating target-specific specs/tasks.

Desired agent behavior:

1. Create or continue the change.
2. Ask OpenSpec for workspace context and current target state.
3. Explore enough to identify likely repo ownership.
4. Set the smallest honest target set before target-specific artifacts are created.
5. Generate proposal/design/specs/tasks for those targets.
6. Run status.
7. Only say "ready for apply" if targets are confirmed.

This keeps `/apply` from becoming the place where the user first discovers a missing target error. `/apply` can still fail clearly if targets are missing, but that should be a recovery guardrail rather than the normal path.

CLI/product follow-up:

- Preferred direction: see if workspace mode can remove the `--targets` flag from `openspec new change` entirely. Target scope should be inferred, created, or confirmed during proposal work rather than required as an up-front CLI argument.
- Consider allowing `openspec new change <id>` inside a workspace to create an unscoped draft instead of failing immediately.
- Make `openspec status --change <id> --json` expose whether targets are `pending`, `confirmed`, or `not-required`.
- Provide a clear target mutation command, such as `openspec workspace targets <change> --add/--remove` or a simpler `set` form for replacing the target set.
- Block or warn before target-specific artifacts and `apply` when targets are still pending.
- Update `openspec-propose` so one skill works inside and outside workspaces by following CLI-discovered state instead of hardcoding separate workspace and non-workspace flows.

### Derive Workspace Scope From Target Artifacts

The current POC stores workspace targets in `.openspec.yaml` and also creates target-specific artifact folders:

```text
changes/<id>/
  .openspec.yaml        # targets: [app, api]
  targets/
    app/
      tasks.md
      specs/
    api/
      tasks.md
      specs/
```

This duplicates state. If proposal work later adds `targets/docs/tasks.md` but metadata still says only `app, api`, OpenSpec has to decide which source is authoritative. That is exactly the kind of bookkeeping agents are likely to miss.

Simpler model:

```text
The workspace change affects the repos that have target artifact slices.
```

In this model, active scope is derived from:

```text
changes/<id>/targets/<alias>/
```

The `targets` list in `.openspec.yaml` should not be the active source of truth. It can be removed, deprecated, or treated only as a confirmation/cache snapshot. `.openspec.yaml` should keep metadata that is not derivable from the artifact tree, such as schema, creation date, archive timestamps, and possibly scope confirmation state.

Potential metadata shape:

```yaml
schema: spec-driven
created: 2026-04-29
scopeConfirmedAt: 2026-04-29T...
workspaceArchivedAt: 2026-04-29T...
```

Validation then moves to the artifact tree:

- every `targets/<alias>/` folder must match a registered workspace repo alias
- every target folder must contain the required target artifacts for the schema
- `status` lists targets by reading the target folders
- `workspace open --change <id>` attaches repos derived from target folders
- `apply --repo <alias>` is allowed when `targets/<alias>/` exists and validates
- invalid or stray target folders are reported as structural problems

The existing `workspace targets` command can still exist, but its meaning becomes "manage target artifact slices" rather than "edit target metadata":

```text
workspace targets <change> --add docs
  -> create targets/docs/tasks.md and targets/docs/specs/

workspace targets <change> --remove docs
  -> remove/archive targets/docs/ if safe
```

This makes the agent workflow more natural:

```text
When repo_c becomes affected, create or update targets/repo_c/tasks.md and specs.
OpenSpec derives scope from that artifact slice.
```

It also removes the need for agents to remember a separate scope mutation step whenever proposal content changes.

### Revised Apply Skill Semantics

Vocabulary correction: `/apply` means **implement**.

It does not mean:

```text
create repo-local planning artifacts
copy workspace files into a repo
materialize a repo-local OpenSpec change
```

Those may have been implementation ideas in the POC, but they should not define the product contract.

The user-facing surface is the coding agent and the normal OpenSpec skill flow:

```text
/explore -> /propose -> /apply -> /verify -> /archive
```

The user should not be thinking:

```text
Run openspec apply to create the repo change.
```

They should be thinking:

```text
Ask the agent to implement the already-planned repo slice.
```

Recommended workspace rule:

```text
Planning creates the whole cross-repo plan up front.
/apply implements one selected repo slice from that plan.
```

That means `/propose` should create all planning artifacts needed for the affected repos before it declares the change ready. `/apply` should not be the normal moment where repo planning artifacts first appear. It can still guard against missing or invalid planning state, but missing repo slices should be a recovery error, not the normal path.

Current POC shape:

```text
workspace/
  changes/integrate-docs/
    proposal.md
    design.md
    tasks/coordination.md
    targets/
      openspec/
        tasks.md
        specs/
      openspec-landing/
        tasks.md
        specs/
```

This matches the desire to create repo slices up front, but it makes workspace planning feel like a separate, heavier OpenSpec dialect.

Simpler proposed shape:

```text
workspace/
  changes/integrate-docs/
    proposal.md
    design.md
    tasks.md
    specs/
      openspec/
        docs-conventions/spec.md
      openspec-landing/
        docs-routing/spec.md
        docs-rendering/spec.md
```

The repo dimension stays in the planning content, but the visible file shape remains close to standard OpenSpec:

```text
proposal.md
design.md
tasks.md
specs/
```

Example `tasks.md`:

```markdown
## Coordination

- [ ] Confirm docs source of truth
- [ ] Confirm rollout order

## openspec

- [ ] Update docs conventions

## openspec-landing

- [ ] Add docs routing
- [ ] Render markdown docs
- [ ] Add docs navigation
```

Desired `/apply` behavior:

```text
User: /apply integrate-docs for openspec-landing

Agent:
1. Read the workspace change.
2. Read shared proposal/design.
3. Read the openspec-landing tasks/specs slice.
4. Select or confirm the openspec-landing execution checkout.
5. Implement that slice in the selected checkout.
6. Update the relevant workspace task checkboxes as work completes.
```

Not desired:

```text
/apply creates the openspec-landing planning artifacts for the first time.
/apply is primarily a file-copy operation.
/apply is primarily a repo-local materialization operation.
The human user has to know or run the lower-level CLI command.
```

Possible implementation detail:

- A CLI command may still exist underneath the skill for validation, status, or bookkeeping.
- But the product contract should be written around `/apply` as an agent workflow.
- Human-facing docs should describe what to ask the agent to do, then mention backing commands only as implementation details.

### One Apply Skill With Context Providers

Workspace mode should not require a second `/apply` skill. Users should keep one familiar workflow:

```text
/apply <change>
```

or, for a multi-repo workspace change:

```text
/apply <change> for <repo>
```

The skill should not hardcode repo-local vs workspace file conventions. Instead, it should ask OpenSpec for a normalized apply context.

Repo-local example:

```json
{
  "mode": "repo-local",
  "change": "add-dark-mode",
  "implementationRoot": "/repos/app",
  "contextFiles": [
    "openspec/changes/add-dark-mode/proposal.md",
    "openspec/changes/add-dark-mode/design.md",
    "openspec/changes/add-dark-mode/tasks.md"
  ],
  "tasksFile": "openspec/changes/add-dark-mode/tasks.md",
  "allowedEditRoots": [
    "/repos/app"
  ]
}
```

Workspace example:

```json
{
  "mode": "workspace",
  "change": "integrate-docs",
  "target": "openspec-landing",
  "implementationRoot": "/repos/openspec-landing",
  "contextFiles": [
    "workspace/changes/integrate-docs/proposal.md",
    "workspace/changes/integrate-docs/design.md",
    "workspace/changes/integrate-docs/tasks.md",
    "workspace/changes/integrate-docs/specs/openspec-landing/docs-routing/spec.md"
  ],
  "tasksFile": "workspace/changes/integrate-docs/tasks.md",
  "taskSection": "openspec-landing",
  "allowedEditRoots": [
    "/repos/openspec-landing"
  ]
}
```

Then the `/apply` skill has one flow:

1. Ask OpenSpec for apply context.
2. Read the returned context files.
3. Confirm/select the implementation checkout when needed.
4. Implement only inside the returned allowed edit roots.
5. Mark tasks complete in the returned task location.
6. Run the relevant validation.

If a workspace change has multiple targets and the user does not specify one, the skill should ask which repo slice to apply. Default behavior should be one repo slice at a time, because that keeps implementation scoped and reviewable.

This same pattern should probably apply to `/verify` and `/archive` too: keep one user-facing skill, with OpenSpec providing a normalized context for the current change mode.

### Branches And Worktrees

Workspace repo targets should be treated as logical repo targets, while branches and worktrees are execution checkouts for those targets.

From first principles, there are three different concepts:

```text
workspace change  -> central source of truth for plan/tasks/specs
target repo       -> logical repo affected by the plan
execution checkout -> branch/worktree where code is edited
```

The workspace should own the plan:

```text
workspace/
  changes/integrate-docs/
    proposal.md
    design.md
    tasks.md
    specs/
      openspec-landing/
```

Branches and worktrees should not become separate sources of truth for planning. They are places where the agent implements a target slice.

Current POC state:

```text
alias -> local path
```

Example:

```text
openspec -> /Users/me/repos/openspec
landing -> /Users/me/repos/openspec-landing
```

That is too thin for branch/worktree-aware work because one logical repo may have multiple valid local execution checkouts.

Better model:

```text
target repo: openspec-landing
known checkouts:
- /repos/openspec-landing                       branch: main
- /repos/openspec-landing-integrate-docs        branch: integrate-docs, worktree: yes
```

Then a workspace change can target the logical repo:

```text
integrate-docs targets openspec-landing
```

And `/apply integrate-docs for openspec-landing` can resolve or ask for the execution checkout:

```text
Use /repos/openspec-landing-integrate-docs for implementation?
```

The apply context should expose both the source of truth and the selected implementation checkout:

```text
Change: integrate-docs
Target repo: openspec-landing
Source of truth: /workspace/changes/integrate-docs
Implementation checkout: /repos/openspec-landing-integrate-docs
Branch: integrate-docs
Worktree: yes
Dirty: no
```

If there is exactly one usable checkout, `/apply` can use it. If there are multiple branches/worktrees or the selected checkout is dirty, detached, missing, or on an unexpected branch, the agent should pause and ask how to proceed. It should not silently switch branches or pick another worktree.

This does not prevent `/apply` from running from the workspace. It changes what `/apply` needs from OpenSpec:

```text
/apply reads the central workspace plan.
/apply chooses or confirms an execution checkout.
/apply implements only in that checkout.
/apply updates task progress in the workspace source of truth.
```

Possible storage split:

```text
.openspec/workspace.yaml
  repos:
    openspec-landing:
      remote: git@github.com:org/openspec-landing.git

.openspec/local.yaml
  checkouts:
    openspec-landing:
      default: /repos/openspec-landing
      worktrees:
        integrate-docs: /repos/openspec-landing-integrate-docs
```

The exact schema can change, but the product rule should stay stable:

```text
The workspace is the planning source of truth.
Branches/worktrees are implementation surfaces.
/apply means implement, not materialize.
```

### Repo Metadata Naming

The optional repo metadata fields `owner` and `handoff` are confusing in the current workspace inventory flow.

Current explanation:

- `--owner "<team or person>"` means who is responsible for the repo.
- `--handoff "<next step>"` means a free-form note about the next expected action when planning crosses into the repo.
- Both fields are informational only and do not gate tooling behavior.
- Both are stored on the alias in `.openspec/workspace.yaml`, so they are committed workspace metadata.

Questions:

- Are `owner` and `handoff` the right names for these concepts?
- Does `handoff` sound too process-heavy or imply workflow enforcement that does not exist?
- Should `owner` be renamed to something like `team`, `maintainer`, or `contact`?
- Should `handoff` be renamed to something like `guidance`, `notes`, `coordination`, or `reviewNote`?
- Should both fields be collapsed into a single `notes` or `guidance` field?
- Should the CLI help make clear that these are free-form informational hints, not access control or required workflow gates?

### Repo Initialization During Workspace Setup

`openspec workspace setup` creates the managed workspace root and workspace metadata, but it does not run `openspec init` inside repos that are added to the inventory.

Current behavior:

- Workspace creation initializes the workspace container: `.openspec/workspace.yaml`, `.openspec/local.yaml`, and `changes/`.
- `workspace setup` prompts for repo paths and calls the same registration flow as `workspace add-repo`.
- `workspace add-repo` validates that the target repo already contains repo-local OpenSpec state.
- Managed workspace roots intentionally do not have repo-local `openspec/` nesting today.
- If the repo does not have an `openspec/` directory, registration fails with:

```text
Repo path '<path>' does not contain repo-local OpenSpec state (missing openspec/)
```

Questions:

- Is it sufficiently clear that users should not need to run `openspec init` inside the managed workspace root?
- Should workspace setup offer to run `openspec init` in a repo that is missing repo-local OpenSpec state?
- Should `workspace add-repo` offer a clearer next step, such as `cd <repo> && openspec init`, when validation fails?
- Should there be a `--init` or `--init-repo` option for `workspace add-repo`?
- Should setup distinguish more clearly between initializing the workspace and initializing each repo?
- Is requiring repo-local OpenSpec state before inventory registration the right constraint, or should inventory allow repos before they are initialized?

### Pure Workspace and Non-Initialized Repos

The current workspace model assumes registered repos already have repo-local OpenSpec state. That may be too strict for users who want to coordinate entirely from the workspace root, or who want to include repos in inventory before adopting repo-local OpenSpec there.

Current implications:

- A managed workspace can exist without registered repos.
- A repo cannot currently be registered unless it has `openspec/`.
- Workspace targeted changes depend on registered aliases.
- Materialization, repo progress checks, and repo-local task status depend on repo-local OpenSpec state.

Questions:

- Should workspace inventory support non-initialized repos as planning-only targets?
- Should repo aliases have a capability/status like `planning-only`, `openspec-ready`, or `materializable`?
- Should `openspec workspace add-repo` allow missing `openspec/` with a flag such as `--planning-only`?
- If a repo is planning-only, should `openspec apply --repo <alias>` fail with an init/materialization next step?
- Can workspace status represent planning-only repos without treating them as broken?
- Is pure workspace mode enough for some teams, or is repo-local state required for the core OpenSpec workflow?

### Workspace Docs Fast Path

The workspace demo docs do not start from the practical user goal: "I want to do multi-repo planning, register one or more repos, and create a properly scoped change proposal."

The docs also over-index on direct CLI usage. The expected user path is agent-first: users want to know what prompt to give their coding agent and which directory/session to start from. CLI commands are implementation details the agent may run.

Broader product guidance: when designing or documenting workflows, do not turn the user's goal into a CLI recipe as the primary UX. Start with the human/agent interaction and treat commands, files, flags, and internal state as backing mechanisms. This is not workspace-specific; it is a general product-thinking rule for OpenSpec.

What the docs should answer first:

- What is the fastest path to set up multi-repo planning?
- What prompt should I give my coding agent?
- Which directory should I launch the agent from?
- What commands do I run when my repos already have OpenSpec state?
- What commands do I run when a repo is missing `openspec/`?
- How do I add one repo?
- How do I add multiple repos?
- How do I create a workspace change that is scoped to multiple repos?
- How do I open the scoped session after the proposal exists?

Agent-first quickstart shape:

1. Initialize repo-local OpenSpec state only where needed.
2. Open an agent in the managed workspace root, not in one of the repos.
3. Ask the agent to inspect registered repos and create a targeted workspace change.
4. Let the agent run the OpenSpec CLI commands from the workspace root.
5. Reopen or continue into the change-scoped workspace session with attached repos.

Example prompt:

```text
We are doing multi-repo planning with OpenSpec.

From this workspace root, inspect the registered repos, then create a targeted workspace change for:
<describe the cross-repo goal>

The change should target:
- repo-a
- repo-b

Do not modify repo-local implementation files yet. Create the workspace-level proposal/design/tasks first, then stop and tell me how to reopen the change-scoped session.
```

Proposed quickstart shape:

```bash
# 1. If a repo is missing OpenSpec state, initialize it first.
cd /path/to/repo-a
openspec init --tools none

cd /path/to/repo-b
openspec init --tools none

# 2. Create the workspace.
openspec workspace setup

# Or use the manual path.
openspec workspace create my-workspace
cd "$(openspec workspace path my-workspace)" # command does not exist today; example only
openspec workspace add-repo repo-a /path/to/repo-a
openspec workspace add-repo repo-b /path/to/repo-b

# 3. Create a multi-repo scoped change.
openspec new change my-cross-repo-change --targets repo-a,repo-b

# 4. Open the scoped planning session.
openspec workspace open --change my-cross-repo-change
```

Questions:

- Should docs lead with this fast path and move demo narrative later?
- Should docs lead with agent prompts first, then show the CLI commands the agent is expected to run?
- Should workspace setup finish by printing a copy-paste agent prompt and the workspace root to open?
- Should there be a command to print or cd-helper the managed workspace path after `workspace create`?
- Should setup support non-interactive repo registration for multiple repos in one command?
- Should the docs recommend `openspec init --tools none` for repos that only need repo-local OpenSpec state?
- Should the quickstart avoid `owner` and `handoff` until those fields are renamed or clarified?

### Workspace Doctor Output

The current `openspec workspace doctor` success output is too cryptic:

```text
Workspace doctor passed for /Users/tabishbidiwale/.local/share/openspec/workspaces/poc-workspace
Validated 2 registered aliases against 2 local overlay entries.
```

Problems:

- `alias` is an implementation term unless the user has just read the workspace model.
- `local overlay` is even more implementation-specific.
- The success output says something is registered, but does not show what is registered.
- Users running the command want to know which repos OpenSpec found and whether their paths are usable.

Questions:

- Should success output list registered repos directly, e.g. `openspec -> /path/to/repo`?
- Should the word `alias` be replaced with `repo name` or `workspace repo name` in human-facing output?
- Should `local overlay` be replaced with `local repo path mapping` or omitted entirely?
- Should `doctor` show both committed inventory and local resolved paths?
- Should `doctor --json` keep implementation names while human output uses clearer labels?
- Should `doctor` become the recommended way to answer "what repos are associated with this workspace?"

Possible success output:

```text
Workspace is healthy: /Users/tabishbidiwale/.local/share/openspec/workspaces/poc-workspace

Registered repos:
- openspec: /Users/tabishbidiwale/fission/repos/openspec
- openspec-landing: /Users/tabishbidiwale/fission/repos/openspec-landing

All 2 registered repos have valid local paths and repo-local OpenSpec state.
```

## Possible Direction

Split the workspace-open contract into two layers:

1. Stable workspace guidance in `AGENTS.md` or `CLAUDE.md`.
2. A short launch-time prompt that declares the exact current scope and points at the stable guidance.

Example shape:

```text
OpenSpec workspace session.

Mode: workspace-root
Workspace root: /path/to/workspace

Registered repos:
- openspec: /path/to/repo

Attached repos:
none

Follow the workspace OpenSpec rules in AGENTS.md or CLAUDE.md.
Treat the scope above as authoritative for this session.
```

### Workspace Open Agent Preference

The current `openspec workspace open --agent <tool>` behavior appears to save the provided agent as the workspace default in `.openspec/local.yaml`.

That is surprising from a user workflow perspective. A user who passes `--agent github-copilot` likely expects:

```text
Use GitHub Copilot for this workspace-open session.
```

They do not necessarily expect:

```text
Change the saved default agent for every future workspace-open session.
```

Expected product contract:

- `workspace setup` may ask for and save the preferred workspace-open agent.
- `workspace open` with no `--agent` should use the saved preferred agent.
- `workspace open --agent <tool>` should be a one-session override by default.
- Changing the saved default should require an explicit preference-setting action.

Possible implementation shapes:

```bash
openspec workspace config set-agent github-copilot
openspec workspace set-agent github-copilot
openspec workspace open --agent github-copilot --save-agent
```

Questions:

- Should the current `--agent` persistence be treated as a bug?
- Should there be a dedicated workspace preferences/config command?
- Should older workspaces with no `preferredAgent` still prompt once and persist the answer?
- Should `--prepare-only --agent <tool>` also avoid mutating the saved preference?
