## Why

OpenSpec currently assumes a flat spec structure (`specs/{capability}/spec.md`) where each capability is a direct subdirectory under `specs/`. This works for simple projects but becomes limiting as projects grow. Teams need hierarchical organization for:

- **Domain-driven design**: Grouping specs by bounded context (`specs/payments/checkout/spec.md`, `specs/auth/oauth/spec.md`)
- **Monorepos**: Organizing specs by package or scope (`specs/packages/core/spec.md`)
- **Cross-cutting concerns**: Separating global specs from feature-specific ones (`specs/_global/testing/spec.md` vs `specs/features/export/spec.md`)
- **Team namespaces**: Large teams organizing specs by ownership (`specs/team-platform/infra/spec.md`)
- **Scale**: Projects with 50+ specs become unmanageable in a flat structure

Commands like `openspec list --specs`, validation, sync, and archive fail to discover or work with hierarchically organized specs, forcing teams to use workarounds or manual processes.

## What Changes

- **Core spec discovery**: Implement recursive search for `spec.md` files at any depth, replacing the current single-level directory scan
- **Capability naming**: Change capability identifier from directory name to full relative path from `specs/` (e.g., `_global/testing` instead of just `testing`)
- **Delta mapping**: Enable 1:1 path-based mapping between change deltas and main specs using replicated directory structure
- **Configuration**: Add optional `specStructure` section in `openspec/config.yaml` to control structure mode, depth limits, and validation behavior
  - `structure`: `'flat'` | `'hierarchical'` | `'auto'` (default: `auto` - auto-detect)
  - `maxDepth`: Maximum hierarchy depth (default: `4`, recommended: `2-3`)
  - `allowMixed`: Allow mixing flat and hierarchical specs (default: `true`)
  - `validatePaths`: Enforce naming conventions (default: `true`)
- **Display**: Update `list` and `view` commands to show hierarchical specs with visual indentation
- **Validation**: Add validation rules to prevent orphaned specs (no spec.md at intermediate levels), enforce depth limits (warn at 4, hard limit at 6), and check naming conventions (lowercase alphanumeric with hyphens/underscores)
- **Backward compatibility**: Auto-detect flat vs hierarchical structure and support both transparently
- **Templates**: Update all skill prompts and templates to reference specs using relative paths
- **Commands**: Adapt `list`, `validate`, `sync`, `archive` commands to work with hierarchical paths

## Capabilities

### New Capabilities
<!-- This change is infrastructural - it modifies OpenSpec's core behavior rather than adding discrete capabilities with requirements. No new capability specs needed. -->

### Modified Capabilities
<!-- No existing OpenSpec specs to modify - this is a core system enhancement. -->

## Impact

**Affected Code**:
- `src/core/specs-apply.ts` - spec discovery and delta mapping logic
- `src/core/view.ts` - dashboard spec listing
- `src/core/list.ts` - spec listing command
- `src/core/archive.ts` - archive and sync operations
- `src/core/validation/validator.ts` - spec validation
- `src/commands/spec.ts` - spec command path construction
- `src/commands/validate.ts` - validation command
- `src/core/templates/skill-templates.ts` - all prompt templates referencing specs
- `src/core/parsers/change-parser.ts` - change parsing logic

**New Utilities**:
- `src/utils/spec-discovery.ts` - centralized spec discovery, capability resolution, structure detection
- `src/utils/config.ts` - configuration reading and validation for specs settings

**Configuration**:
- `openspec/config.yaml` - optional `specStructure` section for structure control and validation rules

**Documentation**:
- Main README.md - update examples to show both flat and hierarchical structures
- Getting started guide - explain structure options
- Migration guide - how to transition from flat to hierarchical
- API/CLI reference - document new behavior in list, validate, sync, archive commands
- Examples directory - add hierarchical structure examples

**Breaking Changes**: None - flat structure continues to work. Hierarchical structure becomes automatically supported. Configuration is completely optional.

**Benefits**:
- **Better organization**: Group related specs by domain, team, or concern rather than forcing flat structure
- **Domain-driven design**: Natural alignment with bounded contexts and domain models
- **Monorepo support**: Organize specs by package, scope, or workspace
- **Scalability**: Projects with 50+ specs remain navigable and maintainable
- **Team collaboration**: Large teams can namespace their specs to avoid conflicts
- **Cross-cutting separation**: Distinguish global concerns (`_global/`, `shared/`, `utils/`) from feature-specific specs
- **Code alignment**: Spec structure can mirror code structure when beneficial
- **No workarounds**: Eliminates need for custom schemas or hacks
- **Optional strictness**: Configuration for validation during migrations or in large teams
- **Zero configuration**: Works automatically with auto-detection, no setup required
- **Full compatibility**: Existing flat projects continue working unchanged
