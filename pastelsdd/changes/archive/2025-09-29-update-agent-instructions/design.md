# Design: Agent Instructions Update

## Approach

### Information Architecture
- **Front-load critical information** - Three-stage workflow comes first
- **Clear hierarchy** - Core Workflow → Quick Start → Commands → Details → Edge Cases
- **50% length reduction** - Target ~285 lines from current ~575 lines
- **Imperative mood** - "Create proposal" vs "You should create a proposal"
- **Bullet points over paragraphs** - Scannable, concise information

### Three-Stage Workflow Documentation
The workflow is now prominently featured as a core concept:
1. **Creating** - Proposal generation phase
2. **Implementing** - Code development phase with explicit steps:
   - Read proposal.md for understanding
   - Read design.md for technical context
   - Read tasks.md for checklist
   - Implement tasks sequentially
   - Mark complete immediately after each task
3. **Archiving** - Post-deployment finalization phase

This structure helps agents understand the lifecycle and their role at each stage. The implementation phase is particularly detailed to prevent common mistakes like skipping documentation or batching task completion.

### CLI Documentation Updates
- **Comprehensive command coverage** - All 9 primary commands documented
- **`pastelsdd list` prominence** - Essential for discovering changes and specs
- **Interactive mode documentation** - How agents can use prompts effectively
- **Complete flag documentation** - All options like --json, --type, --skip-specs
- **Deprecation cleanup** - Remove noun-first patterns (pastelsdd change show)

### Agent-Specific Enhancements
Based on industry best practices for coding agents (Claude Code, Cursor, etc.):

**Implementation Workflow**
- Explicit steps prevent skipping critical context
- Reading proposal/design first ensures understanding before coding
- Sequential task completion maintains focus
- Immediate marking prevents losing track of progress
- Addresses common failure mode: jumping straight to code

**Spec Discovery Workflow**
- Always check existing specs before creating new ones
- Use `pastelsdd list --specs` to discover current capabilities
- Prefer modifying existing specs over creating duplicates
- Prevents fragmentation and maintains coherent architecture

**Decision Clarity**
- Clear decision trees eliminating ambiguous conditions
- Concrete examples for each decision branch
- Simplified bug vs feature determination

**Tool Usage Guidance**
- Tool selection matrix (when to use Grep vs Glob vs Read)
- Error recovery patterns for common failures
- Verification workflows to confirm correctness

**Context Management**
- "Before Any Task" checklist for gathering context
- What to read before starting any work
- How to maintain state across interactions

**Spec File Structure Documentation**
- Complete examples with ADDED/MODIFIED/REMOVED sections
- Critical scenario formatting (#### Scenario: headers)
- Delta file location clarity (changes/{name}/specs/)
- Addresses most common creation errors from retrospective

**Troubleshooting and Debugging**
- Common error messages with solutions
- Delta detection debugging steps
- Validation best practices
- JSON output for inspection
- Prevents hours of frustration from silent failures

**Best Practices**
- Be concise (one-line answers when appropriate)
- Be specific (file.ts:42 line references)
- Start simple (<100 lines, single-file defaults)
- Justify complexity (require metrics/data)

## Design Rationale

### Why These Changes Matter

**Cognitive Load Reduction**
- Agents process instructions better with clear structure
- Front-loading critical info reduces scanning time
- Decision trees eliminate analysis paralysis

**Industry Alignment**
- Follows patterns proven effective in Claude Code, Cursor, GitHub Copilot
- Addresses common failure modes (ambiguous decisions, missing context)
- Optimizes for LLM strengths (pattern matching) vs weaknesses (calculations)

**Addressing Critical Pain Points (from Retrospective)**
- **Scenario formatting** - Biggest struggle, now explicitly documented with examples
- **Complete spec structure** - Full examples prevent structural errors
- **Delta detection issues** - Debugging commands help diagnose problems
- **Silent parsing failures** - Troubleshooting section explains common issues

**Practical Impact**
- Faster agent comprehension of tasks
- Fewer misinterpretations of requirements
- More consistent implementation quality
- Better error recovery when things go wrong
- Prevents the most common errors identified in user experience

## Trade-offs

### What We're Removing
- Lengthy explanations of concepts that can be inferred
- Redundant examples that don't add clarity
- Verbose edge case documentation (moved to reference section)
- Deprecated command documentation

### What We're Keeping
- All critical workflow steps
- Complete CLI command reference
- Complexity management principles
- Directory structure visualization
- Quick reference summary

## Implementation Notes

The CLAUDE.md template is intentionally more concise than README.md since:
- It appears in every project root
- Agents can reference the full README.md for details
- It needs to load quickly in AI context windows
- Focus is on immediate actionable guidance