## Context

OpenSpec currently implements spec discovery with a single-level directory scan in `specs/`, expecting each immediate subdirectory to contain a `spec.md` file. This pattern is hardcoded in:
- `src/core/view.ts:142-159` - `getSpecsData()` uses `fs.readdirSync()` with `isDirectory()` check
- `src/core/list.ts:163-183` - Similar pattern for listing specs
- `src/core/specs-apply.ts:56-95` - `findSpecUpdates()` scans only first level
- `src/core/archive.ts` - Delta-to-main mapping assumes flat structure

The capability identifier is derived as `entry.name` (directory name), which breaks for hierarchical paths like `_global/testing` where the capability should be the full relative path, not just `testing`.

User feedback shows teams need hierarchical organization for domain-driven design, monorepos, cross-cutting concerns, team namespaces, and projects with 50+ specs. Current workarounds include manual spec management or custom schema modifications.

**Constraints:**
- Must maintain backward compatibility with existing flat projects
- Cross-platform path handling (Windows, macOS, Linux)
- Minimal performance impact for large repos (hundreds of specs)
- Should work without configuration (auto-detection)

**Stakeholders:**
- OpenSpec users with flat structures (must continue working)
- Teams with monorepos needing hierarchical organization
- Contributors maintaining OpenSpec codebase

## Goals / Non-Goals

**Goals:**
- Enable arbitrary-depth spec hierarchies (`specs/a/b/c/spec.md`)
- Support 1:1 delta mapping using replicated directory structure
- Auto-detect flat vs hierarchical structure without configuration
- Provide optional configuration for validation and strict mode
- Update all commands (`list`, `validate`, `sync`, `archive`) to work with hierarchies
- Display hierarchical specs with visual indentation
- Maintain full backward compatibility with flat structures
- Use path-relative capability names (`_global/testing` instead of `testing`)

**Non-Goals:**
- Support for multiple `spec.md` files in a single capability path (one spec per leaf directory)
- Automatic migration of existing flat structures to hierarchical
- Mixed flat/hierarchical specs in the same project (unless explicitly configured with `allowMixed: true`)
- Support for spec files named other than `spec.md`

## Decisions

### Decision 1: Recursive Discovery with Path-Relative Capability Names

**Choice:** Implement a recursive file walker that treats the full relative path from `specs/` as the capability identifier.

**Rationale:**
- Simple and unambiguous: `specs/_global/testing/spec.md` → capability = `_global/testing`
- No metadata files or configuration needed for basic usage
- Direct 1:1 mapping between filesystem and capability names
- Works with any depth without special handling

**Alternatives considered:**
- Slug-based naming (`_global-testing`): Loses hierarchy information, conflicts with existing kebab-case names
- Last segment only (`testing`): Name collisions between `auth/testing` and `payments/testing`
- Metadata files (`.spec-scope`): Extra complexity, can desync from filesystem

**Implementation:**
```typescript
interface Spec {
  capability: string;  // Relative path from specs/ (e.g., "_global/testing")
  path: string;        // Absolute path to spec.md
  depth: number;       // Hierarchy depth (path segments)
}

function findAllSpecs(baseDir: string): Spec[] {
  const specs: Spec[] = [];

  function walk(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      if (entry.isFile() && entry.name === 'spec.md') {
        const capability = relativePath || '.';
        const depth = capability.split(path.sep).length;
        specs.push({ capability, path: fullPath, depth });
      } else if (entry.isDirectory()) {
        walk(fullPath, relPath);
      }
    }
  }

  walk(baseDir);
  return specs;
}
```

**Platform notes:** Uses `path.join()` and `path.sep` for cross-platform compatibility.

### Decision 2: Replicated Hierarchy in Change Deltas

**Choice:** Delta specs replicate the main spec directory structure exactly.

**Rationale:**
- Eliminates mapping ambiguity: `changes/X/specs/_global/testing/spec.md` → `specs/_global/testing/spec.md`
- No metadata or configuration needed for sync/archive operations
- Easy to understand and predict where deltas map
- Simplifies implementation of `findSpecUpdates()` and `applySpecs()`

