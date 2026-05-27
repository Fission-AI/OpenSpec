# Proposed Initiative Next / Agent Handoff UX

## Status

Discussion draft. Not locked into the numbered roadmap yet.

## Why This Exists

The GSD workspace comparison highlighted a UX gap: OpenSpec has increasingly
good discovery primitives, but agents still need to infer the next useful step
from several commands.

The candidate idea is a tiny "what now?" handoff command after initiative
discovery from the current repo or workspace. It should not become a dashboard,
work-progress status view, or replacement for workspace local-view behavior.

## Candidate Goal

Help an agent answer:

```text
What should I do next for this initiative from the current repo or workspace?
```

## Possible Command Shape

```bash
openspec initiative next <id> --json
```

Possible response:

```json
{
  "initiative": "billing-launch",
  "next_action": "create_repo_change",
  "reason": "initiative found, no linked local change exists for this repo",
  "suggested_command": "openspec new change add-billing-api --initiative billing-launch"
}
```

## Discussion Points To Review

- Should this become a numbered roadmap item before workspace initiative
  opening?
- Is `initiative next` the right command name, or should this guidance live
  inside workspace initiative opening or repo-local status?
- Should the command suggest exactly one next action, or return a ranked set of
  possible actions?
- Should it inspect actual work progress, or stay limited to handoff readiness?
- How should it behave when no stores are registered, the initiative is
  ambiguous, the local repo is unrelated, or linked changes already exist?

## Boundaries

- Do not add progress/status semantics in the first version.
- Do not create changes, clone repos, or mutate workspace state.
- Do not make workspace opening a prerequisite.
- Prefer agent-readable JSON over broad interactive UX in the first slice.
