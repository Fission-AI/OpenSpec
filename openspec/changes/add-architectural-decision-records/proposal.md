# Change: Add Architectural Decision Records (ADRs)

## Why

OpenSpec currently supports functional specifications (specs) that document WHAT the system does, but lacks a structured way to document non-functional architectural decisions such as technology choices, infrastructure patterns, library selections, and cross-cutting design decisions.

**Key problem**: Architectural decisions are inherently **cross-cutting** - they apply to multiple specs simultaneously. For example:
- "Use DynamoDB for all non-SQL use cases" affects every spec that needs data storage
- "Use JWT for authentication" influences all specs dealing with user sessions
- "Deploy on AWS Lambda" impacts how all features are implemented and tested

Without ADRs, teams must:
- Repeatedly specify the same architectural context across multiple spec changes
- Risk inconsistency when different specs make conflicting technology choices
- Lack a single source of truth for architectural decisions that span capabilities
- Force AI agents to infer or re-specify architectural constraints for each proposal

ADRs solve this by providing **one-to-many** documentation: one architectural decision influences many functional specifications.

## What Changes

This change adds a parallel ADR system alongside specs:

- **New ADR Structure**: `openspec/adrs/` directory at the **same level** as `specs/` (not nested within specs, because ADRs are cross-cutting)
- **ADR Change Workflow**: ADRs can be proposed, reviewed, and archived using the same delta-based change process as specs
- **Template Support**: Project-configurable templates for ADRs (and optionally specs) via `openspec/templates/` directory
- **CLI Integration**: All existing commands (`list`, `show`, `validate`, `archive`) support ADRs
- **AI Context Integration**: ADRs automatically included in AI agent context to influence proposals, tasks, and designs
- **Proactive ADR Creation**: AI agents automatically detect when architectural decisions are needed and create ADRs without explicit user request
- **Clear Separation**:
  - **Specs** = functional behavior (WHAT) - typically one capability, one spec
  - **ADRs** = architectural decisions (HOW/WITH WHAT) - **one ADR affects many specs**
  - ADRs explicitly declare their scope (which specs they influence)

### Specific Additions

1. **Directory Structure**:
   - `openspec/adrs/[decision-name]/decision.md` - Concise decision summary (always in AI context)
   - `openspec/adrs/[decision-name]/adr.md` - Full rationale and analysis (reference/on-demand)
   - `openspec/templates/adr.md` - Optional project-specific ADR template
   - `openspec/templates/decision.md` - Optional project-specific decision summary template
   - `openspec/changes/[name]/adrs/[decision-name]/` - Proposed ADR changes (both files)

2. **CLI Commands**:
   - `openspec list --adrs` - List all ADRs
   - `openspec show [adr-name] --type adr` - Show decision summary (decision.md)
   - `openspec show [adr-name] --type adr --full` - Show full ADR with rationale (adr.md)
   - `openspec validate [change] --strict` - Validates ADR deltas in changes
   - `openspec archive [change]` - Archives ADR changes to `adrs/` (both files)

3. **Template System**:
   - Default ADR template built into CLI
   - Project override via `openspec/templates/adr.md`
   - Template configuration in `openspec/config.yaml`

4. **Two-File ADR Structure** (optimized for context efficiency):

   **decision.md** - Concise summary (~200 tokens, always in AI context):
   ```markdown
   # Decision: [Name]

   **Status:** Accepted | Proposed | Superseded

   **Scope:** [Pattern-based description of what this affects]

   **What:** [One-sentence decision summary]

   **Key Trade-offs:**
   - ✓ [Major benefits]
   - ✗ [Major drawbacks]

   **See:** [Full ADR](./adr.md) for detailed rationale.
   ```

   **adr.md** - Full analysis (~800-1500 tokens, loaded on-demand):
   ```markdown
   # ADR: [Name]

   ## Context
   [Detailed background, problem statement, constraints]

   ## Options Considered
   [Detailed alternatives with comprehensive pros/cons]

   ## Consequences
   [Detailed impacts, migration considerations, etc.]

   ## References
   [Related specs, ADRs, external resources]
   ```

   **Context Efficiency:** 20 ADRs × ~200 tokens = ~4K tokens (vs ~20K for full ADRs)

5. **Proactive ADR Detection**: AI agents automatically identify when architectural decisions are needed

   **Example workflow:**
   ```
   User: "Create a login feature with session storage"

   AI detects:
   - "Login feature" → Functional spec needed
   - "Session storage" → Architectural decision (database choice)

   AI checks:
   - Is there an ADR for data storage? No → Create one

   AI creates change with BOTH:
   ├── adrs/database-strategy/     # NEW ADR for database choice
   │   ├── decision.md
   │   └── adr.md
   └── specs/user-auth/            # Spec references the ADR
       └── spec.md
   ```

   **Detection heuristics** (AI creates ADR when decision involves):
   - Technology/library selection (database, framework, auth method)
   - Infrastructure choices (hosting, deployment, CI/CD platform)
   - Security approaches (encryption, authentication strategy)
   - Cross-cutting patterns (logging, monitoring, error handling)
   - Decisions affecting multiple specs (current or future)

## Impact

### Affected Specs
- **openspec-conventions**: Add ADR concepts, structure, and format requirements
- **cli-list**: Extend to support `--adrs` flag
- **cli-show**: Support ADR display with `--type adr`
- **cli-validate**: Validate ADR deltas in changes
- **cli-archive**: Apply ADR deltas to `adrs/` directory
- **change-creation**: Document how to create ADR changes and extract architectural decisions from user requests
- **instruction-loader**: Include ADRs in AI agent context and proactively suggest ADR creation
- **cli-config**: Support template configuration
- **docs-agent-instructions**: Add guidance for when and how to create ADRs proactively
- **NEW: adr-management** - New spec for ADR-specific requirements

### Affected Code
- `src/cli/list.ts` - Add ADR listing support
- `src/cli/show.ts` - Add ADR display support
- `src/cli/validate.ts` - Add ADR validation
- `src/cli/archive.ts` - Add ADR archiving logic
- `src/core/parsers/` - New ADR parser (similar to spec parser)
- `src/core/init/` - Include ADR directories and templates in init
- `src/core/templates/` - New template management system
- `openspec/AGENTS.md` - Update instructions for ADR workflow

### Breaking Changes
None. This is purely additive. Existing spec workflows remain unchanged.

### Migration Path
Projects can gradually adopt ADRs:
1. No action required for existing projects
2. Run `openspec update` to get new template directories (optional)
3. Create first ADR using a change proposal
4. Templates are optional - default template always available
