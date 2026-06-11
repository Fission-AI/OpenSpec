# User-Directed Follow-Up: Workset Correction (post-capstone review)

> **Superseded in part (2026-06-12, later the same day):** continued
> design review landed on a different model — worksets are purely
> LOCAL, personal, manually composed named views (see roadmap item
> 4.2, which is authoritative). The change-anchored `workset <change>`
> form (§1), the dissolution of the `repo` group (§3), and the
> declaration-derived accretion flows are superseded; `openspec
> context` and the repo map remain unchanged. Sections 2 (session
> boundary / launch consumers), 4 (no shared grouping registry — now
> "not a *shared* one"), and 5 (grammar guardrails) still stand.

Date: 2026-06-12. Source: owner design review of the 4.1 autonomous
decisions (the `Decided autonomously (review me)` loop closing as
intended). This supersedes the 4.1 naming/scoping decisions; it does not
reopen any roadmap-locked decision. Implementation should run as a
follow-up slice with the standard per-slice discipline.

## 1. `openspec context` becomes `openspec workset`, anchored on the change

- Rename the 4.1 surface to `openspec workset`. "Context" names the data,
  not the job; "working set" is the roadmap's own noun (Phase 4 goal:
  "everything **this work** relates to in one working set") and the
  established CS/Eclipse term for a derived, actively-in-use subset.
- Primary form: `openspec workset <change-name>` — the anchor is the work
  item, not the root. Members and their roles derive from the change
  outward: the root the change lives in (location), the change's codebase
  narrowing with the root's declared list as fallback (declaration), the
  root's referenced stores (declaration), paths via the machine map.
  Emitted `.code-workspace` files are named after the change — the named,
  reopenable view is the file, keyed to the work.
- Bare `openspec workset` remains the root-union view (everything the
  resolved root's declarations describe).
- `--json` stays the agent brief and gains three inline operating-rule
  lines: one root at a time; referenced stores are read-only context;
  declared codebases are where work lands; reach another root explicitly
  with `--store`.
- Rationale for rejecting alternatives is settled; do not relitigate:
  `view` (breaking change vs the shipped dashboard; not specific),
  `open` (verb without object), `workspace` (object grammar, industry
  overload, self-collision with `.code-workspace`).

## 2. The workset must shape the agent session boundary (launch consumer)

Emitted paths do not cross agent sandbox boundaries: Claude Code prompts
outside its working dirs; codex sandboxes to launch roots. A brief that
only prints paths is the degraded mode. Therefore:

- `--code-workspace` (shipped) is route 1: IDE agents inherit the
  multi-root boundary from the workspace file.
- Add route 2: a launch flag (`workset open <change>` or `--open`) that
  starts the configured consumer with the members granted — editor via the
  workspace file; CLI agents via their boundary flags (`--add-dir` /
  sandbox roots). Minimal version: editor only; degrade to printing the
  file path when no opener is available.
- Route 3 (brief-only) remains valid: exact paths let an agent make a
  precise access request a human can approve once.

## 3. The `repo` command group dissolves into one plumbing command

- The registry's repos/codebases section stays exactly as shipped (the
  machine-local name→path map is required by every route above).
- The user-facing `repo register/unregister/list` group is replaced by a
  single low-profile command:
  `openspec map` (list) / `openspec map <name> <path>` (set) /
  `openspec map <name> --forget` (remove). Plumbing tier in help; never
  taught as a primary workflow.
- Primary interfaces for filling the map: point-of-need prompts
  (interactive `workset`/`doctor`: locate-or-clone when a declared
  codebase is missing) and verbatim fix strings in diagnostics (the
  agent/headless path). Mapping accretes at first contact with the code;
  declarations accrete when a change first names a codebase (offer to
  declare, with remote). Store setup declares nothing.
- Auto-fill is welcome but bounded: clone-through-fix writes the map as a
  byproduct; origin observation may fill **blank** entries only — never
  silently overwrite an existing mapping. Entries carry provenance
  (observed vs manual) so doctor can explain itself.
- Machine tokens (`targets:`, `target_*`, registry `repos:`) stay as
  shipped — zero-cost option. A `codebase_*` token rename is optional
  later cleanup, not part of this correction. Human-facing prose uses
  plain language ("the repos this change is about").

## 4. No workspace-style grouping registry

Persistence of groupings lives in declarations (committed, team-shared)
plus the machine map; named views are the per-change `.code-workspace`
files (the editor's recents are the reopen surface; hand-editing the file
covers ad-hoc membership). Reintroducing registered groupings would
recreate a second membership truth, an object lifecycle, and local-only
state. Park "named saved sets beyond change-named files" as a Later Idea
gated on real-usage evidence.

## 5. Grammar principles (record as standing guardrails)

- Three tiers: closed-set product objects get noun groups (`store`);
  open-set artifact collections ride generic verbs with the type as data
  (no per-collection command groups, ever; the `change` group is frozen
  legacy convenience); derived surfaces are verbs or result-nouns
  (`doctor`, `workset`); plumbing gets a single verb (`map`).
- "Workspace" stays permanently retired as a product noun.
- Lifecycle stays in skills/schemas; the CLI remains the generic data
  plane.
