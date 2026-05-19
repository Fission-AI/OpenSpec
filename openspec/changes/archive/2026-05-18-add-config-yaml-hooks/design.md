## Context

OpenSpec's `openspec/config.yaml` currently supports three fields: `schema`, `context`, and `rules`. Teams need lifecycle automation — enforcing pre-conditions, posting notifications, or consolidating logs — without forking skills or writing wrapper scripts. Skills (Claude agent SKILL.md files) are the execution layer for the four core workflows: propose, explore, apply, and archive.

A hook system lives naturally in `config.yaml` alongside `context` and `rules`. Because skills are the primary workflow executors, hook enforcement must be skill-aware: skills read hook config before and after doing their work, run gates, and inject instruction text into their own prompt context.

## Goals / Non-Goals

**Goals:**
- Add a `hooks` top-level field to `openspec/config.yaml` with `pre-<workflow>` and `post-<workflow>` entries
- Each hook entry supports an optional `instruction` (AI context injection) and optional `run` (shell command)
- Pre-hook `run` gates block workflow execution on non-zero exit
- Post-hook `run` commands execute after workflow completion; failures warn but don't retroactively fail
- `instruction` text is injected into the skill's execution context so the AI agent respects it
- A new `openspec hooks get <event>` CLI command exposes structured hook data to skills
- All four skill families (`openspec-propose`, `openspec-explore`, `openspec-apply-change`, `openspec-archive-change` and their `opsx:*` aliases) enforce hooks

**Non-Goals:**
- Hooks on arbitrary CLI commands (only the four core workflows: propose, explore, apply, archive)
- Global (user-level) hooks in `~/.config/openspec/` — hooks are project-scoped only
- Parallel or conditional hook logic (single pre and single post per workflow)
- Hook chaining or composed hook pipelines

## Decisions

### D1: Hook config schema — flat `pre-<workflow>` / `post-<workflow>` keys

```yaml
hooks:
  pre-archive:
    instruction: |
      Review the archived change and consolidate the error log...
    run: ./scripts/notify-slack.sh
  post-archive:
    instruction: |
      Review the archived change and consolidate the error log...
    run: ./scripts/notify-slack.sh
```

Keys are `pre-propose`, `post-propose`, `pre-explore`, `post-explore`, `pre-apply`, `post-apply`, `pre-archive`, `post-archive`. Each value is either null (empty hook) or an object with optional `instruction` (string) and optional `run` (string).

**Why flat over nested** (`hooks.propose.pre` / `hooks.propose.post`): Flat keys are easier to null out (`pre-archive:` with no value = no-op) and map directly to the event name passed to `openspec hooks get`. Alphabetic sorting keeps pre/post visually adjacent.

**Why both `instruction` and `run` are optional**: Teams may want only AI guidance, only shell automation, or both. Neither field is required.

### D2: New `openspec hooks get <event>` CLI command

Skills call `openspec hooks get pre-archive --json` and receive:

```json
{
  "event": "pre-archive",
  "instruction": null,
  "run": null,
  "exists": false
}
```

or when configured:

```json
{
  "event": "post-archive",
  "instruction": "Review the archived change...",
  "run": "./scripts/notify-slack.sh",
  "exists": true
}
```

**Why a CLI command rather than having skills parse config.yaml directly**: Skills should not know about internal config file formats. The CLI is the single source of truth for parsing, validation, and error reporting. This is consistent with how skills already use `openspec instructions`, `openspec status`, etc. The command also makes hook behavior testable independently of skill execution.

**Why `--json` output**: Skills already parse `--json` output from other commands. Structured output avoids fragile text parsing.

### D3: Skill-level hook enforcement pattern

Skills follow this pattern around workflow execution:

```
1. Call: openspec hooks get pre-<workflow> --json
2. If exists=true and run is set:
   - Execute the run command via Bash
   - If exit code != 0: HALT with error, do NOT proceed
3. If exists=true and instruction is set:
   - Treat the instruction text as an additional directive during execution
4. [Execute the workflow]
5. Call: openspec hooks get post-<workflow> --json
6. If exists=true and run is set:
   - Execute the run command via Bash
   - If exit code != 0: Surface warning, continue (workflow already completed)
7. If exists=true and instruction is set:
   - Follow the instruction as a post-workflow action
```

**Why skills enforce rather than CLI middleware**: Skills are Claude agents; they need `instruction` text injected into their active reasoning context, not just printed to stdout. CLI middleware can't inject text into an AI context. Shell `run` commands can be executed by either layer, but keeping enforcement in the skill layer means one coherent place for both.

**Why post-hook failures warn but don't fail**: The workflow outcome (a file written, a change archived) has already occurred. Retroactively failing it would be misleading. Post-hook failures surface as warnings.

### D4: Config parsing — extend `readProjectConfig` with resilient hooks parsing

The existing `ProjectConfigSchema` (Zod) and `readProjectConfig` are extended:

```typescript
const HookEntrySchema = z.object({
  instruction: z.string().optional(),
  run: z.string().optional(),
}).optional().nullable();

const HooksConfigSchema = z.object({
  'pre-propose': HookEntrySchema,
  'post-propose': HookEntrySchema,
  'pre-explore': HookEntrySchema,
  'post-explore': HookEntrySchema,
  'pre-apply': HookEntrySchema,
  'post-apply': HookEntrySchema,
  'pre-archive': HookEntrySchema,
  'post-archive': HookEntrySchema,
}).partial();
```

Unknown hook keys (e.g., `pre-build`) emit a warning but do not fail parsing — consistent with existing resilient behavior.

### D5: Windows `run` command execution

Shell commands in `run` are passed to the system shell via `child_process.execSync` with `{ shell: true }`. On Windows, `./scripts/foo.sh` requires Git Bash or WSL to be on PATH. This limitation is documented in the config schema description; no cross-platform shim is provided.

## Risks / Trade-offs

**[Risk] Pre-hook blocking on misconfiguration** → If a user's `run` script has wrong permissions or path issues, the workflow is blocked. Mitigation: error output from the failed command is surfaced to the user verbatim so they can diagnose.

**[Risk] Skill files are not auto-updated for existing users** → Users with installed older skill versions won't get hook enforcement until they reinstall. Mitigation: document in release notes; hook system degrades gracefully (hooks simply don't run if skill doesn't check them).

**[Risk] `instruction` injection into skill context has no size limit** → Very large instructions could consume significant AI context. Mitigation: apply the same 50KB limit used for `config.yaml` `context` field; warn and truncate if exceeded.

**[Risk] Windows path separators in `run` field** → `./scripts/notify.sh` may not resolve on Windows without Git Bash. Mitigation: documented limitation; future work could add a `run-windows` override field.

## Migration Plan

1. Extend `src/core/project-config.ts` — add types and parsing for `hooks`
2. Add `openspec hooks get <event>` command in `src/cli/index.ts` + handler
3. Update TypeScript workflow templates in `src/core/templates/workflows/` to add pre/post hook steps; update SHA-256 hashes in the parity test
4. Add/update specs in `openspec/specs/`
5. No config migration needed — `hooks` field is entirely optional; existing configs are unaffected

## Open Questions

- Should `openspec hooks run <event>` be a convenience command that executes the `run` script directly (for testing hooks outside of a workflow)? Deferred to follow-up.
- Should hook execution timeout be configurable? Deferred — default OS timeout is acceptable for now.

