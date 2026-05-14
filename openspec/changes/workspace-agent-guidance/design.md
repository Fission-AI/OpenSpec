## Context

`workspace-change-planning` deliberately kept workflow skills generic and path-agnostic. That was the right first step: the same skill can now ask the CLI where a change lives and avoid hardcoded `openspec/changes/<id>` assumptions.

The next problem is intent. The generated skills do not yet behave differently when they are installed into a workspace root. In particular, `openspec-new-change`, `openspec-propose`, and `openspec-ff-change` still create changes with:

```bash
openspec new change "<name>"
```

That works, but it loses the workspace-specific metadata this slice just introduced. It also relies on general schema instructions to teach workspace planning after the change is created, instead of telling the agent how to approach workspace planning up front.

## Goals / Non-Goals

**Goals:**
- Give workspace-installed agents explicit workspace planning guidance.
- Keep the guidance layered on top of existing workflow skills instead of creating an unrelated workflow family.
- Teach change-starting skills to use `--goal` for the product goal when creating workspace changes.
- Teach change-starting skills to use `--areas` only for known registered workspace link names.
- Preserve the ability to create a workspace change before all affected areas are known.
- Keep linked repos and folders read-only during planning unless an explicit implementation workflow provides an allowed edit root.

**Non-Goals:**
- Implement workspace apply, verify, or archive semantics.
- Add workspace slash command generation.
- Require agents to fully infer affected areas before creating a proposal.
- Add another required area manifest outside normal workspace planning artifacts.
- Replace the current `status --json` and `instructions --json` context contract.

## Decisions

### Layer Workspace Guidance Onto Existing Skills

Workspace setup/update should continue selecting normal workflow skills from the active global profile. The workspace-specific part should be an installed guidance layer or generation transform that augments those skills when they are written into a workspace root.

Alternative considered: create separate `openspec-workspace-*` skills. That would make workspace behavior obvious, but it risks duplicating every workflow and making repo-local and workspace flows diverge too early.

### Make Change-Starting Skills Workspace-Aware

The `new`, `propose`, and `ff` workflow skills should detect workspace context before creating a change. In workspace context, they should derive:

- a kebab-case change name
- a concise product goal for `--goal`
- a list of confident affected areas for `--areas`, using registered workspace link names only

If areas remain unclear, the skills should omit `--areas`, create the workspace change, and keep the unresolved area question in the proposal/specs/tasks.

Alternative considered: always omit `--areas` and rely on artifact content. That preserves flexibility but wastes the affected-area metadata and makes status less helpful immediately after creation.

### Keep Goal Capture Lightweight

The goal captured by `--goal` should remain lightweight metadata, not a substitute for `proposal.md`. The generated proposal should still explain the goal in normal product language.

Alternative considered: have `--goal` prefill proposal content. That may be useful later, but this change should first make the agent use the existing flag consistently.

### Treat Metadata Flags As Workspace-Scoped

`--areas` is already rejected outside workspace-scoped change creation. `--goal` should either follow that same workspace-scoped rule or the CLI should clearly document any repo-local meaning before keeping it generic. The preferred direction is to make both flags workspace planning metadata so users and skills have one clear mental model.

### Keep Guards For Unsupported Workspace Workflows

Apply, verify, archive, sync, and bulk archive should continue inspecting `actionContext`. If workspace status reports no `allowedEditRoots`, skills should stop before implementation edits. This change should improve planning guidance without loosening those safety boundaries.

## Risks / Trade-offs

- Skill content can become too conditional -> keep workspace-specific guidance short and action-oriented.
- Agents may over-infer affected areas -> require `--areas` only for confident registered link names.
- `--goal` repo-local behavior may already be observable -> decide whether to reject it outside workspaces or document it before implementation.
- Duplicated instructions across skills can drift -> use a shared helper or generation transform where practical.
