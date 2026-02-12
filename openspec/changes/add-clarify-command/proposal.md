## Why

Users need an interactive way to identify and resolve ambiguities in spec artifacts during the change workflow. Currently, clarification is a manual process. An agent-based clarification skill template would make it faster to produce complete, unambiguous specs that lead to better implementation outcomes by leveraging AI capabilities without CLI complexity.

## What Changes

- Add new `openspec-clarify` skill template to `src/core/templates/skill-templates.ts`
- The skill template will be invoked by AI agents (not via CLI) to orchestrate an interactive clarification workflow that:
  - Scans spec artifacts for ambiguities using a structured taxonomy
  - Asks up to 5 prioritized questions with recommendations
  - Writes answers directly back into spec artifacts under a `## Clarifications` section
  - Updates relevant spec sections based on clarifications
- Supports both multiple-choice questions (with recommendations) and short-answer questions
- Auto-detects current change from context when name omitted
- Provides coverage summary showing resolved/deferred/outstanding ambiguities

## Capabilities

### New Capabilities

- `openspec-clarify-skill-template`: Agent skill template that provides structured instructions for the clarification workflow - change selection, status checking, spec loading, ambiguity scanning (across 10+ taxonomy categories), interactive Q&A with recommendations, and spec integration
- `ambiguity-taxonomy`: Structured coverage framework spanning functional scope, data model, UX flow, non-functional requirements, integration points, edge cases, constraints, terminology, and completion signals
- `interactive-qa-protocol`: Guidelines for question generation, prioritization, recommendation formatting (multiple-choice tables with reasoning, short-answer suggestions), answer validation, and incremental spec updates
- `spec-integration-rules`: Instructions for adding `## Clarifications` section with timestamped sessions, applying answers to appropriate spec sections, and maintaining consistency

### Modified Capabilities

None - this is a new agent skill template that operates independently of existing CLI commands.

## Impact

**New files:**
- None - skill template is added inline to existing `skill-templates.ts`

**Modified files:**
- `src/core/templates/skill-templates.ts` - Add `getClarifyChangeSkillTemplate()` function with the full skill template content
- `src/core/templates/index.ts` - Export `getClarifyChangeSkillTemplate` for agent access
- `docs/commands.md` - Add `/opsx:clarify` command reference with syntax, examples, and usage tips (insert after `/opsx:verify` section)
- `docs/opsx.md` - Add `/opsx:clarify` to the commands table
- `docs/workflows.md` - Document when to use clarify in workflow patterns (e.g., "When specs are ambiguous during planning or implementation")

**Dependencies:**
- None - uses existing AI agent capabilities and file I/O tools

**User workflow:**
- Invoked by AI agents during spec refinement via `/opsx:clarify` command
- Typical flow: `openspec new change` → `openspec continue` (creates spec) → **`/opsx:clarify`** → `openspec continue` (creates tasks) → implementation
- Can be used anytime during change lifecycle when ambiguity needs resolution

**Documentation updates:**
- Command reference in `docs/commands.md` with full syntax, examples, and usage patterns
- Workflow integration guidance in `docs/workflows.md` showing when to invoke clarify
- Command table entry in `docs/opsx.md` alongside other OPSX commands

**Template Structure:**
```markdown
---
name: openspec-clarify
description: Clarify underspecified areas in an OpenSpec change by asking up to 5 targeted questions and writing answers back into spec artifacts.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "2.0"
  generatedBy: "1.0.2"
---

[Full skill template content with 8 steps: Select change, Check status, Load specs, Scan for ambiguity using taxonomy, Generate question queue, Interactive Q&A loop with recommendations, Integrate answers into specs, Validate and report]
```

The template includes:
- 10-category ambiguity taxonomy (functional scope, domain/data model, UX flow, non-functional attributes, integration, edge cases, constraints, terminology, completion signals, misc/placeholders)
- Interactive question formats with AI-generated recommendations
- Incremental spec update protocol (one answer at a time)
- Coverage reporting with resolved/deferred/outstanding categories
- Early termination and quota guardrails (max 5 questions)
