---
name: openspec-wiki-ingest
description: Ingest documentation into LLM Wiki, automatically maintaining the knowledge base
license: MIT
compatibility: Works with any project using OpenSpec + LLM Wiki integration
metadata:
  author: openspec-community
  version: "1.0"
---

# OpenSpec Wiki Ingest Skill

Ingest documentation into the LLM Wiki to automatically maintain the knowledge base.

## Usage

```bash
# Auto-detect mode (batch ingest all unprocessed OpenSpec changes)
/openspec-wiki-ingest

# Ingest specific OpenSpec archived change
/openspec-wiki-ingest openspec/changes/archive/{change-name}

# Ingest other documentation
/openspec-wiki-ingest openspec/docs/raw/{category}/{document-name}.md

# Ingest entire directory
/openspec-wiki-ingest openspec/docs/raw/{category}/{directory}/
```

## Supported Input Sources

### 1. OpenSpec Archived Changes

**Path**: `openspec/changes/archive/{change-name}/`

**Read Files**:
- `proposal.md` - Change overview
- `design.md` - Design decisions
- `tasks.md` - Task list (if exists)

**Generate Page**:
- `openspec/docs/wiki/features/{kebab-case-name}.md` - Feature page

### 2. Other Documentation

**Path**: `openspec/docs/raw/{category}/{document-name}.md`

**Read Files**:
- Directly read document content

**Generate Page**:
- Generate corresponding page according to `openspec/docs/schema/CLAUDE.md` rules

**⚠️ Exclusion Rules** (from `openspec/docs/schema/CLAUDE.md`):
- ❌ **Do not ingest** `openspec/docs/raw/00-meta/` (meta-documents: documents about the documentation system)
- ❌ **Do not ingest** `openspec/docs/raw/05-configurations/` (reference documents: configuration operation manuals)
- ⚠️ **Organize first** `openspec/docs/raw/00-uncategorized/` (uncategorized documents)

**Important**: Specific exclusion rules and categories are defined by the project's `openspec/docs/schema/CLAUDE.md`.

## Working Modes

### Mode 1: Auto-Detection (Recommended for OpenSpec)

**Trigger**: Call `/openspec-wiki-ingest` without arguments

**Workflow**:
1. Scan `openspec/changes/archive/` directory
2. Read `openspec/docs/wiki/features/*.md`, extract existing pages
3. Cross-compare to find un-ingested changes:
   - Check `source` field in Wiki pages
   - Check filename matching
   - Check `last_updated` timestamp
4. Batch ingest unprocessed changes
5. Output summary report

**Output Example**:
```
Detecting OpenSpec changes...

Found {N} archived changes:
  ✓ {existing-change-1}
  ✓ {existing-change-2}
  ⚡ {new-change} (NEW)

Detecting Wiki status...
  Existing: {M} feature pages
  To ingest: {K} changes

Ingesting: {new-change}
  - Reading proposal.md: ✓
  - Reading design.md: ✓
  - Reading tasks.md: ✓
  - Creating Wiki page: ✓
  - Updating index: ✓
  - Recording log: ✓

Done! Successfully ingested {K} changes.
```

### Mode 2: Specified Path

**Trigger**: Call with path argument `/openspec-wiki-ingest <path>`

**Supported Paths**:
- OpenSpec archive: `openspec/changes/archive/{change-name}/`
- Other docs: `openspec/docs/raw/{category}/{document-name}.md`
- Directory: `openspec/docs/raw/{category}/{directory}/`

**Workflow**: Execute according to "Standard Workflow" below

## Standard Workflow

### 0. ⭐ Pre-check (Must Execute)

```bash
# ⚠️ First step: Read Wiki maintenance specifications
READ openspec/docs/schema/CLAUDE.md

# Confirm exclusion rules (read from schema file)
# Check uncategorized documents
CHECK openspec/docs/raw/00-uncategorized/
# If files exist, remind user to organize first
```

**If does not comply with specifications, refuse to ingest and prompt user**:
```
Error: Input source is in exclusion list

Reason: According to openspec/docs/schema/CLAUDE.md, this input source should not be ingested

View specifications: openspec/docs/schema/CLAUDE.md
```

### 1. Read Specifications and Status

```bash
# Read Wiki maintenance specifications
READ openspec/docs/schema/CLAUDE.md

# Read existing page index
READ openspec/docs/wiki/index.md

# Read change log
READ openspec/docs/wiki/log.md
```

### 2. Analyze Input Source

Based on input source type:
- **OpenSpec**: Read change documents, extract key information
- **Other docs**: Read content, analyze topic and type

**Key**: Extract information from actually read files, do not fabricate or assume content.

### 3. Determine Page Type

Determine page type based on document content and `openspec/docs/schema/CLAUDE.md`:
- `feature` - Feature page
- `component` - Component page
- `guide` - Guide page
- `api` - API page
- `overview` - Project overview (only one, in wiki root)

**Note**: Page types and categories are defined by the project's schema file and may vary by project.

### 4. Create/Update Page

Create or update wiki page according to page type:

#### Feature Page Template (Example)

