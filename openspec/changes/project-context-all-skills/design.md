## Context

Project context (`config.yaml` → `context` field) reaches only skills that call `openspec instructions <artifact>` — Continue, FF, New, Onboard. Skills that call `openspec instructions apply` (Apply, Verify) or no instructions at all (Explore, Archive, Bulk-archive, Sync) operate blind to project constraints.

Additionally, skills that do receive `context`, `rules`, and `instruction` use weak enforcement language ("guidance", "apply as constraints") rather than mandatory directives.

Current architecture:

```
readProjectConfig()
       │
       └──► generateInstructions()        ──► ArtifactInstructions { context, rules }
                                                 └──► `instructions <artifact>` command
                                                       └──► Continue, FF, New, Onboard ✅

       ╳    generateApplyInstructions()   ──► ApplyInstructions { NO context }
                                                 └──► `instructions apply` command
                                                       └──► Apply, Verify ❌

       ╳    (no pathway)                  ──► Explore, Archive, Bulk-archive, Sync ❌
```

## Goals / Non-Goals

**Goals:**
- Every skill that generates, validates, or reasons about code/artifacts has access to project context
- `context`, `rules`, and `instruction` are communicated as mandatory constraints in all skill prompts
- Minimal CLI API surface change — reuse existing `instructions` command

**Non-Goals:**
- Changing how `rules` work (they remain per-artifact, only relevant to artifact-creating skills)
- Adding context to the Feedback skill (not project-work related)
- Caching or performance optimization of `readProjectConfig()` (already benchmarked as fast enough)

## Decisions

### 1. Add `--context` flag to existing `instructions` command

**Choice:** New `--context` flag on `openspec instructions` rather than a separate `openspec context` command.

**Rationale:** The `instructions` command is already the single entry point for AI agents to get guidance. Adding `--context` keeps the API surface small. The flag works without `--change` or artifact arguments since project context is change-independent.

**Usage:**
```bash
openspec instructions --context           # text output
openspec instructions --context --json    # { "context": "..." }
```

**Behavior:**
- `--context` can be used alone (text output) or with `--json` (structured output)
- `--context` is incompatible with `--change`, `--schema`, and artifact arguments. Error if any are combined.
- Reads `config.yaml` via `readProjectConfig()`
- Returns only the `context` field (not `rules` — those are per-artifact)
- Returns empty/null gracefully if no config or no context defined

**Alternative considered:** Separate `openspec context` command. Rejected because it fragments the instruction pathway and adds a command that only returns one field.

### 2. Add `context` to `ApplyInstructions`

**Choice:** Enrich `generateApplyInstructions()` to call `readProjectConfig()` and include `context` in the response, same pattern as `generateInstructions()`.

**Rationale:** Apply and Verify already call `instructions apply --json`. Adding `context` to the response means these skills get project context without changing their flow.

**Changes:**
- `ApplyInstructions` interface: add `context?: string`
- `generateApplyInstructions()`: call `readProjectConfig()`, extract `context`
- `printApplyInstructionsText()`: print `<project_context>` block (same format as artifact instructions)

### 3. Standardize enforcement language across all skill prompts

**Choice:** Define a consistent block of text that every skill uses when describing how to handle `context`, `rules`, and `instruction`.

**Pattern for artifact-creating skills** (Continue, FF, New, Onboard):
```
**You MUST follow these fields from the instructions output:**
- `context`: Project constraints. You MUST follow these when creating artifacts. Do NOT include in output.
- `rules`: Artifact-specific rules. You MUST follow these. Do NOT include in output.
- `instruction`: Directives for how to create this artifact. You MUST follow these.
```

**Pattern for code-operating skills** (Apply, Verify):
```
**You MUST follow the `context` field** from the instructions output.
This contains project constraints (tech stack, conventions, cross-platform rules)
that you MUST respect when implementing/verifying code. Do NOT include in output.
```

**Pattern for change-independent skills** (Explore, Archive, Bulk-archive, Sync):
```
At the start, load project context:
\`\`\`bash
openspec instructions --context --json
\`\`\`
If it returns a `context` field, you MUST follow these project constraints
throughout the session.
```

### 4. Per-skill context consumption

| Skill | Context source | What changes |
|-------|---------------|--------------|
| **Continue** | `instructions <artifact> --json` | Strengthen enforcement language |
| **FF** | `instructions <artifact> --json` | Strengthen enforcement language |
| **New** | `instructions <artifact> --json` | Strengthen enforcement language |
| **Onboard** | `instructions <artifact> --json` | Strengthen enforcement language |
| **Apply** | `instructions apply --json` | Add context consumption + enforcement |
| **Verify** | `instructions apply --json` | Add context consumption + enforcement |
| **Explore** | `instructions --context --json` | Add context loading at session start |
| **Archive** | `instructions --context --json` | Add context loading at session start |
| **Bulk-archive** | `instructions --context --json` | Add context loading at session start |
| **Sync** | `instructions --context --json` | Add context loading at session start |
| **Feedback** | N/A | No changes (not project-work related) |

## Risks / Trade-offs

**[Prompt length increase]** → Every skill prompt grows by a few lines. Acceptable — clarity is worth the tokens.

**[`--context` flag overlap with other options]** → `--context` errors if combined with `--change`, `--schema`, or an artifact argument. Strict validation, no ambiguity.

**[No config file]** → Skills calling `--context` when no `config.yaml` exists. → Return gracefully (empty context), skill continues without constraints. Same behavior as `generateInstructions()` today.
