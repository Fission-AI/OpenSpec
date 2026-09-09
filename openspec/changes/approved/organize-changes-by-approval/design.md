## Context

New changes belong in proposed; user approval or apply moves them into approved. Existing flat changes stay readable. See proposal.md for upstream discussion and contribution guidance.

## Goals / Non-Goals

The directory carries approval. The agent performs moves and handles conversational intent. No approval command, migration, metadata, approval column, or automated legacy classification.

## Decisions

- Share a small discovery/resolution helper across existing CLI consumers. Search only flat changes and the two explicit containers; keep bare change names and existing command output. Reject ambiguous names instead of choosing a different change silently.
- Create new changes under proposed. Keep old changes where they are; users and their agents can see them during ordinary scanning. Update never mass-moves them.
- Put brief approval guidance in the shared workflow instructions: use the resolved planning home, move the finished change on explicit approval or apply, preserve its contents, and refresh paths. Approval alone does not start implementation. Agents use their available filesystem tools on Windows, macOS, and Linux.
- Archive approved changes; reject proposed changes. Preserve archive behavior for existing flat changes and keep the destination unchanged. Use native Node.js paths in CLI lookup; preserve existing traversal and linked-path protections.

## Risks / Trade-offs

Bare names can collide across directories after a merge; report the conflicting paths. Existing changes named proposed or approved can collide with container names; preserve marked change directories and report a conflict before using them as containers. Older CLIs and scripts constructing flat paths need updating. Conversational behavior relies on the user's LLM following workflow instructions.

## Migration Plan

No migration. Ship lookup, creation, and workflow instructions together. The user authorized this local implementation; reconcile with #1367 and #1818 before proposing it upstream.
