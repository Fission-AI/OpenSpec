# Intent and lifecycle product exploration

**Status:** Private product exploration; not an implementation plan or shipped behavior.
**Purpose:** Organize product direction, the selected lifecycle model, and a local Codex handoff.

## Local workspace

- Repository: `../openspec` (from this worktree)
- Worktree: `../openspec-intent-and-lifecycle` (from the original repository)
- Branch: `explore/intent-and-lifecycle`
- Base: local `main` at `2bd5bc3b`, created November 5, 2026 without fetching.
- This document set is maintained on the local branch. No push or remote publication is authorized.

Keep this material local. Do not push, upload, publish, or open a pull request. Sensitive content has not been sanitized. Any later publication requires a separate review and explicit user authorization.

## Context and reading order

The exploration connects upstream product intent to focused OpenSpec changes without duplicating canonical requirements. It considers source revisions, drift review, lifecycle checkpoints, deterministic checks, optional agent actions, and later plugin profiles.

1. [Intent to implementation](direction/intent-to-implementation.md) — overall product direction.
2. [External context for changes](direction/external-context-for-changes.md) — context-workflow requirements and unresolved release questions.
3. [Roadmap](direction/roadmap.md) — single source for proposed delivery sequencing.
4. [Imagined launch blog](launch/imagined-launch-blog.md) — intended user experience.
5. [Imagined launch design gaps](launch/imagined-launch-design-gaps.md) — unresolved design work.
6. [Lifecycle checkpoints](lifecycle/lifecycle-checkpoints.md) — consolidated actions/triggers design and enterprise requirements coverage analysis.
7. [Lifecycle checkpoints launch](lifecycle/lifecycle-checkpoints-launch.md) — illustrated experience, with later plugin and profile concepts.

## Selected model and document ownership

On November 5, 2026, the user selected **actions and triggers**. A check is one kind of action; an optional review is another. A checkpoint is a lifecycle moment explicitly invoked by a skill, CLI, or custom caller. Findings and suggestions remain separate.

The technical design now consolidates the older checkpoint proposal, preserving its enterprise requirements coverage analysis, trust limits, and pilot questions. It owns the model. The roadmap owns sequencing. Launch drafts illustrate behavior rather than define independent release plans.

The initial lifecycle pilot uses a built-in Git check, optional agent guidance, and warning-only policy. Plugin distribution, arbitrary executable commands, blocking, and orchestration remain later work. Exact APIs and unresolved execution details are proposals; no feature implementation is authorized by this documentation update.

## Sources and anonymization

Imported from seven private exploration documents on November 5, 2026, then revised locally with the user's authorization to adopt actions/triggers and consolidate the roadmap and design. Customer and upstream-system names, personal filesystem paths, source attachment names, and private page/conversation identifiers have been removed from this document set. Examples use generic enterprise teams, upstream product requirements, and placeholder repositories and packages.

The original remote pages were not changed and may still contain identifying information. This editing pass does not authorize publication; keep all material local pending a separate review.

## Codex handoff

Work only in the worktree above. Read this README, the direction document, the PRD, the roadmap, and the consolidated lifecycle technical design first. Use the launch posts as illustrations. Map the existing implementation before proposing changes. Distinguish observed behavior, agreed direction, proposals, and unresolved questions. This handoff authorizes organizing and reviewing the material, not implementing the proposed features.

Keep the consolidated document ownership clear when making future authorized edits. Do not run proposed commands merely because they appear in a document. Do not push, publish, upload, or create a pull request.

To continue from another local Codex chat, set its project folder to the worktree path above and ask it to read `openspec/projects/intent-and-lifecycle/README.md`.
