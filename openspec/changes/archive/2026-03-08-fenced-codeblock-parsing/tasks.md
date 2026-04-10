# Tasks for fenced-codeblock-parsing

## Implementation

- [ ] Add fence tracking to `splitTopLevelSections` in `requirement-blocks.ts`
- [ ] Add fence tracking to `extractRequirementsSection` in `requirement-blocks.ts`
- [ ] Add fence tracking to `parseRequirementBlocksFromSection` in `requirement-blocks.ts`

## Testing

- [ ] Add test: spec with fenced code block containing `##` headers — should not split
- [ ] Add test: spec with fenced code block containing `### Requirement:` — should not start new block
- [ ] Add test: spec with multiple requirements and code block in the middle — all requirements preserved
- [ ] Add test: language-tagged fence (` ```markdown `) — correctly handled
- [ ] Run existing test suite — no regressions
