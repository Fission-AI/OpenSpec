## Context

`validateSpecStructure()` in `spec-discovery.ts` currently checks orphaned specs, depth limits, and naming conventions. It receives a `SpecStructureConfig` but ignores `structure` and `allowMixed`. The existing tests explicitly document this: `// structure field shouldn't affect validation behavior`.

## Goals / Non-Goals

**Goals:**
- Make `structure` and `allowMixed` config fields functional in validation
- Backward compatible: defaults (`auto` + `allowMixed: true`) produce zero new issues

**Non-Goals:**
- Changing how `findAllSpecs` discovers specs (discovery remains structure-agnostic)
- Adding structure enforcement to commands other than validate

## Decisions

### 1. Structure enforcement logic

Add a new validation block at the top of `validateSpecStructure()`, before depth/orphan checks:

- `structure: 'flat'` → any spec with `depth > 1` gets an ERROR
- `structure: 'hierarchical'` → any spec with `depth === 1` gets an ERROR
- `structure: 'auto'` → skip (no enforcement)

Flat specs have depth 1 (e.g., `auth`). Hierarchical specs have depth > 1 (e.g., `_global/testing`).

### 2. allowMixed enforcement

Only applies when `structure: 'auto'` (when structure is explicitly set, mixed doesn't apply — all specs must match the chosen mode).

When `allowMixed: false` and `structure: 'auto'`:
- Detect if specs contain both flat (depth 1) and hierarchical (depth > 1)
- If mixed, emit an ERROR listing the counts

### 3. Update existing tests

The three tests at lines 936-970 that assert `structure` has no effect need to be updated to expect the new enforcement behavior.

## Risks / Trade-offs

- **Projects with `structure: 'flat'` in global config that have hierarchical specs** → will start seeing errors. This is the intended behavior — the config was always supposed to enforce this, but never did. The default `'auto'` is safe.
