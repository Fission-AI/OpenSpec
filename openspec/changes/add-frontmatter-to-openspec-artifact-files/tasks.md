## 1. Dependencies

- [ ] 1.1 Add `gray-matter` package to dependencies

## 2. Frontmatter Parsing

- [ ] 2.1 Create `src/core/artifact-graph/frontmatter.ts` with `parseFrontmatter()` function
- [ ] 2.2 Add type definitions for frontmatter schema (`ArtifactFrontmatter` interface)
- [ ] 2.3 Export frontmatter utilities from `src/core/artifact-graph/index.ts`

## 3. Template Updates

- [ ] 3.1 Add frontmatter to `schemas/spec-driven/templates/proposal.md`
- [ ] 3.2 Add frontmatter to `schemas/spec-driven/templates/design.md`
- [ ] 3.3 Add frontmatter to `schemas/spec-driven/templates/spec.md`
- [ ] 3.4 Add frontmatter to `schemas/spec-driven/templates/tasks.md`

## 4. Tests

- [ ] 4.1 Add unit tests for `parseFrontmatter()` with valid frontmatter
- [ ] 4.2 Add unit tests for `parseFrontmatter()` without frontmatter
- [ ] 4.3 Add unit tests for `parseFrontmatter()` with malformed YAML
- [ ] 4.4 Verify existing artifact detection still works (backward compatibility)
