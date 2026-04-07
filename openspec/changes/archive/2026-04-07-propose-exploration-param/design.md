## Context

The `/enpalspec:propose` skill (source: `src/core/templates/workflows/propose.ts`) currently auto-scans `openspec/explorations/` to find a matching exploration doc before creating artifacts. The match is heuristic: the agent compares change description against filenames and `# Exploration:` headers. This works well when the match is obvious, but adds friction when the user already knows exactly which doc to use — or when the doc name doesn't align with the change name.

## Goals / Non-Goals

**Goals:**
- Add an `--exploration <path>` parameter to the propose skill command syntax
- When provided, skip the scan-and-match step and read the specified file directly
- Preserve all existing behavior for callers who don't pass the parameter

**Non-Goals:**
- Changing how the exploration doc content seeds artifacts (that logic is unchanged)
- Validating the exploration doc format (the agent already reads it as context)
- Supporting multiple exploration docs in a single propose invocation

## Decisions

**Parse the parameter from the command argument string**
The skill receives its full argument string (everything after `/enpalspec:propose`) as `ARGUMENTS`. The skill prompt must instruct the agent to parse `--exploration <path>` from this string before doing anything else. This is the only viable approach — the command infrastructure doesn't have a CLI parser; the agent parses intent from the argument text.

Alternative considered: a positional second argument (e.g., `/enpalspec:propose my-change path/to/exploration.md`). Rejected — the existing first positional argument is already the change name or description, making a second positional argument ambiguous.

**Resolve the path relative to the repo root**
If the user passes a relative path (e.g., `openspec/explorations/explore-workflow-ux.md`), the agent should resolve it from the working directory root. Absolute paths should be used as-is. No normalization beyond what the Read tool handles natively.

**Skip scan entirely when parameter is present — no fallback**
When `--exploration` is provided, the agent uses that file and does not fall back to scanning if the file is missing. Instead, it should surface an error: "Could not read exploration doc at `<path>`. Check the path and retry." This keeps the behavior predictable.

## Risks / Trade-offs

- [Risk] User passes a stale or wrong exploration path → Mitigation: The agent reads the file and will surface a read error naturally; propose prompt should instruct agent to report the error and stop rather than silently proceeding
- [Risk] Argument parsing ambiguity (e.g., `--exploration` value contains spaces) → Mitigation: Instruct agent to treat the value after `--exploration` as the remainder up to the next flag or end of string; quoted paths are the recommended form
