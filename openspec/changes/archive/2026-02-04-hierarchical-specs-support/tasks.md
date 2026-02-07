## 1. Core Spec Discovery Utility

- [x] 1.1 Create `src/utils/spec-discovery.ts` with core types and interfaces
- [x] 1.2 Implement `findAllSpecs()` function with recursive directory walking using `path.join()` and `path.sep`
- [x] 1.3 Implement `isSpecStructureHierarchical()` function for auto-detection
- [x] 1.4 Implement `findSpecUpdates()` for delta-to-main spec mapping with path-relative resolution
- [x] 1.5 Add comprehensive JSDoc comments to all exported functions
- [x] 1.6 Write unit tests for `findAllSpecs()` with flat structure fixtures
- [x] 1.7 Write unit tests for `findAllSpecs()` with hierarchical structure fixtures (depth 2-4)
- [x] 1.8 Write unit tests for cross-platform path handling (Windows backslashes vs Unix forward slashes)

## 2. Configuration Support

- [x] 2.1 Update `src/core/config-schema.ts` to add `specStructure` config section to `GlobalConfigSchema`
- [x] 2.2 Add `SpecStructureConfig` interface with structure, maxDepth, allowMixed, validatePaths fields
- [x] 2.3 Update `DEFAULT_CONFIG` to include default `specStructure` values
- [x] 2.4 Update `KNOWN_TOP_LEVEL_KEYS` set to include `specStructure`
- [x] 2.5 Update `validateConfigKeyPath()` to handle `specStructure` nested keys
- [x] 2.6 Update `src/core/global-config.ts` to include `getSpecStructureConfig()` helper function
- [x] 2.7 Write unit tests for config schema validation with `specStructure` values
- [x] 2.8 Write unit tests for config defaults and type coercion

## 3. Validation Rules

- [x] 3.1 Add `validateSpecStructure()` function to `src/utils/spec-discovery.ts`
- [x] 3.2 Implement orphaned specs validation (ERROR: no spec.md at intermediate levels)
- [x] 3.3 Implement depth limits validation (WARNING at depth 4, ERROR at depth > maxDepth)
- [x] 3.4 Implement naming conventions validation (lowercase alphanumeric with hyphens/underscores)
- [x] 3.5 Add reserved names check (prevent .., ., .git, node_modules)
- [x] 3.6 Write unit tests for each validation rule with valid and invalid cases
- [x] 3.7 Write unit tests for validation with different config settings

## 4. Update Core Commands - List

- [x] 4.1 Refactor `src/core/list.ts` to use `findAllSpecs()` from spec-discovery utility
- [x] 4.2 Update `execute()` to handle hierarchical capability names with path separators
- [x] 4.3 Implement hierarchical display with visual indentation (grouped by scope)
- [x] 4.4 Add logic to build tree structure from flat capability list for display
- [x] 4.5 Ensure backward compatibility with flat structure display
- [x] 4.6 Write integration tests for `list --specs` with flat structure
- [x] 4.7 Write integration tests for `list --specs` with hierarchical structure (2-3 levels deep)

## 5. Update Core Commands - View

- [x] 5.1 Refactor `src/core/view.ts` `getSpecsData()` to use `findAllSpecs()` utility
- [x] 5.2 Update capability resolution to use path-relative names
- [x] 5.3 Update display formatting to show hierarchical specs with indentation
- [x] 5.4 Ensure requirement counting works correctly for hierarchical paths
- [x] 5.5 Write integration tests for dashboard view with hierarchical specs

## 6. Update Core Commands - Specs Apply and Archive

- [x] 6.1 Refactor `src/core/specs-apply.ts` `findSpecUpdates()` to use new utility
- [x] 6.2 Update delta mapping logic to support replicated hierarchy (1:1 path mapping)
- [x] 6.3 Update `buildUpdatedSpec()` to handle hierarchical capability names
- [x] 6.4 Update console output messages to display full capability paths
- [x] 6.5 Refactor `src/core/archive.ts` to use hierarchical-aware spec discovery
- [x] 6.6 Update archive logic to preserve directory structure when syncing
- [x] 6.7 Write integration tests for sync with hierarchical deltas
- [x] 6.8 Write integration tests for archive with hierarchical structure

## 7. Update Spec and Validate Commands

- [x] 7.1 Update `src/commands/spec.ts` to construct paths dynamically from capability names
- [x] 7.2 Replace hardcoded path construction with `path.join()` using capability segments
- [x] 7.3 Update `src/commands/validate.ts` to use recursive spec discovery
- [x] 7.4 Add validation rule checks using `validateSpecStructure()` in validate command
- [x] 7.5 Update error messages to show full hierarchical capability paths
- [x] 7.6 Write integration tests for validate command with hierarchical specs

