## Context

Artifact files (proposal.md, design.md, spec.md, tasks.md) are currently identified by:
1. File path within the change directory
2. Matching patterns in schema.yaml `generates` field (e.g., `proposal.md`, `specs/**/*.md`)

This works but couples artifact identity to file location. Adding YAML frontmatter with an `artifact` field enables:
- Direct artifact type identification without path inference
- Future extensibility (additional metadata fields)
- Clearer file purpose when viewed in isolation

Current implementation:
- `src/core/artifact-graph/state.ts` - detects artifact completion via file existence
- `src/core/artifact-graph/instruction-loader.ts` - loads templates from schema directories
- `schemas/*/templates/*.md` - template files defining artifact structure

## Goals / Non-Goals

**Goals:**
- Add `artifact: <type>` frontmatter to all artifact templates
- Parse frontmatter when loading/reading artifact files
- Maintain backward compatibility (files without frontmatter remain valid)

**Non-Goals:**
- Validating artifact type against schema (just identification)
- Adding other metadata fields (timestamps, status, etc.)
- Migrating existing artifact files (optional frontmatter)

## Decisions

### Decision 1: Frontmatter Format

Use standard YAML frontmatter delimited by `---`:

```yaml
---
artifact: proposal
---
```

**Rationale**: YAML frontmatter is widely supported (Jekyll, Hugo, MDX, etc.) and has established parsing libraries. Single field keeps it minimal per user preference.

**Alternatives considered**:
- HTML comment metadata (`<!-- artifact: proposal -->`) - less standard, harder to parse
- JSON frontmatter - less common in markdown files
- File naming convention only - already have this, want machine-readable metadata

### Decision 2: Artifact Type Values

Use the artifact ID from schema.yaml as the type value:
- `artifact: proposal`
- `artifact: design`
- `artifact: specs`
- `artifact: tasks`

**Rationale**: Direct mapping to schema artifact IDs. No translation needed.

### Decision 3: Parsing Library

Use `gray-matter` npm package for frontmatter parsing.

**Rationale**: Mature, well-maintained, already commonly used in the ecosystem. Handles edge cases (empty frontmatter, malformed YAML).

**Alternatives considered**:
- Manual regex parsing - error-prone, reinventing the wheel
- `front-matter` package - less popular, fewer features
- `yaml` + custom parsing - more code to maintain

### Decision 4: Template Modification

Update template files in `schemas/*/templates/` to include frontmatter. The `loadTemplate()` function will return templates with frontmatter included.

**Rationale**: Templates define the structure new artifacts should follow. Including frontmatter in templates means newly created artifacts automatically have it.

### Decision 5: Backward Compatibility

Frontmatter is optional. State detection (`detectCompleted()`) continues to work based on file existence only. Frontmatter is additive metadata, not required for artifact detection.

**Rationale**: Existing changes have artifact files without frontmatter. Breaking them would be disruptive. Over time, new artifacts will have frontmatter.

## Risks / Trade-offs

**[Risk]** Templates with frontmatter may confuse users unfamiliar with the format
→ Frontmatter is a well-established convention; most developers recognize it

**[Risk]** Adding `gray-matter` dependency increases bundle size
→ Package is small (~15KB); benefit outweighs cost

**[Trade-off]** Frontmatter is optional, not enforced
→ Chose compatibility over strictness; can add validation later if needed
