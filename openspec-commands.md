# OpenSpec Commands - Ensuring Consistency

This document outlines potential commands that could be implemented to ensure AI coding assistants (like Claude Code) follow OpenSpec conventions correctly. These commands would prevent common mistakes like creating spec fragments instead of complete files.

## Problem Statement

AI assistants often violate OpenSpec conventions despite explicit instructions in README.md:
- Creating spec fragments instead of complete future state files
- Not checking for existing specs before creating new ones
- Forgetting to include @requirement markers
- Not following the proper change workflow

## Proposed Commands

### Discovery Commands
Commands to understand the current state before making changes:

```bash
openspec list specs                    # List all existing specs in openspec/specs/
openspec list changes [--status=all]   # List changes (active/archived/abandoned)
openspec show spec [capability-name]   # Display current spec content
openspec find spec [search-term]       # Search for specs by name or content
openspec which spec [name]             # Check if a spec exists and show its path
openspec show change [change-name]     # Display change details (proposal, tasks, specs)
```

### Validation Commands
Commands to catch mistakes and enforce conventions:

```bash
openspec validate change [name]        # Validate a change follows all conventions:
                                       # - Specs are complete files (not fragments)
                                       # - @requirement markers are present
                                       # - Proposal has Why/What/Impact sections
                                       # - Directory structure is correct
                                       # - Future state files contain all existing content

openspec check complete [file]         # Verify a spec file is complete, not a fragment
                                       # Compares with existing spec to ensure all content preserved

openspec check markers [spec-file]     # Verify @requirement markers are present and valid

openspec diff [capability] [change]    # Show diff between current and proposed spec
```

### Workflow Commands
Commands that enforce the correct workflow:

```bash
openspec prepare spec [name] --change=[change-name]
# The MOST CRITICAL command - prevents spec fragments:
# - Checks if spec exists in openspec/specs/
# - If exists: Copies COMPLETE spec to changes/[change]/specs/[name]/
# - If new: Returns "NEW SPEC" status
# - Returns path where AI should edit
# This single command would prevent 90% of convention violations

openspec affect [capability-name]      # Alternative to prepare spec:
                                       # Marks a spec as affected by current change
                                       # Copies existing or creates template
```

### Archive Commands
Commands for managing change lifecycle:

```bash
openspec archive change [name]         # Move completed change to archive/YYYY-MM-DD-[name]/
openspec apply change [name]           # Copy future state specs to current specs/
```

## AI-Powered Validation Approaches

### Using Claude Code in Headless Mode

```bash
openspec validate-with-ai [change-name]
# Runs Claude Code in headless mode to validate:
# - Spins up fresh Claude instance (no creation memory)
# - Asks: "Does this change follow OpenSpec conventions?"
# - Returns specific violations and fixes

openspec ai-review [change-name]
# Similar to validate but more thorough:
# - Reviews complete change for consistency
# - Checks if specs are fragments
# - Verifies future state convention
# - Returns actionable feedback
```

### Git Hooks with AI Validation

```bash
# .git/hooks/pre-commit
# Automatically validates changes before commit using headless Claude:
# - Checks all modified files in openspec/changes/
# - Verifies complete files, not fragments
# - Ensures @requirement markers present
# - Blocks commit if violations found
```

## Minimal Implementation

If only implementing a few commands, these would provide the most value:

1. **`openspec prepare spec [name] --change=[change]`**
   - Forces copy-then-edit workflow
   - Prevents spec fragments
   - Single most important command

2. **`openspec validate change [name]`**
   - Catches all convention violations
   - Provides specific feedback
   - Could use rules or AI

3. **`openspec list specs`**
   - Forces discovery before creation
   - Prevents creating duplicate specs

4. **`openspec which spec [name]`**
   - Quick check if spec exists
   - Returns path or "not found"

## Example Workflow with Commands

```bash
# AI Assistant workflow that would prevent mistakes:

# 1. Check what exists
$ openspec list specs
user-auth
api-core
openspec-conventions

# 2. Prepare spec for modification
$ openspec prepare spec openspec-conventions --change=add-requirement-markers
✓ Copied existing spec to: changes/add-requirement-markers/specs/openspec-conventions/spec.md
Edit this file to add your changes.

# 3. Edit the COMPLETE file (not create fragment)
# AI edits the file...

# 4. Validate before committing
$ openspec validate change add-requirement-markers
✓ All specs are complete files
✓ @requirement markers present
✓ Proposal includes Why/What/Impact
✓ Change follows conventions

# 5. If validation fails
$ openspec validate change add-requirement-markers
✗ Fragment detected: openspec-conventions/spec.md is missing original content
  Fix: Run 'openspec prepare spec openspec-conventions --change=add-requirement-markers'
```

## Implementation Priority

### High Priority (Prevent Major Mistakes)
- `prepare spec` - Prevents fragments
- `validate change` - Catches violations
- `list specs` - Forces discovery

### Medium Priority (Improve Workflow)
- `which spec` - Quick existence check
- `diff` - See what changed
- `show spec` - View current state

### Low Priority (Nice to Have)
- `archive change` - Lifecycle management
- `ai-review` - AI-powered validation
- `find spec` - Advanced search

## Key Insight

The commands don't need to create structure or generate content - the AI assistant does that. The commands need to:
1. **Enforce workflows** that AI forgets
2. **Validate output** to catch mistakes
3. **Provide information** AI fails to check

The goal is making it harder to do the wrong thing than the right thing.