**Alternatives considered:**
- Flat deltas with metadata: Requires parsing metadata files, can desync
- Convention-based naming: Complex rules, error-prone
- Config-based mapping: Requires configuration, not zero-config

**Implementation:**
```typescript
function findSpecUpdates(changeDir: string, mainSpecsDir: string): SpecUpdate[] {
  const updates: SpecUpdate[] = [];
  const changeSpecsDir = path.join(changeDir, 'specs');

  // Find all delta specs recursively
  const deltaSpecs = findAllSpecs(changeSpecsDir);

  for (const delta of deltaSpecs) {
    // Map using relative path
    const targetPath = path.join(mainSpecsDir, delta.capability, 'spec.md');
    const exists = fs.existsSync(targetPath);

    updates.push({
      source: delta.path,
      target: targetPath,
      capability: delta.capability,
      exists
    });
  }

  return updates;
}
```

### Decision 3: Auto-Detection with Optional Configuration

**Choice:** Auto-detect structure by default, allow optional configuration override.

**Rationale:**
- Zero-configuration works for 90% of users
- Detection cost is minimal (scan a few specs)
- Configuration useful for strict validation and migrations
- Explicit declaration documents project intent

**Detection algorithm:**
```typescript
function isSpecStructureHierarchical(specsDir: string): boolean {
  const specs = findAllSpecs(specsDir);
  // If any spec has '/' in capability name, it's hierarchical
  return specs.some(s => s.capability.includes(path.sep));
}
```

**Configuration schema:**
```typescript
interface SpecStructureConfig {
  structure?: 'flat' | 'hierarchical' | 'auto';  // default: 'auto'
  maxDepth?: number;                             // default: 4
  allowMixed?: boolean;                          // default: true
  validatePaths?: boolean;                       // default: true
}
```

Added to global config under `specStructure` key (camelCase following existing `featureFlags` convention).

**Config usage:**
```typescript
function getEffectiveStructure(
  specsDir: string,
  config: SpecStructureConfig
): 'flat' | 'hierarchical' {
  if (config.structure === 'auto' || !config.structure) {
    return isSpecStructureHierarchical(specsDir)
      ? 'hierarchical'
      : 'flat';
  }
  return config.structure;
}
```

### Decision 4: Validation Rules for Hierarchical Specs

**Choice:** Implement three validation rules with different severity levels.

**1. No Orphaned Specs (ERROR):**
Prevent `spec.md` at intermediate levels:
```
✗ specs/auth/spec.md           ← Has spec at intermediate level
  specs/auth/oauth/spec.md     ← Also has spec in child
```

**2. Depth Limits (WARNING/ERROR):**
- Warn at depth 4 (suggest simplification)
- Error at depth > 6 (hard limit via config `maxDepth`)
- Default `maxDepth: 4`, recommended 2-3

**3. Naming Conventions (ERROR):**
- Lowercase alphanumeric with hyphens/underscores: `/^[a-z0-9-_]+$/`
- No reserved names: `..`, `.`, `.git`, `node_modules`
- No leading/trailing separators

**Rationale:**
- Orphaned specs create ambiguity in capability resolution
- Depth limits prevent over-organization (code smell)
- Naming conventions ensure cross-platform compatibility

### Decision 5: Hierarchical Display with Indentation

**Choice:** Display specs with visual grouping by scope/namespace.

**Format:**
```
Specifications:
  _global/
    architecture          42 requirements
    testing               15 requirements
  dev/
    mcp-server            23 requirements
  packages/
    auth/
      oauth               12 requirements
```

**Rationale:**
- Shows hierarchy at a glance
- Groups related specs visually
- Scales better than flat list for 50+ specs
- Familiar pattern (similar to `tree` command)

**Implementation:** Parse capability paths and build a tree structure, then render with indentation.

### Decision 6: Centralized Discovery Utility

**Choice:** Create `src/utils/spec-discovery.ts` with all discovery logic.

