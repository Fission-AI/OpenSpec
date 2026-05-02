# LLM Wiki Integration Guide

> Complete knowledge management workflow for OpenSpec projects

## Overview

OpenSpec + LLM Wiki integration provides a complete knowledge loop:

**Query** (before work) → **Explore/Propose** → **Apply** → **Archive** → **Ingest** (after completion)

This integration solves common knowledge management challenges:
- Avoids duplicate discussions of solved problems
- Leverages existing features and design decisions
- Automatically accumulates knowledge over time
- Maintains context across team members and sessions

## Quick Start

### 1. Install Skills

Copy the example skills to your project's AI tool directory:

```bash
# For Claude Code
cp examples/wiki-integration/skills/openspec-wiki-query .claude/skills/
cp examples/wiki-integration/skills/openspec-wiki-ingest .claude/skills/

# For other tools, adjust path accordingly
# Cursor: .cursor/skills/
# Windsurf: .windsurf/skills/
# etc.
```

### 2. Initialize Wiki Structure

Create the recommended directory structure in your `openspec/` folder:

```bash
mkdir -p openspec/docs/wiki/features
mkdir -p openspec/docs/wiki/components
mkdir -p openspec/docs/wiki/guides
mkdir -p openspec/docs/wiki/api
mkdir -p openspec/docs/raw/00-meta
mkdir -p openspec/docs/raw/00-uncategorized
mkdir -p openspec/docs/raw/05-configurations
mkdir -p openspec/docs/schema
```

**Directory Structure**:
```
openspec/
├── docs/
│   ├── wiki/              # Knowledge base pages
│   │   ├── index.md       # Main index of all pages
│   │   ├── log.md         # Change log for wiki updates
│   │   ├── features/      # Feature documentation
│   │   ├── components/    # Component documentation
│   │   ├── guides/        # How-to guides
│   │   └── api/           # API documentation
│   ├── raw/               # Raw source documents
│   │   ├── 00-meta/       # Meta-documents (not ingested)
│   │   ├── 00-uncategorized/ # Uncategorized docs (organize first)
│   │   └── 05-configurations/ # Reference docs (not ingested)
│   └── schema/            # Schema definitions
│       └── CLAUDE.md      # Wiki structure specifications
```

### 3. Create Initial Files

Create `openspec/docs/wiki/index.md`:

```markdown
# Project Wiki Index

## Features
- [[feature-name]] - Brief description

## Components
- [[component-name]] - Brief description

## Guides
- [[guide-name]] - Brief description

## Statistics
- Total Pages: 0
- Last Updated: YYYY-MM-DD
```

Create `openspec/docs/wiki/log.md`:

```markdown
# Wiki Change Log

## [YYYY-MM-DD] init | manual
**Operation**: initialize
**Summary**: Initial wiki setup
```

Create `openspec/docs/schema/CLAUDE.md` (customize for your project):

```markdown
# Wiki Schema Specifications

## Page Types

### Feature Pages
Location: `openspec/docs/wiki/features/{name}.md`
Template: See below

### Component Pages
Location: `openspec/docs/wiki/components/{name}.md`

## Exclusion Rules

Do NOT ingest:
- `openspec/docs/raw/00-meta/` - Meta-documents about the documentation system
- `openspec/docs/raw/05-configurations/` - Reference configuration manuals

Organize First:
- `openspec/docs/raw/00-uncategorized/` - Must be categorized before ingestion

## Page Template

Feature pages should include:
- YAML frontmatter with title, type, source, last_updated, tags
- Overview section
- Implementation details
- Technical decisions
- Related links using `[[page-name]]` format
```

### 4. Configure Hooks

