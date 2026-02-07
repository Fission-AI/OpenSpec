# Project Config Demo Guide

A quick-reference guide for demonstrating the `lightspec/config.yaml` feature.

## Summary: What Project Config Does

The feature adds `lightspec/config.yaml` as a lightweight customization layer that lets teams:

- **Set a default schema** - New changes automatically use this schema instead of having to specify `--schema` every time
- **Inject project context** - Shared context (tech stack, conventions) shown to AI when creating any artifact
- **Add per-artifact rules** - Custom rules that only apply to specific artifacts (e.g., proposal, specs)

## Demo Walkthrough

### Demo 1: Interactive Setup (Recommended Entry Point)

The easiest way to demo is through the experimental setup command:

```bash
lightspec artifact-experimental-setup
```

After creating skills/commands, it will prompt:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Configuration (Optional)

Configure project defaults for LightSpec workflows.

? Create lightspec/config.yaml? (Y/n)
```

Walk through:

1. **Select schema** - Shows available schemas with their artifact flows
2. **Add context** - Opens editor for multi-line project context (tech stack, conventions)
3. **Add rules** - Checkbox to select artifacts, then line-by-line rule entry

This creates `lightspec/config.yaml` with the user's choices.

### Demo 2: Manual Config Creation

Show that users can create the config directly:

```bash
cat > lightspec/config.yaml << 'EOF'
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams and notify in #platform-changes
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
EOF
```

### Demo 3: Effect on New Changes

Show that creating a new change now uses the default schema:

```bash
# Before config: had to specify schema
lightspec new change my-feature --schema spec-driven

# After config: schema is automatic
lightspec new change my-feature
# Automatically uses spec-driven from config
```

### Demo 4: Context and Rules Injection

The key demo moment - show how instructions are enriched:

```bash
# Get instructions for an artifact
lightspec instructions proposal --change my-feature
```

Output shows the XML structure:

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api.md
...
</context>

<rules>
- Include rollback plan
- Identify affected teams and notify in #platform-changes
</rules>

<template>
[Schema's built-in proposal template]
</template>
```

Key points to highlight:

- **Context** appears in ALL artifacts (proposal, specs, design, tasks)
- **Rules** ONLY appear for the matching artifact (proposal rules only in proposal instructions)

### Demo 5: Precedence Override

Show the schema resolution order:

```bash
# Config sets schema: spec-driven

# 1. CLI flag wins
lightspec new change feature-a --schema tdd  # Uses tdd

# 2. Change metadata wins over config
# (if .lightspec.yaml in change directory specifies schema)

# 3. Config is used as default
lightspec new change feature-b  # Uses spec-driven from config

# 4. Hardcoded default (no config)
# Would fall back to spec-driven anyway
```

### Demo 6: Validation and Error Handling

Show graceful error handling:

```bash
# Create config with typo
echo "schema: spec-drivne" > lightspec/config.yaml

# Try to use it - shows fuzzy matching suggestions
lightspec new change test
# Schema 'spec-drivne' not found
# Did you mean: spec-driven (built-in)
```

```bash
# Unknown artifact ID in rules - warns but doesn't halt
cat > lightspec/config.yaml << 'EOF'
schema: spec-driven
rules:
  testplan:  # Schema doesn't have this
    - Some rule
EOF

lightspec instructions proposal --change test
# ⚠️ Unknown artifact ID in rules: "testplan". Valid IDs for schema "spec-driven": ...
# (continues working)
```

## Quick Demo Script

Here's a quick all-in-one demo:

```bash
# 1. Show there's no config initially
cat lightspec/config.yaml 2>/dev/null || echo "No config exists"

# 2. Create a simple config
cat > lightspec/config.yaml << 'EOF'
schema: spec-driven
context: |
  This is a demo project using React and TypeScript.
  We follow semantic versioning.
rules:
  proposal:
    - Include migration steps if breaking change
EOF

# 3. Show the config
cat lightspec/config.yaml

# 4. Create a change (uses default schema from config)
lightspec new change demo-feature

# 5. Show instructions with injected context/rules
lightspec instructions proposal --change demo-feature | head -30

# 6. Show that specs don't have proposal rules
lightspec instructions specs --change demo-feature | head -30
```

## What to Emphasize in Demo

- **Low friction** - Teams can customize without forking schemas
- **Shared context** - Everyone on the team gets the same project knowledge
- **Per-artifact rules** - Targeted guidance where it matters
- **Graceful failures** - Typos warn, don't break workflow
- **Team sharing** - Just commit `lightspec/config.yaml` and everyone benefits

## Related Documentation

- [Experimental Workflow Guide](./experimental-workflow.md) - Full user guide with config section
- [Project Config Proposal](../lightspec/changes/project-config/proposal.md) - Original design proposal
- [Project Config Design](../lightspec/changes/project-config/design.md) - Technical implementation details
