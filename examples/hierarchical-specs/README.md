# Hierarchical Specs Example

This example demonstrates how to organize OpenSpec specifications using a hierarchical structure.

## Structure

```
openspec/specs/
  _global/
    testing/spec.md        - Global testing standards
    security/spec.md       - Security requirements for all components
    monitoring/spec.md     - System-wide monitoring specs
  platform/
    services/
      api/spec.md          - API service specifications
      auth/spec.md         - Authentication service specs
      database/spec.md     - Database service specs
    infrastructure/
      deployment/spec.md   - Deployment requirements
```

## Benefits of This Organization

1. **Clear Ownership**: Each domain (`_global`, `platform`) can be owned by different teams
2. **Scoped Concerns**: Global specs (`_global/`) apply everywhere, platform specs (`platform/`) are service-specific
3. **Scalability**: Easy to add new services under `platform/services/` without cluttering the root
4. **Discoverability**: Related specs are grouped together

## Working With This Structure

### Viewing Specs

```bash
# View a global spec
openspec show _global/testing

# View a service spec
openspec show platform/services/api

# List all specs
openspec list --specs
```

### Creating Changes

When creating a change that affects hierarchical specs, the delta structure mirrors the main structure:

```bash
/opsx:new add-rate-limiting
```

Creates:
```
openspec/changes/add-rate-limiting/
  proposal.md
  specs/
    platform/
      services/
        api/spec.md       # Delta spec for API changes
```

### Validating

```bash
# Validate all specs
openspec validate --specs

# Validate a specific spec
openspec validate platform/services/api
```

## Try It Yourself

1. Copy this directory structure to your project
2. Run `openspec init` (if not already initialized)
3. Try viewing and validating the specs
4. Create a change that modifies one of the hierarchical specs