Add hooks to your AI tool's configuration file. Example for Claude Code (`settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Skill",
        "if": "Skill(openspec-explore) || Skill(openspec-propose)",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before starting, query the Wiki for relevant background information and existing features to avoid duplicate work and leverage existing design decisions: Read openspec/docs/wiki/index.md and openspec/docs/wiki/log.md, then search for relevant pages based on user intent."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Skill",
        "if": "Skill(openspec-archive-change)",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "/openspec-wiki-ingest"
          }
        ]
      }
    ]
  }
}
```

**Note**: Hook configuration varies by IDE/tool. See the [Supported Tools](#supported-tools) section for details.

### 5. Restart Your IDE

Restart your AI-powered IDE for the new skills and hooks to take effect.

## Configuration

### PreToolUse Hook

Automatically queries the wiki before starting exploration or proposal work.

**When it triggers**:
- Before running `/openspec-explore`
- Before running `/openspec-propose`

**What it does**:
- Reads `openspec/docs/wiki/index.md` to understand available knowledge
- Reads `openspec/docs/wiki/log.md` to see recent changes
- Searches for relevant pages based on user's topic
- Provides context to avoid duplicate work

### PostToolUse Hook

Automatically ingests completed changes into the wiki after archiving.

**When it triggers**:
- After running `/openspec-archive-change`

**What it does**:
- Scans `openspec/changes/archive/` for unprocessed changes
- Reads proposal, design, and task documents
- Creates or updates wiki feature pages
- Updates cross-references and index
- Records changes in the log

### Customizing Wiki Structure

You can customize the wiki structure by modifying `openspec/docs/schema/CLAUDE.md`:

**Page Types**: Add custom types beyond features/components/guides/api

**Exclusion Rules**: Define which raw documents should not be ingested

**Templates**: Customize page templates for your project's needs

**Language**: Specify language requirements (English, Chinese, etc.)

## Usage Examples

### Example 1: Starting a New Feature

```bash
# User runs: /openspec-propose "Add user authentication"

# PreToolUse hook automatically triggers:
# 1. Queries wiki for existing auth-related features
# 2. Finds [[user-login]] and [[session-management]]
# 3. Provides context: "Project already has login and session features"

# AI uses this context to propose complementary features
# rather than duplicating existing work
```

### Example 2: Completing a Change

```bash
# User completes work and runs: /openspec-archive-change

# PostToolUse hook automatically triggers:
# 1. Reads proposal.md, design.md, tasks.md from archive
# 2. Creates openspec/docs/wiki/features/user-authentication.md
# 3. Updates index.md with new feature link
# 4. Appends entry to log.md
# 5. Adds cross-references to related features

# Next time someone queries the wiki, they'll find this feature
```

### Example 3: Manual Query

```bash
# Manually query wiki for specific topic
/openspec-wiki-query "database migration"

# Returns:
# - [[database-schema-evolution]] - Previous migration strategy
# - [[backup-procedures]] - Related backup documentation
# - Design decisions about migration approach
```

### Example 4: Manual Ingest

```bash
# Ingest specific archived change
/openspec-wiki-ingest openspec/changes/archive/add-payment-gateway

