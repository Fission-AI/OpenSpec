# Implementation Tasks

## 1. Core Structure and Templates
- [ ] 1.1 Create default decision.md template in `src/core/templates/decision.md`
- [ ] 1.2 Create default adr.md template in `src/core/templates/adr.md`
- [ ] 1.3 Add template management utilities in `src/core/templates/manager.ts`
- [ ] 1.4 Update `openspec init` to create `adrs/` and `templates/` directories
- [ ] 1.5 Add template configuration support to `config.yaml` schema for both decision and adr templates
- [ ] 1.6 Create ADR parser in `src/core/parsers/adr-parser.ts` (handles both files)

## 2. CLI Command Extensions
- [ ] 2.1 Extend `openspec list` with `--adrs` flag to list ADRs
- [ ] 2.2 Update `openspec show` to display decision.md by default with `--type adr`
- [ ] 2.3 Add `--full` flag to `openspec show` to display adr.md instead
- [ ] 2.4 Extend `openspec validate` to validate ADR deltas in changes (both files)
- [ ] 2.5 Update `openspec archive` to apply ADR deltas to `adrs/` directory (both files)
- [ ] 2.6 Update command help text and examples for ADR support

## 3. ADR Delta Processing
- [ ] 3.1 Implement ADR delta parser (ADDED/MODIFIED/REMOVED/RENAMED Decisions)
- [ ] 3.2 Add ADR validation rules (decision format, context, options, consequences)
- [ ] 3.3 Implement ADR archiving logic (apply deltas from changes to adrs/)
- [ ] 3.4 Add conflict detection for overlapping ADR changes
- [ ] 3.5 Create ADR diff display utilities for CLI output

## 4. Documentation Updates
- [ ] 4.1 Update `openspec/AGENTS.md` with ADR workflow instructions
- [ ] 4.2 Add ADR examples to documentation
- [ ] 4.3 Update `openspec/project.md` to mention ADR structure
- [ ] 4.4 Create migration guide for teams adopting ADRs

## 5. Specification Deltas
- [ ] 5.1 Create delta for `openspec-conventions` spec (ADR concepts)
- [ ] 5.2 Create delta for `cli-list` spec (ADR listing)
- [ ] 5.3 Create delta for `cli-show` spec (ADR display)
- [ ] 5.4 Create delta for `cli-validate` spec (ADR validation)
- [ ] 5.5 Create delta for `cli-archive` spec (ADR archiving)
- [ ] 5.6 Create delta for `change-creation` spec (ADR changes)
- [ ] 5.7 Create delta for `instruction-loader` spec (ADR context)
- [ ] 5.8 Create delta for `cli-config` spec (template configuration)
- [ ] 5.9 Create new `adr-management` spec

## 6. Testing
- [ ] 6.1 Add tests for ADR parser
- [ ] 6.2 Add tests for template management
- [ ] 6.3 Add tests for ADR validation
- [ ] 6.4 Add tests for ADR archiving
- [ ] 6.5 Test cross-platform path handling for ADR directories
- [ ] 6.6 Manual testing: Create, validate, and archive an ADR change

## 7. Integration
- [ ] 7.1 Ensure ADRs appear in `openspec list` output when relevant
- [ ] 7.2 Update instruction loader to load decision.md files for efficient AI context
- [ ] 7.3 Add on-demand loading of adr.md when full rationale needed
- [ ] 7.4 Verify ADR template customization workflow (both files)
- [ ] 7.5 Test complete end-to-end ADR proposal workflow
- [ ] 7.6 Update `openspec update` command to refresh ADR templates if needed
- [ ] 7.7 Verify context efficiency: ~200 tokens per decision.md vs ~1000+ per full ADR
