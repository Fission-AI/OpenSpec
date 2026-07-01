## 1. Store-aware discovery

- [x] 1.1 Let the artifact-graph resolver take a store root, so a store's
      `openspec/schemas/` participates in schema/artifact resolution
      (via `resolveRootForCommand` → `listSchemasWithInfo(root.path)`)
- [x] 1.2 Add `--store <id>` to `openspec schemas` (list a store's schemas)
- [x] 1.3 Include referenced stores' schemas/artifact types and initiatives in
      the agent instruction block (`<referenced_stores>`) and `openspec context`
      (human + JSON), each with a summary and a fetch command

## 2. Initiative precedence

- [x] 2.1 Detect when a local initiative id matches an initiative in a referenced
      store
- [x] 2.2 Report the local one as a shadow of the canonical store initiative
      (`(shadows: <store>)` in the list; `shadowsStore` in JSON)
- [x] 2.3 Confirm local commands still act on the local initiative (no behavior
      change to where commands act)

## 3. Initiative status rollup

- [x] 3.1 Add `openspec list --initiatives [--store <id>]`
- [x] 3.2 Roll up the live status of the changes each initiative groups, reusing
      the existing `openspec list --changes` status source

## 3b. Thin scaffold

- [x] 3b.1 Add `openspec new initiative <name> [--store <id>] [--title <text>]`
      that writes the folder + `initiative.yaml` + a `brief.md` stub (under the
      existing `new` group; not a revived initiative command group)

## 4. Proof

- [x] 4.1 Update the `smoother-setup` example so it reads as an initiative in a
      store with your-own artifact types (adds `initiative.yaml`)
- [x] 4.2 Capture real command output for the guide (`schemas --store`, `list
      --initiatives`, the shadow report)
- [x] 4.3 `openspec validate initiatives-in-stores --strict` passes; unit tests
      for the rollup and shadow rule in `test/core/initiatives.test.ts`