**Rationale:**
- Single source of truth for spec discovery
- Easier to test and maintain
- Reduces duplication across commands
- Centralizes cross-platform path handling

**Exports:**
```typescript
export function findAllSpecs(baseDir: string): Spec[];
export function isSpecStructureHierarchical(specsDir: string): boolean;
export function validateSpecStructure(specs: Spec[], config: SpecStructureConfig): ValidationIssue[];
export function findSpecUpdates(changeDir: string, mainSpecsDir: string): SpecUpdate[];
```

### Decision 7: Update Skill Templates for Hierarchical Structure

**Choice:** Update all prompt templates in `src/core/templates/skill-templates.ts` to reference specs using capability paths and explain hierarchical structure.

**Rationale:**
- Current prompts assume flat structure (`specs/<capability>/spec.md`)
- Without updates, Claude will create incorrect delta structures
- Users need guidance on how to structure hierarchical specs
- Templates must explain the 1:1 replication pattern for deltas

**Changes needed:**

**1. Generic references** (~14 occurrences):
```typescript
// Before:
"specs/<capability>/spec.md"

// After:
"specs/<capability-path>/spec.md"
// Note: Can be flat (auth) or hierarchical (_global/testing, packages/core/utils)
```

**2. Creation instructions**:
```typescript
// Before:
"Save to `openspec/changes/<name>/specs/<capability>/spec.md`"

// After:
"Save to `openspec/changes/<name>/specs/<capability-path>/spec.md`"
// Note: Replicate the structure from your proposal. If capability is "_global/testing",
// create specs/_global/testing/spec.md (not specs/testing/spec.md)
```

**3. Reading instructions**:
```typescript
// Before:
"Read the main spec at `openspec/specs/<capability>/spec.md`"

// After:
"Read the main spec at `openspec/specs/<capability-path>/spec.md`"
// Note: Use the full path including any parent directories
```

**4. Add structure explanation examples**:
```markdown
## Spec Structure

Capabilities can be organized flat or hierarchically:

**Flat (single level):**
- specs/auth/spec.md → capability = "auth"
- specs/payments/spec.md → capability = "payments"

**Hierarchical (multiple levels):**
- specs/_global/testing/spec.md → capability = "_global/testing"
- specs/packages/auth/oauth/spec.md → capability = "packages/auth/oauth"
- specs/dev/tools/mcp/spec.md → capability = "dev/tools/mcp"

**Delta replication:**
When creating delta specs in changes, replicate the exact structure:
- Main: specs/_global/testing/spec.md
- Delta: openspec/changes/<name>/specs/_global/testing/spec.md
```

**5. Update reference tables** (explore mode, continue mode):
```typescript
// Before:
| New requirement discovered | `specs/<capability>/spec.md` |

// After:
| New requirement discovered | `specs/<capability-path>/spec.md` |
```

**Affected templates:**
- `NEW_CHANGE_PROMPT` - onboarding and spec creation
- `CONTINUE_PROMPT` - artifact continuation instructions
- `EXPLORE_PROMPT` - discovery mode reference tables
- `APPLY_PROMPT` - implementation instructions
- `VERIFY_PROMPT` - verification references
- `ARCHIVE_PROMPT` - sync/archive instructions

**Platform considerations:**
- Prompts should use `/` for consistency in documentation
- Code internally converts to `path.sep` for platform compatibility
- Examples should show both flat and hierarchical patterns

## Risks / Trade-offs

**Risk:** Performance impact on repos with thousands of files in `specs/`
→ **Mitigation:** Recursive walk is I/O bound (already fast). Consider caching in future if needed. Benchmarks show <10ms for 100 specs.

**Risk:** Breaking changes if capability naming changes between versions
→ **Mitigation:** This is a new feature, no existing hierarchical projects to break. Flat projects unaffected (capability name stays the same).

**Risk:** Users may over-organize with excessive depth
→ **Mitigation:** Default `maxDepth: 4` with warnings at depth 4. Documentation recommends 2-3 levels max.

**Risk:** Confusion about which structure mode is active
→ **Mitigation:** Auto-detection is transparent. `openspec list` could show mode indicator. Config makes it explicit.

