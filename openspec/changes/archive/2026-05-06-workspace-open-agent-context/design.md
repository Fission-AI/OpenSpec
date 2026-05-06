## Product Shape

`workspace open` should feel like opening a multi-root working set.

The user model is:

```text
workspace setup = create the planning home and choose the default opener
workspace links = the repos or folders OpenSpec can plan across
workspace open = open that linked working set
--agent = use a different agent for this one session
--editor = open the working set as an editor workspace
```

Repo or folder visibility supports exploration and planning. Opening a workspace gives the agent or editor access to linked paths, and implementation starts through an explicit later workflow.

## Command Surface

Supported v1 forms:

```bash
openspec workspace open
openspec workspace open platform
openspec workspace open --agent codex
openspec workspace open platform --agent github-copilot
openspec workspace open --editor
```

The positional workspace name is the primary explicit selection surface for `open`. User-facing docs should prefer the positional form because a flag such as `--workspace <name>` repeats the noun.

For consistency with other workspace commands and scripts, `workspace open` may also support `--workspace <name>` as an alias for the positional name:

```bash
openspec workspace open platform
openspec workspace open --workspace platform
```

User-facing docs should prefer the positional form. If both are provided and they differ, OpenSpec should fail with a clear conflict error.

`--prepare-only` should not be included. The POC used it to build and print launch surfaces without starting the external tool, but that does not map cleanly to a user-facing intent.

`--json` should not be included in this slice. If a future integration needs a machine-readable resolved-open context, design that as a separate context/query surface instead of overloading the launching command.

`--change` should be deferred. Change-scoped open depends on workspace change planning and target semantics that this slice should not invent.

## Workspace Selection

Selection should follow this order:

1. If a positional workspace name is provided, open that known workspace.
2. Otherwise, if the command runs from inside a workspace, open the current workspace.
3. Otherwise, if exactly one workspace is known locally, open it.
4. Otherwise, if multiple workspaces are known and the terminal is interactive, present a picker.
5. Otherwise, fail with a clear message that names the known workspaces and asks the user to pass the workspace name.

This keeps the common cases direct while still supporting global use.

## Preferred Opener

Workspace setup should ask which opener the user wants by default. The answer is machine-local state because different machines may have different installed agents or editors.

`workspace open` uses the saved opener when no override is passed.

`--agent <tool>` is a one-session override that leaves the saved preference unchanged. Persisting a changed default should require an explicit preference/config action in a later slice if users need it.

This slice should not add global workspace opener config. OpenSpec already has a global config system, and workspace-level defaults can be added there later if repeated setup makes the local prompt feel noisy.

The local preference should be shaped so a future global default can fit underneath it with smooth migration. The intended precedence is:

```text
command override
  -> workspace-local preferred opener
  -> future global workspace default opener
  -> interactive prompt or built-in fallback
```

In future config terms, that global default might look like `workspace.defaultOpener`; this slice documents the precedence for later implementation.

Store the preferred opener as a structured object in `.openspec-workspace/local.yaml`:

```yaml
preferred_opener:
  kind: agent
  id: codex
```

```yaml
preferred_opener:
  kind: editor
  id: vscode
```

Allowed initial values:

```text
kind: agent, id: codex
kind: agent, id: claude
kind: agent, id: github-copilot
kind: editor, id: vscode
```

The structure keeps the agent/editor distinction clear and leaves room for future opener variants without changing the local-state shape.

Interactive setup should show all supported opener choices, but it should order detected/available openers first. Unavailable choices should still be visible with a note such as `not found on PATH`.

Setup should prefer the plain editor option over an agent when a fallback default is needed for an interactive picker.

Non-interactive setup stores a preferred opener when the caller explicitly passes an opener option. Otherwise, it leaves opener selection for a later interactive `workspace open` prompt or a non-interactive error that explains how to choose an opener.

The setup-time flag should be:

```bash
openspec workspace setup --no-interactive --name platform --link /repo --opener codex
openspec workspace setup --no-interactive --name platform --link /repo --opener editor
```

`--opener <id>` sets the stored preference. It is different from `workspace open --agent <id>` and `workspace open --editor`, which are one-session runtime overrides.

Initial opener detection should stay simple and executable-based:

```text
VS Code editor: code
Codex: codex
Claude: claude
GitHub Copilot in VS Code: code
```

Keep initial detection scoped to executable availability in this slice.

Supported agent values for the initial open surface should be limited to tools with a real launch or attachment mechanism:

```text
claude
codex
github-copilot
```

Plain editor open should be represented by `--editor` with an explicit editor kind.

For this slice, `--editor` means VS Code editor. The `.code-workspace` format is VS Code-specific, so prompts and errors should call this `VS Code editor` rather than implying generic editor support.

`github-copilot` means the VS Code Copilot experience. It should open the maintained `.code-workspace` in VS Code because that is the product surface where this Copilot mode is available.

If OpenSpec later supports a Copilot CLI agent, it should use a distinct value such as `github-copilot-cli` and launch the CLI agent directly. VS Code Copilot and a CLI agent have different opener mechanics, so they should remain distinct opener values.

## Opener Availability