## 8. Update Change Parser and Validator

- [x] 8.1 Update `src/core/parsers/change-parser.ts` to handle hierarchical capability paths
- [x] 8.2 Ensure parser correctly resolves specs with path separators
- [x] 8.3 Update any capability name extraction logic to preserve path structure
- [x] 8.4 Write unit tests for parsing changes with hierarchical capability references
- [x] 8.5 Update `Validator.validateChangeDeltaSpecs()` to use `findAllSpecs()` for hierarchical delta support (currently uses flat `readdir`)

## 9. Update Skill Templates and Prompts

- [x] 9.1 Update all generic `specs/<capability>` references to `specs/<capability-path>` (~14 occurrences)
- [x] 9.2 Add "Spec Structure" explanation section with flat vs hierarchical examples and delta replication rules
- [x] 9.3 Update `NEW_CHANGE_PROMPT` (onboarding) to explain capability naming with hierarchical paths
- [x] 9.4 Update `NEW_CHANGE_PROMPT` spec creation instructions to note delta structure replication pattern
- [x] 9.5 Update `CONTINUE_PROMPT` artifact continuation instructions for hierarchical capability paths
- [x] 9.6 Update `EXPLORE_PROMPT` reference tables to use `specs/<capability-path>` format
- [x] 9.7 Update `APPLY_PROMPT` implementation instructions to handle hierarchical spec paths
- [x] 9.8 Update `VERIFY_PROMPT` verification instructions for hierarchical structure
- [x] 9.9 Update `ARCHIVE_PROMPT` sync/archive instructions to explain 1:1 path mapping
- [x] 9.10 Ensure all prompt examples use `/` for consistency (converted to path.sep internally)

## 10. Cross-Platform Testing

- [x] 10.1 Write Windows-specific path tests using backslashes in expected values
- [x] 10.2 Write Unix-specific path tests using forward slashes in expected values
- [x] 10.3 Ensure all test fixtures use `path.join()` for cross-platform compatibility
- [x] 10.4 Add CI workflow step to run tests on Windows environment
- [x] 10.5 Add CI workflow step to run tests on macOS environment
- [x] 10.6 Add CI workflow step to run tests on Linux environment

## 11. Performance and Compatibility Testing

- [x] 11.1 Create performance benchmark for recursive spec discovery (100 specs)
- [x] 11.2 Create performance benchmark for large repos (1000 specs)
- [x] 11.3 Write backward compatibility tests with existing flat structure fixtures
- [x] 11.4 Test auto-detection with mixed flat and hierarchical structures (if allowMixed: true)
- [x] 11.5 Verify all existing integration tests pass without modification

## 12. Documentation

- [x] 12.1 Update main README.md with hierarchical structure examples alongside flat examples
- [x] 12.2 Add "Organizing Specs" section explaining flat vs hierarchical structures
- [x] 12.3 Create migration guide (docs/migration-flat-to-hierarchical.md) with step-by-step instructions
- [x] 12.4 Update getting started guide to mention structure options
- [x] 12.5 Update CLI reference docs for list, validate, sync, archive commands
- [x] 12.6 Add examples directory with hierarchical spec structure sample project
- [x] 12.7 Document `specStructure` config options in configuration guide
- [x] 12.8 Add troubleshooting section for common hierarchical structure issues

## 13. Final Verification

- [x] 13.1 Run full test suite and ensure 100% pass rate
- [x] 13.2 Test on actual monorepo project with hierarchical structure (manual QA)
- [x] 13.3 Test on existing flat structure project to verify backward compatibility (manual QA)
- [x] 13.4 Verify all commands work correctly: list, validate, sync, archive, new
- [x] 13.5 Review all code changes for consistent use of path.join() and path.sep
- [x] 13.6 Ensure no hardcoded path separators (/) remain in production code
- [x] 13.7 Update CHANGELOG.md with feature description

## 14. Post-Implementation Fixes (Discovered During E2E Testing)

- [x] 14.1 Fix `getSpecIds()` in `src/utils/item-discovery.ts` to use `findAllSpecs()` for recursive discovery
- [x] 14.2 Fix `displayHierarchicalSpecs()` in `src/core/list.ts` to show full paths with uniform padding instead of depth-based indentation
- [x] 14.3 Update `schemas/spec-driven/schema.yaml` proposal instructions to use `openspec list --specs` instead of manual directory inspection
- [x] 14.4 Update `schemas/spec-driven/schema.yaml` specs instructions to use `openspec show <capability-path>` for reading existing specs
- [x] 14.5 Update schema instructions to clarify hierarchical path structure and 1:1 delta replication