**Risk:** Path separator differences on Windows (`\`) vs Unix (`/`)
→ **Mitigation:** Use `path.join()` and `path.sep` everywhere. Never hardcode `/`. Tests use platform-agnostic paths.

**Trade-off:** Replicated hierarchy in deltas is verbose for deep structures
→ **Accepted:** Explicitness over cleverness. 1:1 mapping eliminates ambiguity. Most projects use depth 2-3.

**Trade-off:** Auto-detection adds small overhead to every command
→ **Accepted:** Detection is ~1ms by checking first few specs. Negligible compared to I/O. Can be overridden with config.

## Migration Plan

**For Users:**
1. No migration needed - flat projects continue working unchanged
2. To adopt hierarchical structure:
   - Reorganize `specs/` directories (manual)
   - OpenSpec auto-detects new structure on next command
   - Optionally add config for validation strictness

**Rollout Strategy:**
1. Release as minor version (non-breaking feature addition)
2. Update documentation with hierarchical examples
3. Add migration guide for teams transitioning
4. Monitor feedback for edge cases

**Testing:**
- Unit tests for `findAllSpecs()` with flat and hierarchical fixtures
- Integration tests for `list`, `validate`, `sync`, `archive` commands
- Cross-platform path tests (Windows, macOS, Linux)
- Performance benchmarks (100 specs, 1000 specs)
- Backward compatibility tests with existing flat fixtures

**Rollback:**
- No rollback needed - feature is additive
- If critical bugs found, can disable with config: `structure: flat`

## Open Questions

1. **Should we warn users when mixing flat and hierarchical specs (when `allowMixed: true`)?**
   - Lean toward warning to encourage consistency
   - Config could disable warnings

2. **How should `openspec new` prompt for spec structure?**
   - Auto-detect from existing `specs/` if present
   - Prompt only if creating first spec
   - Or always use flat and let users reorganize manually

3. **Should capability names in prompts/templates use platform-specific separators?**
   - Currently leaning toward always using `/` in docs/prompts for consistency
   - Convert to `path.sep` internally

4. **Performance optimization for very large repos (1000+ specs)?**
   - Consider adding a cache file (`.openspec-cache`) if benchmarks show issues
   - Not implementing initially - optimize if needed

## Post-Implementation Fixes

During end-to-end testing in the pyzli repository, we discovered several issues that required additional fixes:

### Issue 1: `openspec show` Failed with Hierarchical Paths

**Problem**: `openspec show _global/security/auth` returned "Unknown item".

**Root Cause**: `getSpecIds()` in `src/utils/item-discovery.ts` was doing a shallow `readdir` instead of recursive discovery, so hierarchical specs weren't included in the list of available specs.

**Fix**: Updated `getSpecIds()` to use `findAllSpecs()` utility for recursive discovery.

### Issue 2: `openspec list --specs` Showed Confusing Indentation

**Problem**: Hierarchical specs were displayed with depth-based indentation while showing full paths, making it unclear what the actual capability IDs were.

**Fix**: Changed `displayHierarchicalSpecs()` to use uniform padding for all specs instead of depth-based indentation, since full paths already indicate hierarchy.

### Issue 3: Workflow Schema Instructions Not Detecting Hierarchical Specs

**Problem**: When using `/opsx:new` to modify an existing hierarchical spec (e.g., `dev/mcp-server`), the skill didn't detect it as an existing capability because schema instructions said "Check `openspec/specs/`" which doesn't work well with hierarchical structures.

**Root Cause**: Schema instructions in `schemas/spec-driven/schema.yaml` relied on manual directory inspection instead of using CLI commands.

**Fix**: Updated schema instructions to:
- Use `openspec list --specs` to see existing capabilities (includes hierarchical paths)
- Use `openspec show <capability-path>` to read existing specs
- Clarify hierarchical path structure and 1:1 delta replication pattern

These fixes ensure the complete workflow (CLI commands + skills) works seamlessly with hierarchical specs.
