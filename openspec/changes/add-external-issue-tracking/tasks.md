# Tasks: add-external-issue-tracking

## 1. Core Parsing
- [x] 1.1 Add YAML frontmatter extraction to `markdown-parser.ts`
- [x] 1.2 Update `change-parser.ts` to extract and include frontmatter in parsed result
- [x] 1.3 Add `TrackedIssue` type and update Change schema in `change.schema.ts`

## 2. CLI Display
- [x] 2.1 Update `list.ts` to show issue identifiers next to change names
- [x] 2.2 Update `change.ts` show command to include tracked issues in output
- [x] 2.3 Update `change.ts` list command (long format) to include issues
- [x] 2.4 Update `archive.ts` to report tracked issues when archiving

## 3. Agent Guidance
- [x] 3.1 Add "External Issue Tracking" section to AGENTS.md

## 4. Validation
- [x] 4.1 Run typecheck
- [x] 4.2 Run lint
- [x] 4.3 Run tests
- [x] 4.4 Manual testing with proposal containing frontmatter
