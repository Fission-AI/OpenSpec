# Lifecycle extensibility

An enterprise team already turns upstream product requirements into OpenSpec changes. We want to add useful checks and optional reviews around that workflow while keeping generation working as it does today.

The first pilot checks source drift before Apply and offers a feedback review afterward. A check before Archive may be useful too. Later, teams should be able to share independently maintained plugins, install them globally, enable them per project, and use shared profiles.

## Start here

- [Lifecycle launch post](lifecycle/lifecycle-checkpoints-launch.md) — the experience we're building toward.
- [Pilot design](lifecycle/lifecycle-checkpoints.md) — how existing skills use it and what we need to build first.
- [Roadmap](direction/roadmap.md) — the next steps.

The selected lifecycle command is `openspec lifecycle check --at apply.before --change <name> --json`.

The design is proposed, not implemented. The launch post is a draft of the intended experience. Neither claims these commands or configuration fields work today.

## Background

The [enterprise requirements inventory](research/enterprise-requirements.md) preserves the broader integration needs.

The [product direction](direction/intent-to-implementation.md), [external-context PRD](direction/external-context-for-changes.md), [product launch draft](launch/launch-post-draft.md), and [design draft](launch/launch-design-draft.md) explore wider questions about context and contract verification. Keep that work separate from this pilot; it doesn't require replacing the existing generator.

## Working on this proposal

Use branch `explore/intent-and-lifecycle` in `../openspec-intent-and-lifecycle`, beside the original `openspec` checkout. It was created from local `main` at `2bd5bc3b` on November 5, 2026.

Read the launch post and pilot design first. Map the proposed calls onto the existing skills before implementing them. We have not inspected the private integration skills; their current generation behavior is the starting point supplied by the user.

These docs came from private exploration and have been revised locally. Identifying names, attachment names, personal paths, and private page links were removed. Original remote pages were not changed.

This proposal is being shared as a draft PR. It is not ready for review or implementation.