```markdown
---
title: {Feature Name}
type: feature
source: openspec/changes/archive/{change-name}
last_updated: {YYYY-MM-DD}
tags: [{tags extracted from document}]
---

# {Feature Name}

## Overview
{Extracted from proposal.md}

## Implementation Details
{Extracted from implementation.md}

## Technical Decisions
{Extracted from design.md}

## Related Links
- [[{related-feature-1}]]
- [[{related-feature-2}]]
```

**Important**:
- All content extracted from actually read files
- Do not fabricate feature names, descriptions, or examples
- Template structure defined by project's schema file

#### Other Page Types

Refer to page type definitions in `openspec/docs/schema/CLAUDE.md`.

### 5. Update Cross-References

1. Check related pages (based on tags, keywords)
2. Add cross-references `[[page-name]]`
3. Update "Related Links" section in related pages

### 6. Update Index

Update `openspec/docs/wiki/index.md`:
- Add new page link under appropriate category
- Update statistics

### 7. Record Log

Append to `openspec/docs/wiki/log.md`:

```markdown
## [{YYYY-MM-DD}] ingest | {source}

**Operation**: ingest
**Source**: {source-path}
**Affected Pages**:
- Created: openspec/docs/wiki/{type}/{name}.md
- Updated: openspec/docs/wiki/index.md
- Updated: openspec/docs/wiki/{related-page}.md

**Summary**: {brief description}
**Conflicts**: None / X conflicts
**Outdated Content**: None / X outdated pages
```

## Considerations

### 1. Prioritize Reading Existing Pages

Before creating new pages, check if they already exist:
- If exists, update existing page
- If not exists, create new page

### 2. Check Conflicts

If new content conflicts with existing pages:
- Add `⚠️ **Conflict**` marker
- Record conflict count in log

### 3. Mark Outdated Content

If new content makes old content obsolete:
- Add `⚠️ **Outdated**` marker to old page
- Add link to new page

### 4. Maintain Consistent Format

- Use format defined in `openspec/docs/schema/CLAUDE.md`
- YAML frontmatter must be complete
- Cross-references use `[[page-name]]` format

### 5. Language Standards

- Follow project's language standards
- Preserve original technical terms
- Code comments follow project conventions

## Examples

### Ingest OpenSpec Change

```bash
/openspec-wiki-ingest openspec/changes/archive/{change-name}
```

**Output**:
```
Ingesting: openspec/changes/archive/{change-name}

Reading specifications: ✓
Reading index: ✓ ({N} existing pages)

Analyzing input source: ✓
  - proposal.md: ✓
  - design.md: ✓
  - tasks.md: ✓

Determining page type: feature

Creating page:
  openspec/docs/wiki/features/{name}.md: ✓

Updating cross-references:
  - [[{related-page-1}]]: ✓
  - [[{related-page-2}]]: ✓

Updating index:
  openspec/docs/wiki/index.md: ✓

Recording log:
  openspec/docs/wiki/log.md: ✓

Done! Affected {M} pages, no conflicts, no outdated content
```

### Ingest Other Documentation

```bash
/openspec-wiki-ingest openspec/docs/raw/{category}/{document-name}.md
```

**Output**:
```
Ingesting: openspec/docs/raw/{category}/{document-name}.md

Reading specifications: ✓
Reading index: ✓ ({N} existing pages)

Analyzing input source: ✓

Determining page type: {type}

Creating page:
  openspec/docs/wiki/{type}/{name}.md: ✓

Updating cross-references:
  - [[{related-page}]]: ✓

Updating index:
  openspec/docs/wiki/index.md: ✓

Recording log:
  openspec/docs/wiki/log.md: ✓

Done! Affected {M} pages, no conflicts, no outdated content
```

## Error Handling

### Input Source Not Found

```
Error: Cannot find input source
Path: {path}
Please check if path is correct
```

### Wiki Structure Not Initialized

```
Error: Wiki structure not initialized
Please refer to project documentation to initialize Wiki
```

### Schema File Missing

```
Error: Schema file missing
Path: openspec/docs/schema/CLAUDE.md
Please refer to project documentation to create schema file
```

### In Exclusion List

```
Error: Input source is in exclusion list

Reason: According to openspec/docs/schema/CLAUDE.md, this input source should not be ingested

View specifications: openspec/docs/schema/CLAUDE.md
```

## Related Skills

- `/openspec-wiki-query` - Query Wiki skill
- `/openspec-archive-change` - Archive OpenSpec change (automatically triggers this skill)

## Project-Specific Configuration

This skill is generic, but projects need configuration:

1. **Wiki Path**: Default `openspec/docs/wiki/`
2. **Schema File**: Default `openspec/docs/schema/CLAUDE.md`, defines Wiki structure specifications
3. **Exclusion Rules**: Defined in schema file for what should not be ingested
4. **Page Types**: features, components, guides, api, etc., defined in schema
5. **Template Format**: Template structure for each page type, defined in schema

**Important**:
- Do not hardcode project-specific examples in skill file
- All content should be obtained from actually read files
- Different projects can have different schemas, paths, and rules
