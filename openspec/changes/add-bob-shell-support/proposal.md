# Add Bob Shell Support to OpenSpec

## Overview

Add support for IBM Bob Shell to OpenSpec's multi-tool integration system, enabling Bob Shell users to leverage OpenSpec's workflow commands (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, etc.) directly within their Bob Shell environment.

## Motivation

Bob Shell is IBM's AI coding assistant that supports custom slash commands through markdown files. By integrating Bob Shell into OpenSpec's supported tools list, we enable Bob Shell users to:

- Use OpenSpec's proven workflow patterns for spec-driven development
- Maintain consistency with teams using other AI tools (Claude Code, Cursor, etc.)
- Leverage OpenSpec's change management and artifact generation capabilities
- Access the full suite of OpenSpec workflows (propose, explore, apply, archive, etc.)

## Current State

OpenSpec currently supports 24+ AI coding tools but does not include Bob Shell. The existing architecture uses:
- Tool definitions in `src/core/config.ts` (AI_TOOLS array)
- Command adapters in `src/core/command-generation/adapters/`
- A registry system for adapter lookup
- Tool-specific file path and format generation

## Proposed Changes

### 1. Bob Shell Command Structure

Based on Bob Shell documentation:

**Directory Structure:**
- Project commands: `.bob/commands/`
- Global commands: `~/.bob/commands/` (not used by OpenSpec)

**File Format:**
- Extension: `.md` (Markdown)
- Naming: `command-name.md` → `/command-name` slash command
- Optional YAML frontmatter for metadata

**Frontmatter Fields:**
```yaml
---
description: Brief description shown in command menu
argument-hint: <arg1> <arg2>  # Optional, for commands with arguments
---
```

**Example Command File:**
```markdown
---
description: Create a new OpenSpec change proposal
argument-hint: <change-name>
---

Create a new OpenSpec change proposal for: $1

Follow the OpenSpec workflow to:
1. Create the change directory structure
2. Generate proposal.md with problem statement and goals
3. Create specs/ directory for requirements
4. Generate design.md for technical approach
5. Create tasks.md with implementation checklist
```

### 2. Integration Approach

**Add Bob Shell to AI_TOOLS** (`src/core/config.ts`):
```typescript
{ 
  name: 'Bob Shell', 
  value: 'bob', 
  available: true, 
  successLabel: 'Bob Shell', 
  skillsDir: '.bob' 
}
```

**Create Bob Shell Adapter** (`src/core/command-generation/adapters/bob.ts`):
```typescript
export const bobAdapter: ToolCommandAdapter = {
  toolId: 'bob',
  
  getFilePath(commandId: string): string {
    return path.join('.bob', 'commands', `${commandId}.md`);
  },
  
  formatFile(content: CommandContent): string {
    // Generate frontmatter + body
    return `---
description: ${content.description}
---

${content.body}
`;
  },
};
```

**Register Adapter** (update `src/core/command-generation/registry.ts`):
- Import bobAdapter
- Add to registry map

**Export Adapter** (update `src/core/command-generation/adapters/index.ts`):
- Export bobAdapter

### 3. Command Generation

OpenSpec will generate Bob Shell command files for each workflow:

**Core Profile Commands:**
- `.bob/commands/opsx-propose.md` → `/opsx-propose`
- `.bob/commands/opsx-explore.md` → `/opsx-explore`
- `.bob/commands/opsx-apply.md` → `/opsx-apply`
- `.bob/commands/opsx-archive.md` → `/opsx-archive`

**Expanded Profile Commands (when enabled):**
- `.bob/commands/opsx-new.md` → `/opsx-new`
- `.bob/commands/opsx-continue.md` → `/opsx-continue`
- `.bob/commands/opsx-ff.md` → `/opsx-ff`
- `.bob/commands/opsx-verify.md` → `/opsx-verify`
- `.bob/commands/opsx-sync.md` → `/opsx-sync`
- `.bob/commands/opsx-bulk-archive.md` → `/opsx-bulk-archive`
- `.bob/commands/opsx-onboard.md` → `/opsx-onboard`

