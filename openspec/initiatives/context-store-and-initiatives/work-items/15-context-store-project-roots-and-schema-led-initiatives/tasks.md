# Context Store Project Roots And Schema-Led Initiatives Tasks

- [x] Create Item 15 work-item tracking notes.
- [ ] Record the product decision that context stores should behave like
      OpenSpec roots for config and schema resolution, but not as implementation
      repos by default.
- [ ] Define the context-store root layout, including `.openspec-store/`,
      `openspec/config.yaml`, `openspec/schemas/`, and `initiatives/`.
- [ ] Decide the config key for the default initiative schema, with
      `initiative_schema` as the preferred next-release-safe direction.
- [ ] Decide whether initiative schemas share `openspec/schemas/` with a
      `usage: initiative` discriminator or use a separate namespace while
      reusing the artifact graph format.
- [ ] Add or design the built-in `product-initiative` schema for high-level
      requirements and design artifacts.
- [ ] Define `brief.md` as the sparse creation seed and decide whether it sits
      outside the artifact graph or is represented as an already-complete
      artifact.
- [ ] Change `initiative create` from hardcoded six-file generation to sparse
      `initiative.yaml` plus `brief.md` creation.
- [ ] Add initiative artifact status resolution rooted at
      `context-store/initiatives/<id>/`.
- [ ] Add initiative artifact instructions output that returns schema guidance,
      template content, dependencies, output path, and existing paths.
- [ ] Ensure store-local config context and rules can be read for initiative
      artifact instructions without confusing repo-local change config.
- [ ] Guard planning-home resolution so context stores with
      `openspec/config.yaml` do not silently become repo-local implementation
      homes.
- [ ] Update `initiative create --json`, human output, and next-command guidance
      for sparse creation and iterative artifacts.
- [ ] Update tests that currently assert the MVP six-file initiative shape.
- [ ] Add compatibility tests proving old six-file initiatives still list and
      show.
- [ ] Add tests for context-store local schemas and store config defaults.
- [ ] Update beta docs and agent guidance to stop telling agents to edit every
      initiative markdown file immediately after creation.
- [ ] Record migration behavior and a note that Item 5's six-file MVP shape has
      been superseded by this schema-led sparse model.
