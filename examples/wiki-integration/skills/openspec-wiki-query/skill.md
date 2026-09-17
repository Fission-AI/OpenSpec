---
name: openspec-wiki-query
description: Query LLM Wiki for relevant information, context, and background knowledge before starting work
license: MIT
compatibility: Works with any project using OpenSpec + LLM Wiki integration
metadata:
  author: openspec-community
  version: "1.0"
---

# OpenSpec Wiki Query Skill

Query the LLM Wiki knowledge base to retrieve relevant background information, context, and existing features.

## Usage

```bash
# Automatic mode (query based on current context)
/openspec-wiki-query

# Query specific topic
/openspec-wiki-query {search keywords}
```

## Workflow

### Step 1: Read Wiki Structure

```bash
# Read main index to understand overall knowledge base structure
READ openspec/docs/wiki/index.md

# Read change log to understand recent work
READ openspec/docs/wiki/log.md
```

### Step 2: Intelligent Search

Based on user's topic or current context, search for relevant pages:

#### Search Strategy

1. **Keyword Matching**
   - Search for relevant titles and descriptions in index.md
   - Extract related features, components, guides, API pages

2. **Context Inference**
   - Infer related topics from query keywords
   - Find related features, components, architecture documentation

3. **Cross-References**
   - Check "Related Links" sections in relevant pages
   - Look for dependencies and impact scope

### Step 3: Read Relevant Pages

For found relevant pages, read their content:

```bash
# Read specific page content
READ openspec/docs/wiki/features/{feature-name}.md
READ openspec/docs/wiki/guides/{guide-name}.md
READ openspec/docs/wiki/components/{component-name}.md
```

**Key**: Extract information from actually read files, do not fabricate or assume content.

### Step 4: Return Structured Summary

Based on search results and actually read content, return the following information:

```markdown
## 📚 Wiki Query Results

### Related {Page Type}
- [[{page-name}]] - {brief description extracted from page}

### Related Design Decisions
- {decision content extracted from page}

### Related {Other Page Type}
- [[{page-name}]] - {usage description extracted from page}

### Related Links
- [[{related-page-1}]]
- [[{related-page-2}]]
```

**Important**: All descriptions and links must be based on actually read file content.

## Output Format

### Scenario 1: Found Relevant Content

```markdown
## 📚 Wiki Query Results

### ✅ Found Related {Page Type}

**{Feature Name}** (openspec/docs/wiki/{type}/{name}.md)
- **Overview**: {overview extracted from page}
- **Key Decisions**: {decisions extracted from page}
- **Implementation Points**:
  - {point 1 extracted from page}
  - {point 2 extracted from page}

### 📋 Related Documentation

- [[{related-page-1}]] - {description extracted from page}
- [[{related-page-2}]] - {description extracted from page}

### ⚠️ Notes

- {notes extracted from page}

### 🔗 Related Links

- [[{related-page-3}]]
```

### Scenario 2: No Direct Match Found

```markdown
## 📚 Wiki Query Results

### ❌ No Direct Match Found

**Search Keywords**: {user-provided keywords}

**Closest Matches**:
- [[{possibly-related-page-1}]] - {reason for relevance}
- [[{possibly-related-page-2}]] - {reason for relevance}

**Suggestions**:
- Check if keywords are accurate
- View openspec/docs/wiki/index.md for complete content list
- View openspec/docs/wiki/log.md for recent changes

**Current Wiki Coverage**:
- {statistics extracted from index.md}
```

### Scenario 3: Multiple Related Results (Potential Conflicts or Duplicates)

```markdown
## 📚 Wiki Query Results

### ⚠️ Multiple Related {Page Type} Found

**Scenario**: Possible feature duplication or evolution

**Related {Page Type}**:
1. [[{page-name-1}]] - {description extracted from page}
2. [[{page-name-2}]] - {description extracted from page}

**Analysis**:
- {relationship analysis based on page content}

**Recommendations**:
- {recommendations based on page content}
```

## Query Optimization

### Performance Considerations

- Only read necessary files (index.md, log.md, relevant pages)
- Avoid recursively reading all Wiki pages
- Use keyword matching instead of full-text search

### Accuracy Guarantees

- **Results must be based on actually read file content**
- Do not fabricate information or assume project-specific content
- If unsure about relevance, list potentially related pages for user judgment
- Clearly distinguish "directly related" from "potentially related"

### Extensibility

- Supports Wiki structure changes (dynamically adapts by reading index.md)
- Supports new page types (features, components, guides, api, etc.)
- Applicable to any project using LLM Wiki

## Integration with Hooks

This skill is designed to be called by PreToolUse hook:

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
            "prompt": "Before starting, query the wiki for relevant background: Read openspec/docs/wiki/index.md and openspec/docs/wiki/log.md, then search for relevant pages based on user intent."
          }
        ]
      }
    ]
  }
}
```

**Effect**:
- During `openspec-explore`: Provides exploration context, avoids duplicate discussions
- During `openspec-propose`: Checks for duplicate features, leverages existing design decisions

## Error Handling

### Wiki Not Initialized

```
Error: Wiki structure not found
Please check if openspec/docs/wiki/index.md exists
If Wiki is not initialized, refer to project documentation
```

### Index File Corrupted

```
Error: Cannot read Wiki index
Please check if openspec/docs/wiki/index.md format is correct
Refer to project's openspec/docs/schema/CLAUDE.md
```

## Related Skills

- `/openspec-wiki-ingest` - Write documentation to Wiki
- `/openspec-explore` - Explore mode (calls this skill)
- `/openspec-propose` - Proposal mode (calls this skill)

## Project-Specific Configuration

This skill is generic, but projects may need configuration:

1. **Wiki Path**: Default `openspec/docs/wiki/`, can be modified in project config
2. **Schema File**: Default `openspec/docs/schema/CLAUDE.md`, defines Wiki structure specifications
3. **Page Types**: features, components, guides, api, etc., customizable in schema

**Important**: Do not hardcode project-specific feature names, architecture names, or examples in the skill file. All content should be read from actual files.