### 4. Documentation Updates

**Update `docs/supported-tools.md`:**
- Add Bob Shell to the tools table
- Document directory structure: `.bob/commands/opsx-<id>.md`
- Note: Bob Shell does not use the Agent Skills spec, only custom commands
- Explain that commands appear as `/opsx-propose`, `/opsx-apply`, etc.

**Update `README.md`:**
- Add Bob Shell to the list of supported tools
- Update tool count (24+ → 25+)

### 5. Skills Directory Consideration

Bob Shell supports custom modes in `.bob/modes/` with XML rule files (as seen in the mode.yaml example). However, OpenSpec's current skill generation follows the Agent Skills specification which may not align with Bob Shell's mode system.

**Decision:** 
- **Phase 1**: Only generate command files (`.bob/commands/`)
- **Phase 2** (future): Evaluate if OpenSpec skills should be converted to Bob Shell modes

**Rationale:**
- Commands provide immediate value and are simpler to implement
- Bob Shell's mode system is more complex (XML rules, custom structure)
- Commands are sufficient for OpenSpec's workflow invocation needs
- Can revisit mode integration based on user feedback

## Implementation Plan

### Phase 1: Core Integration
1. Add Bob Shell to AI_TOOLS array
2. Create Bob Shell command adapter
3. Register and export adapter
4. Test command generation with `openspec init --tools bob`
5. Verify generated command files work in Bob Shell

### Phase 2: Documentation
1. Update supported-tools.md with Bob Shell details
2. Update README.md to include Bob Shell
3. Add Bob Shell examples to getting-started.md (if applicable)

### Phase 3: Testing
1. Manual testing with Bob Shell installation
2. Verify all workflow commands generate correctly
3. Test command invocation in Bob Shell
4. Validate frontmatter parsing
5. Test profile switching (core → expanded)

## Success Criteria

- [ ] Bob Shell appears in `openspec init` tool selection
- [ ] Running `openspec init --tools bob` generates `.bob/commands/` directory
- [ ] All core workflow commands generate with correct format
- [ ] Generated commands work when invoked in Bob Shell (e.g., `/opsx-propose`)
- [ ] Documentation accurately describes Bob Shell integration
- [ ] `openspec update` regenerates Bob Shell commands correctly
- [ ] Profile switching updates Bob Shell commands appropriately

## Testing Strategy

### Manual Testing
1. Install OpenSpec in a test project
2. Run `openspec init --tools bob`
3. Verify `.bob/commands/` directory created
4. Check generated command files for correct format
5. Open project in Bob Shell
6. Type `/` and verify OpenSpec commands appear
7. Invoke `/opsx-propose test-feature` and verify behavior
8. Test other workflow commands

### Automated Testing
- Add unit tests for Bob Shell adapter
- Test command file generation
- Verify frontmatter formatting
- Test file path generation

## Risks and Mitigations

**Risk**: Bob Shell command format changes
**Mitigation**: Monitor Bob Shell documentation, version adapter if needed

**Risk**: Frontmatter parsing issues in Bob Shell
**Mitigation**: Test with various frontmatter configurations, keep format simple

**Risk**: Command naming conflicts with existing Bob Shell commands
**Mitigation**: Use `opsx-` prefix consistently, document in supported-tools.md

**Risk**: Skills vs. Commands confusion
**Mitigation**: Clearly document that OpenSpec uses commands, not modes (Phase 1)

## Future Enhancements

1. **Bob Shell Mode Integration**: Convert OpenSpec skills to Bob Shell modes with XML rules
2. **Argument Support**: Add argument hints for commands that accept parameters
3. **Global Commands**: Option to install commands globally in `~/.bob/commands/`
4. **Mode-Aware Commands**: Commands that switch Bob Shell to appropriate mode before execution

## References

- Bob Shell Documentation: https://bob.ibm.com/docs/shell
- Bob Shell Slash Commands: https://bob.ibm.com/docs/shell/features/slash-commands
- OpenSpec Command Generation: `src/core/command-generation/`
- OpenSpec Tool Configuration: `src/core/config.ts`
