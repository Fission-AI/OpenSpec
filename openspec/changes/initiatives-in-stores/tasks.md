## 1. Store-aware discovery

- [ ] 1.1 Let the artifact-graph resolver take a store root, so a store's
      `openspec/schemas/` participates in schema/artifact resolution
- [ ] 1.2 Add `--store <id>` to `openspec schemas` (list a store's schemas)
- [ ] 1.3 Include referenced stores' schemas and artifact types in
      `openspec context` and the agent instruction block, each with a summary and
      a fetch command

## 2. Initiative precedence

- [ ] 2.1 Detect when a local initiative id matches an initiative in a referenced
      store
- [ ] 2.2 Report the local one as a shadow of the canonical store initiative,
      reusing the schema-shadowing reporting shape (`shadows: …`)
- [ ] 2.3 Confirm local commands still act on the local initiative (no behavior
      change to where commands act)

## 3. Initiative status rollup

- [ ] 3.1 Add `openspec list --initiatives [--store <id>]`
- [ ] 3.2 Roll up the live status of the changes each initiative groups, reusing
      the existing `openspec list --changes` status source

## 4. Proof

- [ ] 4.1 Update the `smoother-setup` example so it reads as an initiative in a
      store with your-own artifact types
- [ ] 4.2 Capture real command output for the guide (`schemas --store`, `list
      --initiatives`, the shadow report)
- [ ] 4.3 `openspec validate initiatives-in-stores --strict` passes
