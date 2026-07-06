# Context Store Project Roots And Schema-Led Initiatives Evidence

## Manual Beta Findings

- A fresh-agent style prompt successfully created `agent-trace-hooks` in the
  registered `team-context` context store.
- The current CLI created this hardcoded file set:

```text
initiative.yaml
requirements.md
design.md
decisions.md
questions.md
tasks.md
```

- The generated markdown templates started with `TBD` placeholders.
- The agent filled those documents with plausible but unreviewed planning
  content.
- We manually reduced the test initiative to a sparse shape:

```text
initiative.yaml
brief.md
```

- `openspec initiative show team-context/agent-trace-hooks --json` and
  `openspec initiative list --store team-context --json` continued to resolve,
  which proves current identity/listing logic does not require the six-file
  packet.

## Code Observations

- Initiative file names are hardcoded in
  `src/core/collections/initiatives/schema.ts`.
- Initiative markdown templates are hardcoded in
  `src/core/collections/initiatives/templates.ts`.
- `createInitiative` writes `initiative.yaml` and then all default template
  files in `src/core/collections/initiatives/operations.ts`.
- `initiative create --json` reports `created_files` from
  `INITIATIVE_FILE_NAMES` in `src/commands/initiative.ts`.
- Initiative list/show read only `initiative.yaml`.
- Project-local schema resolution already uses
  `<projectRoot>/openspec/schemas/<name>/schema.yaml` in
  `src/core/artifact-graph/resolver.ts`.
- Project config already reads `<projectRoot>/openspec/config.yaml` in
  `src/core/project-config.ts`.
- Change artifact status/instructions are coupled to repo-local change context
  through `src/core/artifact-graph/instruction-loader.ts`.
- Planning-home detection currently treats an ancestor containing `openspec/`
  as a possible repo planning root, so adding config to context stores needs a
  safety check.

## UX/Product Pass

Recommended user meaning:

```text
context store = shared OpenSpec context project
initiative    = iterative high-level planning object
repo change   = implementation plan
workspace     = local view
```

Docs should avoid saying initiatives are only for cross-repo or cross-team
work. A user may choose a context store simply because they want OpenSpec
artifacts outside the implementation repo.

`initiative create` should make the smallest useful shared object and then
teach the agent how to continue through status/instructions. It should not
pretend requirements, decisions, and tasks exist before review.

## Architecture Pass

Feasible minimal path:

1. Treat the context store root as a project root for config/schema resolution.
2. Create `openspec/config.yaml` during context-store setup.
3. Resolve initiative schemas with `projectRoot = contextStoreRoot`.
4. Add initiative-specific status/instructions helpers using artifact graph
   primitives.
5. Change initiative creation to write a sparse shell.

Main risks:

- strict `initiative.yaml` parsing if a new top-level `schema` field is added
- tests currently asserting the six-file MVP contract
- docs and generated agent guidance currently telling agents to edit the five
  generated Markdown files
- ambiguity between initiative planning artifacts and repo-local implementation
  tasks
- context-store roots becoming accidental repo planning homes after they gain
  `openspec/config.yaml`

## Subagent / Research Notes

Three focused passes converged on the same direction.

Architecture pass:

- Model a context store as an OpenSpec planning root:

```text
context-store/
  .openspec-store/store.yaml
  openspec/config.yaml
  openspec/schemas/
  initiatives/
```

- Keep `.openspec-store/store.yaml` as store identity and
  `openspec/config.yaml` as behavior/configuration.
- Reuse project-local config and schema resolution with the context-store root
  as the project root.
- Add an initiative-specific artifact context instead of forcing initiatives
  through repo-local change context.
- Guard planning-home discovery so a context store with `openspec/config.yaml`
  does not become an accidental implementation repo.

UX/product pass:

- Describe a context store as an OpenSpec-managed planning home. It may be used
  for cross-repo coordination, but also simply to keep OpenSpec artifacts out of
  an implementation repo.
- Make `initiative create` sparse: `initiative.yaml` plus a seed artifact such
  as `brief.md`.
- Add status/instructions output so agents create requirements and design
  artifacts only when there is reviewed content to capture.
- Stop treating default initiative artifacts as files the user or agent should
  immediately fill in.

Release-risk pass:

- Keep old six-file beta initiatives readable.
- Update tests that assert the old generated file list.
- Avoid strict top-level additions to `initiative.yaml` until metadata
  versioning is designed.
- Defer context-store-hosted executable changes to the configurable change-home
  work instead of bundling them into this slice.
