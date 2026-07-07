# Deletion Ledger: Legacy Command Groups

Generated 2026-06-11 by diffing
`rg -o "(workspace|initiative)_[a-z_]+" src/**/*.ts | sort -u` between the
pre-deletion commit (`ef45d5d`) and the deletion commit. For the
capstone's agent-contract inventory and dead-code sweep.

## Surviving tokens (deliberate)

- `initiative_option_removed` — the `new change --initiative` rejection,
  locked in slice 1.2. Lives in `src/commands/workflow/new-change.ts`.

## Removed diagnostic codes (emitted only by deleted command paths)

Initiative group:

- initiative_already_exists
- initiative_ambiguous
- initiative_collection_invalid
- initiative_collections_invalid
- initiative_collections_partially_invalid
- initiative_discovery_failed
- initiative_error
- initiative_id_required
- initiative_invalid
- initiative_lookup_incomplete
- initiative_not_found
- initiative_summary_required
- initiative_title_required

Workspace group:

- workspace_already_exists
- workspace_context_bind_required
- workspace_context_conflict
- workspace_create_failed
- workspace_error
- workspace_initiative_missing
- workspace_initiative_selection_ambiguous
- workspace_initiative_unavailable
- workspace_local_state_invalid
- workspace_name_collision
- workspace_no_available_openers
- workspace_not_found
- workspace_not_in_known_views
- workspace_open_change_unsupported
- workspace_open_link_skipped
- workspace_open_prepare_only_unsupported
- workspace_opener_conflict
- workspace_opener_launch_failed
- workspace_opener_unavailable
- workspace_opener_unset
- workspace_root_missing
- workspace_selection_ambiguous
- workspace_selection_conflict
- workspace_skills_out_of_sync
- workspace_state_invalid
- workspace_store_unavailable
- invalid_workspace_setup_tools (sweep fragment `workspace_setup_tools`)
- invalid_workspace_update_tools (sweep fragment `workspace_update_tools`)

(`workspace_open_store_without_initiative` was already deleted by rider 1
of slice 1.4 and is recorded in that slice's history.)

## Removed non-code tokens (zod paths, JSON keys, target fragments)

- initiative_id, initiative_reference (selector/zod field names)
- workspace_name, workspace_agent, workspace_opener (option/zod field
  names in the deleted command layer)

## Dead-export carve-outs (EXECUTED by 4.1 on 2026-06-11)

Exports inside kept modules whose last consumer died with this slice.
They belonged to the workspace state model that 4.1 replaced; 4.1
deleted every entry below, WIDENED to whole-module deaths where the
keep-rationale collapsed (`src/core/workspace/` whole, `binding.ts`
whole, `getRepoPath`, the five template guards, the planning-home and
change-status-policy workspace branches, the library pins that froze
them, and the `workspace_skills` vocabulary-allowlist entry). The
historical list:

- `findWorkspaceRoot`, `isWorkspaceRoot` —
  `src/core/workspace/state-io.ts`
- `resolveStoreBinding`, `createPathStoreBinding`,
  `createRegisteredStoreBinding` — `src/core/store/binding.ts`
- `resolveCurrentPlanningHomeSync`'s workspace branch —
  `src/core/planning-home.ts` (CLI-unreachable since slice 1.2's
  resolver demotion; library behavior pinned by
  `test/core/planning-home.test.ts`)
- `buildActionContext`'s workspace-planning branch —
  `src/core/change-status-policy.ts` (same; pinned by
  `test/commands/legacy-groups-removed.test.ts`)
- `readOptionalWorkspaceViewState`, `isWorkspaceRoot`,
  `writeWorkspaceViewState`, `workspaceChangesDirExists` —
  `src/core/workspace/state-io.ts` (production consumers died with the
  commands; only planning-home's read path and tests remain)

## Accepted collateral and known follow-ups

- **Minor error-fidelity change in `openspec update`**: pre-deletion, an
  unreadable `openspec/` entry (EACCES) surfaced the raw fs error via
  the deleted detection helper; the unconditional path now reports the
  standard no-project error. Accepted as part of decision 2a's behavior
  change.
- **The accepted spec library still describes deleted behavior**:
  `openspec/specs/cli-config`, `workspace-open`, `workspace-foundation`,
  and `cli-artifact-workflow` specs REQUIRE workspace/initiative flows
  that no longer exist. This is the roadmap's parked Later Idea **L2**
  ("Decide how accepted workspace-planning specs should change once
  behavior has changed") — deliberately not resolved by this slice; the
  capstone should surface it under known gaps.
