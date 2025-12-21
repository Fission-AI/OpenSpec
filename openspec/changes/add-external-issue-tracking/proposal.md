# Change: add-external-issue-tracking

## Why

When external issues (Linear, GitHub, Jira, etc.) are provided with a proposal, OpenSpec ignores them. The CLI doesn't display issue references, and agents have no guidance on tracking or updating external issues throughout the proposal lifecycle.

## What Changes

- Add YAML frontmatter support to proposal.md for storing tracked issue references
- Display issue identifiers in CLI output (`openspec list`, `openspec show`, `openspec archive`)
- Add "External Issue Tracking" section to AGENTS.md with guidance for detecting, storing, and updating external issues

## Impact

- Affected specs: None (new capability, no existing specs)
- Affected code:
  - `src/core/parsers/markdown-parser.ts` - Add YAML frontmatter extraction
  - `src/core/parsers/change-parser.ts` - Include frontmatter in parsed result
  - `src/core/schemas/change.schema.ts` - Add trackedIssues type
  - `src/core/list.ts` - Display issue in list output
  - `src/commands/change.ts` - Include issue in show/list output
  - `src/core/archive.ts` - Report tracked issues on archive
  - `openspec/AGENTS.md` - Add External Issue Tracking section