# Or ingest uncategorized documentation
/openspec-wiki-ingest openspec/docs/raw/00-uncategorized/api-notes.md
```

## Best Practices

### 1. Keep Wiki Updated

- Archive changes promptly after completion
- Review auto-generated wiki pages for accuracy
- Add missing cross-references manually if needed

### 2. Organize Raw Documents

- Regularly categorize documents in `00-uncategorized/`
- Move meta-documents to `00-meta/` (won't be ingested)
- Keep reference docs in `05-configurations/` (won't be ingested)

### 3. Write Good Proposals

The quality of wiki pages depends on proposal and design documents:

- **proposal.md**: Clear overview of what and why
- **design.md**: Detailed technical decisions and rationale
- **tasks.md**: Implementation steps (helps with completeness)

### 4. Review Auto-Generated Content

After automatic ingestion:
- Verify extracted information is accurate
- Add any missing context or examples
- Update cross-references to related features

### 5. Use Consistent Naming

- Use kebab-case for page names: `user-authentication.md`
- Match page names to change names when possible
- Be consistent with terminology across pages

### 6. Maintain Cross-References

Good cross-references make the wiki navigable:
- Link to related features in "Related Links" sections
- Link to component pages from feature pages
- Update old pages when new related features are added

## Troubleshooting

### Issue: Skills Not Found

**Symptom**: `/openspec-wiki-query` or `/openspec-wiki-ingest` commands not recognized

**Solution**:
1. Verify skills are in correct directory (e.g., `.claude/skills/`)
2. Check skill file has valid YAML frontmatter
3. Restart your IDE
4. Check IDE logs for skill loading errors

### Issue: Hooks Not Triggering

**Symptom**: Wiki query/ingest doesn't happen automatically

**Solution**:
1. Verify hooks configuration syntax is correct
2. Check hook conditions match skill names exactly
3. Ensure settings file is in correct location for your IDE
4. Test hooks manually by running skills directly

### Issue: Wiki Structure Not Found

**Symptom**: Skills report "Wiki structure not initialized"

**Solution**:
1. Verify `openspec/docs/wiki/index.md` exists
2. Check directory structure matches expected layout
3. Run initialization steps from Quick Start section
4. Verify paths in skill files match your actual structure

### Issue: Ingestion Fails

**Symptom**: `/openspec-wiki-ingest` reports errors

**Solution**:
1. Check input source path is correct
2. Verify schema file exists at `openspec/docs/schema/CLAUDE.md`
3. Ensure input source is not in exclusion list
4. Check file permissions for write access to wiki directory

### Issue: Duplicate Pages

**Symptom**: Multiple pages for same feature

**Solution**:
1. Check if change was already ingested (look in log.md)
2. Verify change name matches existing wiki page
3. Manually merge duplicate pages if needed
4. Update source field to prevent future duplicates

## Supported Tools

### Claude Code ✅ Verified

**Configuration File**: `settings.json` in project root or home directory

**Hook Support**: Full support for PreToolUse and PostToolUse hooks

**Example**: See `examples/wiki-integration/claude-settings.json`

### Other AI Tools

Different tools have different hook mechanisms:

- **Cursor**: May use different configuration format
- **Windsurf**: Check Windsurf documentation for hooks
- **GitHub Copilot**: Limited hook support
- **Custom Tools**: Implement similar pre/post execution logic

**Recommendation**: Start with Claude Code as reference implementation, adapt for other tools as needed.

## Advanced Topics

### Customizing Ingestion Logic

You can modify the ingestion behavior by:

1. **Editing skill files**: Adjust templates and workflows
2. **Modifying schema**: Change page types and rules
3. **Adding filters**: Exclude specific changes or patterns
4. **Custom transformations**: Format content differently

### Batch Processing

For large backlogs of archived changes:

```bash
# Ingest all unprocessed changes at once
/openspec-wiki-ingest

# The skill will:
# 1. Scan all archived changes
# 2. Compare with existing wiki pages
# 3. Process only un-ingested changes
# 4. Provide summary report
```

### Multi-Project Setup

If working across multiple projects:

1. Copy skills to each project's AI tool directory
2. Initialize wiki structure in each project
3. Configure hooks per project
4. Each project maintains its own wiki independently

### Team Collaboration

For team environments:

1. Commit wiki structure to version control
2. Document wiki conventions in team guidelines
3. Review auto-generated pages as part of code review
4. Encourage team members to query wiki before proposing changes

## Migration Guide

### From No Wiki to Wiki Integration

1. Set up wiki structure (Quick Start Step 2)
2. Create initial index and log files
3. Install skills and configure hooks
4. Backfill existing changes:
   ```bash
   # Manually ingest past archived changes
   /openspec-wiki-ingest openspec/changes/archive/{old-change-1}
   /openspec-wiki-ingest openspec/changes/archive/{old-change-2}
   # ... repeat for important historical changes
   ```

### From Manual Documentation to Automated

1. Move existing docs to `openspec/docs/raw/`
2. Categorize appropriately (meta, uncategorized, configurations)
3. Run ingestion on organized documents
4. Review and refine generated pages

## Related Resources

- [OpenSpec Documentation](https://github.com/Fission-AI/OpenSpec)
- [Agent Skills Specification](https://skills.sh/)
- [LLM Wiki Pattern](https://llm-wiki-pattern.example.com) *(replace with actual resource)*

## Contributing

Found issues or have improvements? Please contribute:

1. Report bugs via GitHub Issues
2. Suggest enhancements to skill workflows
3. Share best practices from your experience
4. Improve documentation with real-world examples

---

**Version**: 1.0  
**Last Updated**: 2026-04-22  
**Maintained By**: OpenSpec Community
