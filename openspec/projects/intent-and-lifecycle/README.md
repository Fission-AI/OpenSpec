# Lifecycle hooks

A project defines named actions and attaches them to points in the OpenSpec workflow, such as before Apply starts or after its tasks finish. When an agent reaches one of those points, it asks OpenSpec which actions apply and handles them itself.

The pilot proves this with two user-defined actions. In the first, the agent rereads linked requirements and compares them with the plan. In the second, the agent runs a Git drift script the project maintains. Neither is built into OpenSpec.

Detecting and managing drift remains a goal, and user-defined actions are how the pilot serves it. A trigger's `mode` and `policy` are separate concepts, and the pilot supports `mode` only. A general way for a change to reference what it depends on is a separate exploration. Plugins, native executable actions, and agent orchestration are future work.

## Start here

- [Roadmap](direction/roadmap.md): the PR sequence and its two release checkpoints.
- [Lifecycle pilot proposal](lifecycle/pilot-proposal.md): the design, the config shape, and what proves it works.
- [Lifecycle guide (draft)](lifecycle/guide-draft.md): the experience from the user's side.

The proposed command is `openspec lifecycle actions --at <hook> --json`.

The design is proposed, not implemented. None of these docs claims the command or configuration fields work today.

## Background

The [enterprise requirements inventory](research/enterprise-requirements.md) preserves the broader integration needs.

The [product direction](direction/intent-to-implementation.md), [external-context PRD](direction/external-context-for-changes.md), [product launch post (draft)](launch/product-launch-post-draft.md), and [product open questions](launch/product-open-questions.md) explore wider questions about context and contract verification. Keep that work separate from this pilot.

## Working on this proposal

Use branch `explore/intent-and-lifecycle` in `../openspec-intent-and-lifecycle`, beside the original `openspec` checkout. It was created from local `main` at `2bd5bc3b` on November 5, 2026.

Read the roadmap and pilot proposal first. We have not inspected the private integration skills. Mapping where they would call a hook is part of checking the custom-caller path.

These docs came from private exploration and have been revised locally. Identifying names, attachment names, personal paths, and private page links were removed. Original remote pages were not changed.

This proposal is being shared as a draft PR. It is not ready for review or implementation.