`workspace open` should fail with a clear error when the selected opener is unavailable on the current machine.

The selected opener remains required because it represents user intent, whether it came from local preference or a command-line override.

Errors should name the missing executable or unavailable opener and suggest a concrete next step. For editor-based open, the error should include the `.code-workspace` path so the user can open it manually if needed.

When no preferred opener is stored and no command-line override is provided, `workspace open` should prompt in interactive mode. In non-interactive mode, it should fail and tell the user to pass either an agent override or the editor option.

## Editor Open

`--editor` opens the workspace root plus every linked repo or folder with a valid local path.

For VS Code-style editor support, OpenSpec should create and maintain a `.code-workspace` file as part of the workspace setup/link/relink lifecycle. `workspace open` should launch against existing workspace state.

Expected local workspace shape:

```text
workspace-root/
  changes/
  <workspace-name>.code-workspace
  .openspec-workspace/
    workspace.yaml
    local.yaml
```

The `.code-workspace` file should include the workspace root and each linked repo or folder with a valid local path. Because linked paths come from machine-local workspace state, OpenSpec-created workspaces should ignore the maintained `.code-workspace` file by default.

The ignore rule should target the specific maintained file and leave other `*.code-workspace` files available for user-authored tracking:

```text
<workspace-name>.code-workspace
```

This lets teams add a separate user-authored portable `.code-workspace` later if they have a shared relative-path layout.

`workspace setup`, `workspace link`, and `workspace relink` should all run the same open-surface sync after mutating workspace state. That sync owns:

- `AGENTS.md`
- `<workspace-name>.code-workspace`
- workspace ignore rules for machine-local files

Even when a command only changes local state, such as `workspace relink`, it should refresh the full openable workspace surface so user-facing files do not drift.

`--agent github-copilot` may use the same editor workspace mechanics, but it also needs Copilot prompt context. Plain `--editor` keeps a normal editor-workspace intent.

`--agent github-copilot` should still open VS Code. The distinction from `--editor` is intent: `--editor` opens the workspace as a normal editor workspace, while `--agent github-copilot` opens the same editor workspace for the user to work with the VS Code Copilot agent experience.

## Workspace Guidance

Workspace setup should install stable guidance in the workspace root, preferably `AGENTS.md`.

The guidance should explain durable workspace rules:

- the workspace root is the planning home
- `changes/` contains workspace-level planning
- linked repos and folders are available for exploration and planning
- visibility supports exploration and planning
- implementation edits start after the user explicitly asks for implementation work

The managed `AGENTS.md` text should stay short and durable, covering stable workspace guidance while runtime details remain discoverable from workspace state. A starting shape:

```markdown
# OpenSpec Workspace Guidance

This directory is an OpenSpec workspace for planning across linked repos or folders.

- Use `changes/` for workspace-level planning.
- Linked repos and folders are available for exploration and planning.
- Repo or folder visibility supports exploration and planning.
- Make implementation edits after the user explicitly asks for implementation work.
- Treat linked repos and folders as the implementation homes for their owned code.
- Use OpenSpec workspace commands instead of hand-editing `.openspec-workspace/*.yaml`.
```

`workspace open` is a launching feature. It should launch the selected opener against existing workspace files.

For Claude and Codex, `workspace open` may still need to pass workspace and linked directory arguments to the agent process at launch because those tools do not consume `.code-workspace` directly. If an opener requires an initial prompt argument, it should be minimal, such as `Open this OpenSpec workspace.`

Dynamic workspace facts should normally be discoverable from existing files:

- linked paths: `.openspec-workspace/local.yaml`
- stable link names: `.openspec-workspace/workspace.yaml`
- active workspace changes: `changes/`
- editor working set: `<workspace-name>.code-workspace`

Report a command file or prompt file path only when the file is actually written and used.

OpenSpec should own a marked workspace-guidance block inside `AGENTS.md`:

```markdown
<!-- OPENSPEC:WORKSPACE-GUIDANCE:START -->
# OpenSpec Workspace Guidance

...
<!-- OPENSPEC:WORKSPACE-GUIDANCE:END -->
```

`workspace setup`, `workspace link`, and `workspace relink` may rewrite that marked block during open-surface sync. Content outside the marked block should be preserved so users can keep their own workspace notes in the same file.

If `AGENTS.md` is missing, OpenSpec should recreate it. If `AGENTS.md` exists and the markers are absent, OpenSpec should append the managed block while preserving existing content.

## Linked Paths

Root workspace open should attach every linked repo or folder with a valid local path.

Broken links are skipped during workspace open. OpenSpec should surface clear status in human output, with `openspec workspace doctor` as the repair path.

Links with repo-local `openspec/` state absent remain valid for workspace open. Missing repo-local OpenSpec state can matter later for implementation readiness while still allowing visibility for exploration and planning.

## Safety Boundary

The opening prompt or editor guidance should say:

```text
Linked repos and folders are visible for exploration and planning.
Make implementation edits after the user explicitly asks for implementation work.
```

Prompt guidance is acceptable for this slice because apply/verify/archive sit outside the open surface. Later implementation workflows should enforce mode and scope through explicit context providers as well as prompt wording.
