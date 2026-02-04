# Organizing Specs

OpenSpec supports two ways to organize your specifications: **flat** and **hierarchical** structures. Both work seamlessly with all OpenSpec features.

## Flat Structure (Traditional)

The simplest approach - one directory per capability at the top level:

```text
openspec/specs/
  auth/spec.md
  api/spec.md
  database/spec.md
  payments/spec.md
  notifications/spec.md
```

**Best for:**
- Small to medium projects
- Simple domain structures
- Teams new to OpenSpec

## Hierarchical Structure

Organize specs by domain, scope, or subsystem using nested directories:

```text
openspec/specs/
  _global/
    testing/spec.md
    security/spec.md
    monitoring/spec.md
  platform/
    services/
      api/spec.md
      auth/spec.md
      database/spec.md
    infrastructure/
      deployment/spec.md
      scaling/spec.md
  frontend/
    components/
      forms/spec.md
      navigation/spec.md
    state-management/spec.md
```

**Best for:**
- Large codebases or monorepos
- Multiple teams or domains
- Complex microservice architectures
- Clear organizational boundaries

## Capability Naming

### Flat Structure
Capability names match directory names exactly:
- Directory: `auth/` → Capability: `"auth"`
- Directory: `payments/` → Capability: `"payments"`

### Hierarchical Structure
Capability names include the full path:
- Directory: `_global/testing/` → Capability: `"_global/testing"`
- Directory: `platform/services/api/` → Capability: `"platform/services/api"`

## Change Deltas Mirror Structure

When you create a change that updates specs, the delta structure in your change directory **mirrors the main spec structure 1:1**:

**Flat example:**
```text
Main:    openspec/specs/auth/spec.md
Delta:   openspec/changes/add-oauth/specs/auth/spec.md
```

**Hierarchical example:**
```text
Main:    openspec/specs/_global/testing/spec.md
Delta:   openspec/changes/add-e2e-tests/specs/_global/testing/spec.md
```

This 1:1 mapping makes it easy to understand which specs a change affects.

## Mixed Structures

You can mix both approaches in the same project:

```text
openspec/specs/
  auth/spec.md                    # Flat (depth 1)
  payments/spec.md                # Flat (depth 1)
  _global/
    testing/spec.md               # Hierarchical (depth 2)
    security/spec.md              # Hierarchical (depth 2)
  platform/
    services/
      api/spec.md                 # Hierarchical (depth 3)
```

OpenSpec auto-detects the structure and handles both correctly.

## Configuration

Control spec structure behavior in `~/.config/openspec/config.json` (or `%APPDATA%/openspec/config.json` on Windows):

```jsonc
{
  "specStructure": {
    "structure": "auto",          // "auto", "flat", or "hierarchical"
    "maxDepth": 4,                // Maximum nesting depth (default: 4)
    "allowMixed": true,           // Allow mixing flat and hierarchical
    "validatePaths": true         // Enforce naming conventions
  }
}
```

### Options

- **`structure`**: `"auto"` (default) | `"flat"` | `"hierarchical"`
  - `"auto"`: Auto-detect based on directory structure
  - `"flat"`: Enforce flat structure only
  - `"hierarchical"`: Enforce hierarchical structure only

- **`maxDepth`**: Number (default: `4`)
  - Maximum nesting depth for hierarchical specs
  - Warning at depth 4, error beyond configured max

- **`allowMixed`**: Boolean (default: `true`)
  - Allow mixing flat and hierarchical specs
  - Set to `false` to enforce consistent structure

- **`validatePaths`**: Boolean (default: `true`)
  - Enforce naming conventions (lowercase, alphanumeric, hyphens, underscores)
  - Check for reserved names (`.git`, `node_modules`, etc.)

## Choosing a Structure

### Start Flat

If you're unsure, **start with flat structure**:
- Simpler to understand
- Easier to navigate
- Sufficient for most projects
- Can migrate to hierarchical later if needed

### Migrate to Hierarchical

Consider hierarchical when you:
- Have 20+ capabilities that need organization
- Work on a monorepo with clear domains
- Have multiple teams owning different areas
- Need to group related capabilities for discoverability

## Commands Work With Both

All OpenSpec commands work seamlessly with both structures:

```bash
# List specs (flat or hierarchical)
openspec list --specs

# Validate specs (flat or hierarchical)
openspec validate --specs

# View a specific spec
openspec show auth                        # Flat
openspec show _global/testing             # Hierarchical
openspec show platform/services/api       # Deep hierarchical

# Archive a change (updates specs in correct locations)
openspec archive add-oauth-support
```

## Migration Guide

Need to migrate from flat to hierarchical? See the [Migration Guide](./migration-flat-to-hierarchical.md) for step-by-step instructions.

## Examples

See [examples/hierarchical-specs](../examples/hierarchical-specs/) for a sample project using hierarchical organization.
