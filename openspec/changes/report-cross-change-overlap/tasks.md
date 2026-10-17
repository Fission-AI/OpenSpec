## 1. Overlap detection

- [ ] 1.1 Add a read only module under `src/core/` that turns each delta file into claims (spec id, normalized requirement name, operation), with RENAMED contributing a `RENAMED_FROM` and a `RENAMED_TO` claim, and a repeated claim inside one change dropped
- [ ] 1.2 Enumerate delta files with `discoverSpecFiles()` and match names with `normalizeRequirementName()`, so the scan sees exactly what archive applies
- [ ] 1.3 Group claims by spec id and normalized name, keep groups claimed by two or more changes, and set `inMainSpec` from the main spec's current requirements
- [ ] 1.4 Sort overlaps and claimants by code unit, never by locale
- [ ] 1.5 Skip an unreadable change, and treat an unreadable main spec as holding no requirements, so overlaps among the remaining changes are still reported

## 2. Validate integration

- [ ] 2.1 Run the scan only for bulk validation with changes in scope, only with two or more changes, and never for `--report findings`
- [ ] 2.2 Pass `root.changesDir`, `root.specsDir`, and the change ids the run already resolved, so store runs scan the selected store
- [ ] 2.3 Print the advisory section after the existing details only when an overlap exists
- [ ] 2.4 Add `overlaps` to the full v1 JSON document whenever changes are in scope, including an empty scope, and leave it out otherwise
- [ ] 2.5 Swallow any scan error and leave the exit code exactly as validation sets it

## 3. Documentation and release tracking

- [ ] 3.1 Document the section, the JSON fields, and the advisory status in `docs-lab/reference/cli.md`
- [ ] 3.2 Add `overlaps` to the `validate --json` shape in `docs/agent-contract.md` §4.3
- [ ] 3.3 Add a minor changeset

## 4. Verification

- [ ] 4.1 Unit tests for claims, grouping, rename at both ends, same name in different specs, nested spec ids, three claimants on one requirement, and stable order
- [ ] 4.2 End to end tests through the CLI for human and JSON output, `--specs`, empty and single change scopes, `--report findings`, a selected store, and an unchanged exit code when an overlap exists
- [ ] 4.3 Run build, lint, type checks, the full suite, and `openspec validate report-cross-change-overlap --strict`
