# Migration Guide: Flat to Hierarchical Specs

This guide helps you migrate an existing OpenSpec project from flat to hierarchical spec organization.

## Should You Migrate?

**Consider migrating if:**
- You have 20+ specs that are hard to navigate
- Your specs naturally group by domain/subsystem
- Multiple teams own different spec areas
- You're working on a monorepo

**Stay flat if:**
- You have fewer than 20 specs
- Your project has a simple domain structure
- Your team prefers simplicity over organization

## Pre-Migration Checklist

Before starting, ensure:

1. ✓ All changes are archived (no active changes in `openspec/changes/`)
2. ✓ All specs are validated (`openspec validate --specs`)
3. ✓ You have a backup or version control
4. ✓ Your team agrees on the new structure

## Step 1: Plan Your Hierarchy

Design your new structure **before** moving files. Consider:

**Domain-based organization:**
```text
_global/          # Cross-cutting concerns
frontend/         # Frontend-specific specs
backend/          # Backend-specific specs
infrastructure/   # Infrastructure specs
```

**Subsystem-based organization:**
```text
platform/
  services/
    auth/
    api/
    database/
core/
  business-logic/
  data-models/
integrations/
  payments/
  notifications/
```

**Tips:**
- Use `_global/` for specs that apply everywhere (testing, security, monitoring)
- Group by team ownership when possible
- Keep depth reasonable (3-4 levels max)
- Use descriptive directory names (lowercase, hyphens)

## Step 2: Create Directory Structure

Create your new directory hierarchy:

```bash
# Example: Create _global and platform domains
mkdir -p openspec/specs/_global/{testing,security,monitoring}
mkdir -p openspec/specs/platform/services/{api,auth,database}
mkdir -p openspec/specs/platform/infrastructure/{deployment,scaling}
mkdir -p openspec/specs/frontend/{components,state-management}
```

## Step 3: Move Specs

Move each spec to its new location:

```bash
# Example: Move testing spec to _global
git mv openspec/specs/testing openspec/specs/_global/testing

# Example: Move api spec to platform/services
git mv openspec/specs/api openspec/specs/platform/services/api

# Continue for all specs...
```

**Important:** Use `git mv` if you're using git to preserve history.

## Step 4: Update References

### Update Change Proposals

If you have archived changes that reference old flat capability names, update their `proposal.md` files:

```markdown
<!-- Before -->
## Capabilities
- api
- auth
- database

<!-- After -->
## Capabilities
- platform/services/api
- platform/services/auth
- platform/services/database
```

### Update Documentation

Update any project documentation that references spec paths:

```markdown
<!-- Before -->
See specs/api/spec.md for API requirements

<!-- After -->
See specs/platform/services/api/spec.md for API requirements
```

## Step 5: Verify Migration

Run validations to ensure everything still works:

```bash
# Validate all specs
openspec validate --specs

# List all specs (verify new paths)
openspec list --specs

# View a hierarchical spec
openspec show _global/testing
openspec show platform/services/api
```

## Step 6: Update Configuration (Optional)

Update your global config to enforce hierarchical structure:

**~/.config/openspec/config.json** (Linux/macOS)
```json
{
  "specStructure": {
    "structure": "hierarchical",
    "maxDepth": 4,
    "allowMixed": false,
    "validatePaths": true
  }
}
```

**%APPDATA%/openspec/config.json** (Windows)

## Step 7: Communicate to Team

Inform your team about the new structure:

1. Share the new hierarchy diagram
2. Update your project README
3. Document naming conventions
4. Show examples of new change workflows

## Example Migration

### Before (Flat)
```text
openspec/specs/
  auth/spec.md
  api/spec.md
  database/spec.md
  testing/spec.md
  security/spec.md
  monitoring/spec.md
  deployment/spec.md
```

### After (Hierarchical)
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
```

### Commands After Migration

```bash
# Before
openspec show auth
openspec show testing

# After
openspec show platform/services/auth
openspec show _global/testing
```

## Creating New Changes After Migration

When creating new changes, use the hierarchical path:

```bash
# Before (flat)
/opsx:new add-oauth-support
# Creates: openspec/changes/add-oauth-support/specs/auth/spec.md

# After (hierarchical)
/opsx:new add-oauth-support
# Creates: openspec/changes/add-oauth-support/specs/platform/services/auth/spec.md
```

The change delta structure mirrors your main spec structure automatically.

## Gradual Migration

You can migrate gradually by mixing flat and hierarchical:

1. Start by moving specs to a few top-level domains
2. Keep remaining specs flat
3. Migrate more specs over time
4. Eventually enforce pure hierarchical with config

Example gradual migration:
```text
openspec/specs/
  auth/spec.md                    # Still flat
  payments/spec.md                # Still flat
  _global/
    testing/spec.md               # Migrated
    security/spec.md              # Migrated
  platform/
    services/
      api/spec.md                 # Migrated
      database/spec.md            # Migrated
```

OpenSpec handles this mixed structure automatically.

## Rollback

If you need to rollback:

```bash
# Use git to revert the directory moves
git log --oneline  # Find commit before migration
git reset --hard <commit-hash>

# Or manually move specs back
mv openspec/specs/_global/testing openspec/specs/testing
mv openspec/specs/platform/services/api openspec/specs/api
# Continue for all specs...
```

## Troubleshooting

### Spec not found after migration
**Problem:** `openspec show auth` returns "not found"

**Solution:** Use the full hierarchical path:
```bash
openspec show platform/services/auth
```

### Changes can't find specs
**Problem:** Old change references flat capability names

**Solution:** Update the change's proposal.md with new hierarchical names, or archive the change before migrating.

### Validation errors after migration
**Problem:** `openspec validate --specs` reports path errors

**Solution:** Ensure directory names follow conventions (lowercase, alphanumeric, hyphens/underscores only).

## Need Help?

- **Discord:** [Join the OpenSpec Discord](https://discord.gg/YctCnvvshC)
- **Issues:** [GitHub Issues](https://github.com/Fission-AI/OpenSpec/issues)
- **Docs:** [Organizing Specs](./organizing-specs.md)
