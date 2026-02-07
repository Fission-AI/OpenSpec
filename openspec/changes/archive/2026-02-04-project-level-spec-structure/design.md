## Context

`specStructure` config currently lives only in the global config file (`~/.config/openspec/config.json`). The `getSpecStructureConfig()` function in `global-config.ts` reads global config and applies defaults. The only production consumer is `validate.ts:208` for spec structure validation during `openspec validate --specs`.

Project-level config (`openspec/config.yaml`) already supports resilient field-by-field parsing for `schema`, `context`, and `rules`. Adding `specStructure` extends this pattern.

## Goals / Non-Goals

**Goals:**
- Allow projects to declare their own `specStructure` in `openspec/config.yaml`
- Project config overrides global config at the individual field level (not whole-object replacement)
- Resilient sub-field parsing: invalid sub-fields warn and skip, valid ones are kept
- Backward compatible: callers without project overrides behave identically

**Non-Goals:**
- Adding specStructure to other commands beyond validate (list, view, spec use filesystem detection, not config)
- CLI command to set/get project-level specStructure (use editor)
- Cascading config beyond two levels (no per-directory overrides)

## Decisions

### 1. Sub-field-by-field resilient parsing

Parse each specStructure sub-field independently with Zod `safeParse()`, matching the pattern used for `rules` parsing in `readProjectConfig()`.

```yaml
specStructure:
  structure: flat        ← valid, kept
  maxDepth: "very deep"  ← invalid, warned + skipped
  validatePaths: false   ← valid, kept
```

Result: `{ structure: 'flat', validatePaths: false }` — `maxDepth` falls through to global/default.

**Alternative considered**: Single `safeParse()` on the whole object. Simpler, but rejects all fields when one is invalid. Inconsistent with how `rules` handles partial validity.

### 2. Optional parameter on `getSpecStructureConfig()`

Add `projectOverrides?: Partial<SpecStructureConfig>` parameter rather than creating a new function.

```text
getSpecStructureConfig(projectOverrides?)
  → project value ?? global value ?? default
```

Uses `||` for `structure` (string — empty string falls through) and `??` for `maxDepth`, `allowMixed`, `validatePaths` (numbers/booleans where `0`/`false` are valid values).

**Alternative considered**: New function like `getMergedSpecStructureConfig()`. Adds API surface for no benefit; the optional parameter is backward-compatible.

### 3. Type reuse from SpecStructureConfig

The parsed specStructure from project config uses `Partial<SpecStructureConfig>` (imported from `spec-discovery.ts`), the same type already used in `global-config.ts`. No new types needed. The `ProjectConfig` type is extended via the Zod schema inference.

### 4. Validate.ts as the only updated call site

Only `validate.ts:208` calls `getSpecStructureConfig()` in production. Other commands (`view.ts`, `list.ts`) use filesystem detection (`isSpecStructureHierarchical`, `findAllSpecs`) which is independent of config. No other call sites need updating.

## Risks / Trade-offs

- **Config precedence confusion** → Mitigated by documenting the precedence chain in `docs/organizing-specs.md` with examples
- **Partial specStructure objects in project config type** → The `ProjectConfig` type already uses `Partial` patterns; callers use `?.` access. No new complexity
- **Future call sites may forget to pass project overrides** → Low risk since only validate currently uses this, and the function works without overrides. Acceptable for now; can revisit if more consumers emerge
