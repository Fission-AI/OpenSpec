# Workspace Change Planning PRD

## Summary

OpenSpec should help people plan one change across one or more repos or folders without making workspace mode feel like a second product.

The product should center on a simple idea: a change has one shared plan, and that plan can point to the places where work will happen.

For a normal repo, the plan and the work usually live in the same repo. For a workspace, the plan lives in the workspace and the work happens in one or more linked repos or folders.

## Problem

OpenSpec currently treats a change as something that lives under one repo-local `openspec/changes/<name>` folder.

That works well for a single repo, but it becomes awkward when the user is planning across several repos or folders. The user needs one place to capture the goal, decisions, affected places, risks, and coordination tasks. The user should not have to create repo-local change folders before the plan is clear.

The current workspace notes also use terms like targets, slices, scopes, and materialization. Those terms describe implementation details more than the user experience.

## Product Direction

OpenSpec should make the familiar change workflow work in more places.

A user should still think in terms of creating a change, exploring it, writing a proposal, applying the work, verifying it, and archiving it.

The difference is where the plan lives and where implementation is allowed to happen.

In a repo, the planning home is the repo. In a workspace, the planning home is the workspace. In both cases, the user is still working with a change.

## What Already Exists

OpenSpec already has several pieces needed for this direction.

Workspaces already have a real root folder and a planning path at `changes/`.

Workspaces can already link repos or folders, and those links already have stable names.

Workspace state already separates shared workspace information from local machine paths.

Workspace open already makes linked repos and folders visible to agents before a change exists.

Workflow schemas already define plan file types, templates, order, and apply rules.

`openspec status --change <id> --json` already exists.

`openspec instructions --json` already exists.

Generated skills already call `status` and `instructions` in important places.

This means the first step is mostly connection work, not a full new product.

## What Is Missing

OpenSpec does not yet have one shared way to answer this question: given this command, which planning home and change should it use?

That missing layer is the main gap.

Workspace links are close to affected areas, but changes do not record or report affected areas yet.

Plan file paths exist in instructions, but only for repo-local change folders.

Status output exists, but it does not yet explain the planning home, affected areas, allowed edit roots, or next steps clearly enough for agents.

Apply exists, but it does not yet pick a work focus before editing.

Workspace verify and archive are not ready yet.

## Product Language

| Product term | Meaning | Avoid using |
| --- | --- | --- |
| Change | The overall goal and plan for a feature, fix, project, or other piece of work. | Change Plan |
| Planning home | The place where the shared plan lives. This can be a repo or a workspace. | Planning Surface |
| Affected area | A repo, folder, package, app, service, or docs site touched by the change. | Target, repo slice |
| Phase | A delivery step inside a larger change. Most changes do not need phases. | Slice |
| Work focus | The one affected area, and optional phase, currently being implemented or verified. | Work Unit |
| Plan file | A proposal, design, task list, spec draft, or note attached to the right part of the change. | Scoped Artifact |
| Next step guidance | The CLI output that tells an agent what to read, where to write, and what not to edit. | Action Context |

## User Experience

Maya opens a workspace that links `api`, `web`, and `billing`.

She creates a change called `add-3ds`.

OpenSpec creates one shared plan in the workspace. The plan describes the goal, the affected areas, the risks, the decisions, and the coordination tasks.

No files are written inside `api`, `web`, or `billing` just because the shared plan exists.

Later, Maya says she wants to apply the change to `api`.

OpenSpec reads the shared plan, confirms the work focus is `api`, and tells the agent that implementation edits are allowed only inside the `api` checkout.

When `api` is done, Maya can move the work focus to `web` or `billing`.

When all affected areas are done, OpenSpec can verify and archive the whole change.

## Requirements

### A Change Has One Shared Plan

A workspace change should capture the shared goal once.

The shared plan should hold the goal, decisions, affected areas, risks, and coordination tasks.

Creating the shared plan should not create files inside linked repos or folders.

### Repo Changes Stay Simple

A repo-local change should keep working as it does today.

A repo-local change should be treated as the simplest version of the same model, with one planning home and one affected area.

Existing `openspec/changes/<name>` folders should keep working.

### Workspaces Add Reach, Not A New Workflow

Workspace mode should not create separate workflow commands or separate workflow skills.

Users should still use the same workflow words: explore, propose, apply, verify, and archive.

The CLI should provide enough next step guidance that agent skills do not need to hardcode where change files live.

### Affected Areas Come From The Plan

