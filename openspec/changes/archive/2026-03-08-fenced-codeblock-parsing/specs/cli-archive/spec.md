# CLI Archive — Delta for fenced-codeblock-parsing

## MODIFIED Requirements

### Requirement: Spec Merge Integrity

The archive command MUST correctly merge delta specs into main specs without data loss, including when specs contain fenced code blocks.

(Previously: parser did not account for fenced code blocks, causing silent data loss)

#### Scenario: Merge handles fenced code blocks

- WHEN a delta spec contains fenced code blocks (` ``` `) with markdown headers inside (e.g., `## Section`, `### Requirement:`)
- THEN the parser MUST treat all content inside fenced code blocks as body text
- AND the parser MUST NOT interpret headers inside fenced code blocks as section boundaries
- AND all requirements before and after the fenced code block MUST be preserved in the merged output

#### Scenario: Merge handles nested and language-tagged fences

- WHEN a delta spec contains language-tagged fences (e.g., ` ```markdown `) or indented fences
- THEN the parser MUST correctly track fence open/close state
- AND content inside the fence MUST NOT be parsed as structure
