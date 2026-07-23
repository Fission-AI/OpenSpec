## 1. Project Config Model

- [ ] 1.1 Add explicit `apply` and `archive` operation IDs plus typed `operations.<operation>.guidance` config structures without changing artifact `rules`
- [ ] 1.2 Extend resilient config parsing to preserve valid operations, omit malformed entries independently, filter empty guidance, and warn for unknown operations or fields
- [ ] 1.3 Preserve non-empty multi-line and Markdown guidance without rewriting its content
- [ ] 1.4 Update config generation and help text with separate artifact-rule and operation-guidance examples
- [ ] 1.5 Add project-config tests for valid, absent, malformed, mixed-validity, empty, unknown, multi-line, and Markdown operation guidance

## 2. Shared Runtime Inputs

- [ ] 2.1 Add a shared operation-input loader that reads current project config for a resolved repo or store root and returns separate optional `context` and `operationGuidance` fields
- [ ] 2.2 Ensure the loader reads config on every invocation, omits empty values, and never exposes artifact rules as operation guidance
- [ ] 2.3 Add unit tests for operation matching, runtime freshness, absent fields, field separation, and selected-store roots

## 3. Apply Instructions

- [ ] 3.1 Extend apply instruction types and generation with current `context` and apply `operationGuidance` while preserving existing state, progress, tasks, context files, references, and root output
- [ ] 3.2 Render context and operation guidance as distinct advisory sections in apply text output
- [ ] 3.3 Update the apply skill template to consume runtime inputs while keeping CLI-returned state, tasks, progress, context files, and built-in instructions authoritative
- [ ] 3.4 Add template assertions that apply context and guidance are not copied into implementation files or planning artifacts and cannot replace blocked/ready/all-done behavior
- [ ] 3.5 Add unit and CLI integration tests for apply JSON, text rendering, freshness, absent inputs, and unchanged blocked/ready/all-done behavior

## 4. Archive Runtime Inputs

- [ ] 4.1 Route `openspec instructions archive --change <name>` to a dedicated read-only archive instruction handler using existing repo/store root resolution and change validation
- [ ] 4.2 Return `changeName`, optional current `context`, optional archive `operationGuidance`, and the normal root envelope in JSON without returning the static archive workflow template
- [ ] 4.3 Add human-readable archive input rendering with separate advisory sections and a valid empty-input result
- [ ] 4.4 Add tests for required and invalid changes, selected stores, runtime freshness, absent inputs, JSON/text output, and absence of archive filesystem mutations

## 5. Archive Skill Consumption

- [ ] 5.1 Update the single-change archive skill and command templates to fetch current archive inputs after resolving the selected change and root
- [ ] 5.2 Update the bulk archive skill and command templates to fetch archive inputs once per selected root
- [ ] 5.3 State in both templates that guidance is additive, built-in steps and explicit user choices remain authoritative, and runtime inputs are not copied verbatim into output files
- [ ] 5.4 Preserve existing single-change and bulk archive orchestration, prompts, spec-sync behavior, filesystem operations, and summaries
- [ ] 5.5 Regenerate checked-in skills and update affected template/golden hashes

## 6. Documentation and Verification

- [ ] 6.1 Document `operations.apply.guidance`, `operations.archive.guidance`, runtime freshness, selected-root behavior, advisory semantics, and the read-only archive instruction command
- [ ] 6.2 Document that archive execution, spec sync, and artifact-rule behavior remain unchanged by this change
- [ ] 6.3 Run formatting, type checking, build, targeted config/apply/archive/template tests, and the full test suite
- [ ] 6.4 Run `openspec validate extend-config-injection-to-apply-archive --strict` and reconcile every task with the final implementation diff