OpenSpec should support affected areas as first-class plan information.

An affected area may be a linked repo, a linked folder, a package, an app, a service, or a docs site.

Workspace links are a strong starting point for affected areas, because they already provide stable names and local paths.

The product should not force users to pick all affected areas before they have explored the change.

### Phases Are Optional

Most changes should not need phases.

Large changes may use phases when the work needs to be split into delivery steps.

Phases should describe delivery order, not repo ownership.

### Plan Files Attach Where They Make Sense

A proposal usually belongs to the whole change.

A design should live at the broadest level where the decision applies.

Tasks may belong to the whole change, one phase, one affected area, or one work focus.

Specs should live as close as possible to the place that owns the behavior.

OpenSpec should not force every affected area or phase to have every kind of plan file.

### Apply Means Start Work

Applying a change should mean starting or continuing implementation work.

In a repo-local change, apply should work through the repo-local tasks.

In a workspace change, apply should pick or confirm a work focus first.

After the work focus is selected, OpenSpec should tell the agent which plan files to read and which repo or folder may be edited.

### Status Should Guide Agents

`openspec status --change <id> --json` should become the main machine-readable guide for agents.

It should say where the plan lives, which affected areas exist, which plan files matter, what should happen next, and which edit roots are allowed.

The JSON should use plain names such as `nextSteps` and `actionContext`.

Agent skills should use this output instead of assuming that every change lives under `openspec/changes/<id>`.

## Configuration And Extension

OpenSpec already has a useful extension point through workflow schemas.

That should remain the main extension path.

Schemas should grow carefully so they can describe where plan files may live, what kinds of plan files exist, and how apply should find its tasks.

Project config should continue to provide shared context and rules.

Custom validators, custom plan file types, and custom scope kinds should come later, after the first end-to-end workspace flow is working.

OpenSpec should not add a broad workspace-specific config layer first.

## Implementation Shape

The first implementation should keep the current repo-local layout working.

The first workspace implementation should create changes under the workspace `changes/<id>` folder.

The system should introduce a small shared planning-home resolver.

The resolver should answer where the plan lives, where the change lives, which files matter, which affected areas are known, and which edit roots are allowed.

The system should introduce a richer change model that can record affected areas, optional phases, plan file locations, and the current work focus.

The first version of this model should stay small. It should not add custom validators, custom scope kinds, deep folder trees, or workspace archive behavior.

The system should enrich status and instruction output before changing archive behavior.

Archive and spec sync should come later because they are the highest-risk parts of the current system.

## Rollout

### Step 1: Connect Existing Pieces

Add the small planning-home resolver.

Keep repo-local behavior unchanged.

Use the existing workspace root, workspace links, workflow schema, status command, and instructions command.

The goal of this step is to stop spreading workspace checks through individual commands.

### Step 2: Product Model And Status

Update the change model and status JSON while keeping current repo-local storage.

The goal of this step is to let agents stop guessing paths.

Status should return the planning home, change path, plan file paths, affected areas when known, next steps, and allowed edit roots when relevant.

### Step 3: Workspace Change Creation

Allow a workspace to create one shared change under `changes/<id>`.

This step should not write into linked repos or folders.

### Step 4: Affected Areas

Use workspace links as the first source of affected areas.

Let the plan confirm or refine which linked repos or folders are affected.

### Step 5: Work Focus Apply

Teach apply to select one affected area before implementation starts.

The CLI should return the allowed edit root for that selected work focus.

### Step 6: Scoped Plan Files

Allow selected plan files to live at the level where they make sense.

Start with simple paths before introducing a deep folder tree.

### Step 7: Verify And Archive

Add per-area verification and final whole-change archive once planning and apply are stable.

## Risks

The biggest risk is changing archive too early.

Archive currently assumes one repo-local change and one repo-local specs folder. Workspace archive needs a clearer model for partial completion, per-area progress, and final completion.

The second biggest risk is exposing too many new terms to users.

The product should keep the visible workflow simple and push richer structure into CLI JSON for agents.

The third biggest risk is overbuilding the file tree.

OpenSpec should avoid creating a folder for every possible phase and affected area unless there is a real plan file to put there.

## Decision

The change should be reframed from workspace-specific commands to shared change planning.

Workspace support should become one use case of a more general model where a change has a planning home, affected areas, optional phases, plan files, and one current work focus.

The user-facing workflow should stay familiar.

The internal model should become richer enough for agents to act safely without hardcoded paths.
