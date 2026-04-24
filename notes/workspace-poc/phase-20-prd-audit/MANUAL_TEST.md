# Phase 20 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual-test pass for PRD alignment in a new temp workspace.

## 1. Scenarios run

- Rebuilt the current CLI with `pnpm run build`.
- Scenario 1: help-surface audit.
  - Ran `node dist/cli/index.js workspace --help`.
  - Ran `node dist/cli/index.js new change --help`.
  - Ran `node dist/cli/index.js apply --help`.
  - Ran `node dist/cli/index.js archive --help`.
- Scenario 2: fresh workspace smoke in an isolated managed workspace.
  - Created a new temp root with fresh `XDG_CONFIG_HOME` and `XDG_DATA_HOME`.
  - Copied the `happy-path` fixture repos for `app`, `api`, and `docs`.
  - Ran `node dist/cli/index.js workspace create phase20-manual --json`.
  - Ran `node dist/cli/index.js workspace add-repo app <repo-path> --json`.
  - Ran `node dist/cli/index.js workspace add-repo api <repo-path> --json`.
  - Ran `node dist/cli/index.js workspace add-repo docs <repo-path> --json`.
  - Ran `node dist/cli/index.js new change phase20-manual-change --targets app,api`.
  - Ran `node dist/cli/index.js workspace open --change phase20-manual-change --json`.
  - Ran `node dist/cli/index.js status --change phase20-manual-change --json`.
  - Inspected `.openspec/workspace.yaml` and `.openspec/local.yaml` in the fresh managed workspace.
- Scenario 3: shipped-doc audit.
  - Ran `rg -n "workspace create|workspace add-repo|workspace doctor|workspace open|when to use workspace|repo-local" README* docs openspec/specs -S`.

## 2. Results

- `pnpm run build` passed.
- The supported workspace flow is visible at the CLI surface:
  - `workspace create`
  - `workspace add-repo`
  - `workspace doctor`
  - `workspace open`
  - `new change --targets`
  - `apply --change --repo`
  - `archive --workspace`
- `new change --help` still exposes `--targets` only at change creation time. No later target-adjustment command is advertised anywhere in the shipped help surface.
- The fresh managed workspace was created under the XDG data root, not inside the current repo.
- In the fresh workspace:
  - `.openspec/workspace.yaml` stored committed repo aliases as empty mappings only.
  - `.openspec/local.yaml` stored the machine-specific absolute repo paths.
  - `workspace open --change` attached only `app` and `api`, not `docs`.
  - `status --change` returned the expected planned coordination plus planned `app` and `api` targets.
- The fresh user-visible surfaces showed aliases, paths, task counts, state, source, and problems, but no owner or handoff metadata:
  - `workspace open --change ... --json`
  - `status --change ... --json`
  - `.openspec/workspace.yaml`
- The shipped-doc audit returned no matches. There is still no shipped README, docs, or spec guide covering:
  - when to use workspace mode
  - the end-to-end workspace workflow
  - onboarding, handoff, or re-entry guidance
- Conclusion: the implemented workspace flow still behaves correctly for what is shipped, and the remaining PRD misses are still visible from the outside:
  - missing owner or handoff visibility
  - missing shipped workspace guidance
  - no user-facing target-adjustment path after change creation

## 3. Fixes applied

- No product code fixes were required in this manual-test pass.
- Updated this manual-test note so a fresh agent can see the exact scenarios, evidence, and remaining PRD gaps without relying on prior chat state.

## 4. Residual risks

- No new runtime correctness issue was found in the shipped workspace flow.
- PRD signoff is still blocked until the remediation phases land for:
  - workspace guidance and re-entry onboarding
  - owner or handoff visibility
  - target-set adjustment after change creation
