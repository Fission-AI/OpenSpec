# Implementation Tasks

## 1. Restructure Pastelsdd README.md
- [x] 1.1 Front-load the three-stage workflow as primary content
- [x] 1.2 Restructure with hierarchy: Core Workflow → Quick Start → Commands → Details → Edge Cases
- [x] 1.3 Reduce total length by 50% (target: ~285 lines from current ~575)
- [x] 1.4 Add "Before Any Task" context-gathering checklist
- [x] 1.5 Add "Before Creating Specs" rule to check existing specs first

## 2. Add Decision Clarity  
- [x] 2.1 Create clear decision trees for "Create Proposal?" scenarios
- [x] 2.2 Remove ambiguous conditions that confuse agents
- [x] 2.3 Add concrete examples for each decision branch
- [x] 2.4 Simplify bug vs feature determination logic
- [x] 2.5 Add explicit Stage 2 implementation steps (read → implement → mark complete)

## 3. Update CLI Documentation
- [x] 3.1 Document `pastelsdd list` and `pastelsdd list --specs` commands
- [x] 3.2 Document `pastelsdd show` with all flags and interactive mode
- [x] 3.3 Document `pastelsdd diff [change]` for viewing spec differences
- [x] 3.4 Document `pastelsdd archive` with --skip-specs option
- [x] 3.5 Document `pastelsdd validate` with --strict and batch modes
- [x] 3.6 Document `pastelsdd init` and `pastelsdd update` commands
- [x] 3.7 Remove all deprecated noun-first command references
- [x] 3.8 Add concrete usage examples for each command variation
- [x] 3.9 Document all flags: --json, --type, --no-interactive, etc.
- [x] 3.10 Document debugging commands: `show --json --deltas-only`

## 4. Add Spec File Documentation
- [x] 4.1 Add complete spec file structure example with ADDED/MODIFIED sections
- [x] 4.2 Document scenario formatting requirements (#### Scenario: headers)
- [x] 4.3 Explain delta file location (changes/{name}/specs/ directory)
- [x] 4.4 Show how deltas are automatically extracted
- [x] 4.5 Include warning about most common error (scenario formatting)

## 5. Add Troubleshooting Section
- [x] 5.1 Document common errors and their solutions
- [x] 5.2 Add delta detection debugging steps
- [x] 5.3 Include validation best practices (--strict flag)
- [x] 5.4 Show how to use JSON output for debugging
- [x] 5.5 Add examples of silent parsing failures

## 6. Add Agent-Specific Sections
- [x] 6.1 Add implementation workflow (read docs → implement tasks → mark complete)
- [x] 6.2 Add spec discovery workflow (check existing before creating)
- [x] 6.3 Create tool selection matrix (Grep vs Glob vs Read)
- [x] 6.4 Add error recovery patterns section
- [x] 6.5 Add context management guide
- [x] 6.6 Add verification workflows section
- [x] 6.7 Add best practices section (concise, specific, simple)

## 7. Update CLAUDE.md Template
- [x] 7.1 Update `src/core/templates/claude-template.ts` with streamlined content
- [x] 7.2 Include three-stage workflow prominently
- [x] 7.3 Add comprehensive CLI quick reference (list, show, diff, archive, etc.)
- [x] 7.4 Add "Before Any Task" checklist
- [x] 7.5 Add "Before Creating Specs" rule
- [x] 7.6 Keep complexity management principles
- [x] 7.7 Add critical scenario formatting note (#### Scenario: headers)
- [x] 7.8 Include debugging command reference

## 8. Testing and Validation
- [x] 8.1 Test all documented CLI commands for accuracy
- [x] 8.2 Run `pastelsdd init` to verify CLAUDE.md generation
- [x] 8.3 Validate instruction clarity with example scenarios
- [x] 8.4 Ensure no critical information was lost in streamlining
- [x] 8.5 Verify decision trees eliminate ambiguity
- [x] 8.6 Test scenario formatting examples work correctly
- [x] 8.7 Verify troubleshooting steps resolve common errors