# Add Mistral Vibe Support - Technical Design

## Context

Mistral Vibe is an AI coding assistant that uses a SKILL.md format for defining custom skills. While Vibe already works with manually-installed OpenSpec skills (confirmed by user's existing `~/.config/vibe/skills/openspec-*` directory), it is not included in OpenSpec's official tool support list.

The existing OpenSpec architecture supports tool integration through the `AI_TOOLS` configuration array in `src/core/config.ts`. Each tool entry defines metadata including a `skillsDir` for project-local skill directory and optional `detectionPaths` for auto-detection.

Unlike command-based tools (Claude Code, Cursor, etc.), Mistral Vibe is **skill-based only** and does not use or support commands. OpenSpec already generates skills in the correct SKILL.md format that Vibe consumes directly. No command adapter is needed.

## Goals / Non-Goals

**Goals:**
- Add Mistral Vibe to the list of officially supported OpenSpec tools
- Enable `openspec init --tools vibe` to create Vibe skill files automatically
- Enable `openspec update` to refresh Vibe skills when OpenSpec version changes
- Enable `openspec status` to detect and report Vibe skill configuration
- Follow existing patterns for tool configuration

**Non-Goals:**
- Global skills directory support (`.config/vibe/skills/`) - can be Phase 2
- Vibe-specific customizations beyond standard skill format
- Integration with Mistral Vibe's MCP server
- Special handling for Vibe's unique features not related to skill management
- Command generation (Vibe is skill-based, not command-based)

## Decisions

### Decision: Skill-Based Tool Support Without Command Adapter

**Chosen**: Add Mistral Vibe to `AI_TOOLS` configuration only, without creating a command adapter

**Rationale**:
- Mistral Vibe consumes SKILL.md files directly and does not have a command system
- OpenSpec already generates skills in the correct format for Vibe
- The existing `skillsDir` and `detectionPaths` configuration is sufficient for Vibe integration
- Command adapters are only needed for tools that require tool-specific command file formats
- Adding Vibe without a command adapter keeps the architecture clean and honest

**Alternatives considered**:
- Create a Vibe command adapter that generates SKILL.md files — rejected as it conflates commands with skills
- Modify OpenSpec to have separate skill adapters — rejected as unnecessary complexity

### Decision: Tool Configuration Metadata

**Chosen**: Use `value: 'vibe'`, `skillsDir: '.vibe'`, `detectionPaths: ['.vibe/skills']`

**Rationale**:
- User confirmed Vibe loads skills from `.vibe/skills/` directory
- Consistent with other tools that use dot-prefixed directories (`.claude`, `.cursor`, `.windsurf`)
- The `value` field matches CLI argument and internal identifier
- `detectionPaths` enables `openspec status` to detect existing configurations

### Decision: Alphabetical Placement

**Chosen**: Insert Mistral Vibe after 'windsurf' in the AI_TOOLS array

**Rationale**: Maintains alphabetical ordering by `value` field for consistency.

## Risks / Trade-offs

**[Risk] Incomplete integration without command adapter** → **Mitigation**: Vibe doesn't need commands. The `skillsDir` configuration is sufficient for OpenSpec to place skill files in the correct location. The existing skill generation mechanism works without tool-specific adapters for skill-based tools.

**[Risk] Future Vibe features requiring commands** → **Mitigation**: If Vibe adds command support later, a command adapter can be added at that time without breaking existing skill support.

## Migration Plan

1. **Implementation**: Add Mistral Vibe entry to AI_TOOLS configuration
2. **Documentation**: Update `docs/supported-tools.md` with Vibe entry
3. **Testing**:
   - Run `openspec init --tools vibe` in a test project
   - Verify `.vibe/skills/openspec-*/SKILL.md` files are created
   - Verify Vibe can load and use the skills
   - Run `openspec update` and verify skills are refreshed
   - Run `openspec status` and verify Vibe is listed as configured
4. **Rollback**: Remove the Vibe entry from AI_TOOLS. No other files are modified.

## Open Questions

None identified. The implementation is straightforward: add configuration entry and update documentation.
