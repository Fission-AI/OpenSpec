# Update Pastelsdd Agent Instructions

## Why

The current Pastelsdd agent instructions need updates to follow best practices for AI assistant instructions (brevity, clarity, removing ambiguity), ensure CLI commands are current with the actual implementation, and properly document the three-stage workflow pattern that agents should follow.

## What Changes

### Core Structure Improvements
- **Front-load the 3-stage workflow** as the primary mental model:
  1. Creating a change proposal (proposal.md, spec deltas, design.md, tasks.md)
  2. Implementing a change proposal:
     - First read proposal.md to understand the change
     - Read design.md if it exists for technical context
     - Read tasks.md for the implementation checklist
     - Complete tasks one by one
     - Mark each task complete immediately after finishing
  3. Archiving the change proposal (using archive command after deployment)
- **Reduce instruction length by 50%** while maintaining all critical information
- **Restructure with clear hierarchy**: Core Workflow → Quick Start → Commands → Details → Edge Cases

### Decision Clarity Enhancements
- **Add clear decision trees** for common scenarios (bug vs feature, proposal needed vs not)
- **Remove ambiguous conditions** that confuse agent decision-making
- **Add "Before Any Task" checklist** for context gathering
- **Add "Before Creating Specs" rule** - Always check existing specs first to avoid duplicates

### CLI Documentation Updates
- **Complete command documentation** with all current functionality:
  - `pastelsdd init [path]` - Initialize Pastelsdd in a project
  - `pastelsdd list` - List all active changes (default)
  - `pastelsdd list --specs` - List all specifications
  - `pastelsdd show [item]` - Display change or spec with auto-detection
  - `pastelsdd show` - Interactive mode for selection
  - `pastelsdd diff [change]` - Show spec differences for a change
  - `pastelsdd validate [item]` - Validate changes or specs
  - `pastelsdd archive [change]` - Archive completed change after deployment
  - `pastelsdd update [path]` - Update Pastelsdd instruction files
- **Document all flags and options**:
  - `--json` output format for programmatic use
  - `--type change|spec` for disambiguation
  - `--skip-specs` for tooling-only archives
  - `--strict` for strict validation mode
  - `--no-interactive` to disable prompts
- **Remove deprecated command references** (noun-first patterns like `pastelsdd change show`)
- **Add concrete examples** for each command variation
- **Document debugging commands**:
  - `pastelsdd show [change] --json --deltas-only` for inspecting deltas
  - `pastelsdd validate [change] --strict` for comprehensive validation

### Spec File Structure Documentation
- **Complete spec file examples** showing proper structure:
  ```markdown
  ## ADDED Requirements
  ### Requirement: Clear requirement statement
  The system SHALL provide the functionality...
  
  #### Scenario: Descriptive scenario name
  - **WHEN** condition occurs
  - **THEN** expected outcome
  - **AND** additional outcomes
  ```
- **Scenario formatting requirements** (critical - most common error):
  - MUST use `#### Scenario:` headers (4 hashtags)
  - NOT bullet lists or bold text
  - Each requirement MUST have at least one scenario
- **Delta file location** - Clear explanation:
  - Spec files go in `changes/{name}/specs/` directory
  - Deltas are automatically extracted from these files
  - Use operation prefixes: ADDED, MODIFIED, REMOVED, RENAMED

### Troubleshooting Section
- **Common errors and solutions**:
  - "Change must have at least one delta" → Check specs/ directory exists with .md files
  - "Requirement must have at least one scenario" → Check scenario uses `#### Scenario:` format
  - Silent scenario parsing failures → Verify exact header format
- **Delta detection debugging**:
  - Use `pastelsdd show [change] --json --deltas-only` to inspect parsed deltas
  - Check that spec files have operation prefixes (## ADDED Requirements)
  - Verify specs/ subdirectory structure
- **Validation best practices**:
  - Always use `--strict` flag for comprehensive checks
  - Use JSON output for debugging: `--json | jq '.deltas'`

### Agent-Specific Improvements
- **Implementation workflow** - Clear step-by-step process:
  1. Read proposal.md to understand what's being built
  2. Read design.md (if exists) for technical decisions
  3. Read tasks.md for the implementation checklist
  4. Implement tasks one by one in order
  5. Mark each task complete immediately: `- [x] Task completed`
  6. Never skip ahead or batch task completion
- **Spec discovery workflow** - Always check existing specs before creating new ones:
  - Use `pastelsdd list --specs` to see all current specs
  - Check if capability already exists before creating
  - Prefer modifying existing specs over creating duplicates
- **Tool selection matrix** - When to use Grep vs Glob vs Read
- **Error recovery patterns** - How to handle common failures
- **Context management guide** - What to read before starting tasks
- **Verification workflows** - How to confirm changes are correct

### Best Practices Section
- **Be concise** - One-line answers when appropriate
- **Be specific** - Use exact file paths and line numbers (file.ts:42)
- **Start simple** - Default to <100 lines, single-file implementations
- **Justify complexity** - Require data/metrics for any optimization

## Impact

- Affected specs: None (this is a tooling/documentation change)
- Affected code: 
  - `src/core/templates/claude-template.ts` - Update CLAUDE.md template
- Affected documentation:
  - `pastelsdd/README.md` - Main Pastelsdd instructions
  - CLAUDE.md files generated by `pastelsdd init` command

Note: This is a tooling/infrastructure change that doesn't require spec updates. When archiving, use `pastelsdd archive update-agent-instructions --skip-specs`.