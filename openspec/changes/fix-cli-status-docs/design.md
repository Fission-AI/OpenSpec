## Context

The `docs/cli.md` file contains example output for the `openspec status` command that doesn't match the actual CLI output. The discrepancies exist in both text and JSON format examples. The source of truth is the actual CLI implementation in `src/commands/workflow/status.ts` and `src/commands/workflow/shared.ts`.

## Goals / Non-Goals

**Goals:**
- Replace the incorrect text and JSON examples with output that matches the actual CLI behavior
- Ensure examples are verifiable by running the actual commands

**Non-Goals:**
- Changing the CLI output format itself
- Updating any other documentation sections
- Adding new documentation sections

## Decisions

### 1. Derive examples from actual CLI output

**Decision:** Run `openspec status` against a real change and use the actual output (sanitized with a user-friendly change name) as the documentation examples.

**Rationale:** This eliminates guesswork and ensures accuracy. The examples should be copy-pasted from real output, not written from memory.

### 2. Validate after editing

**Decision:** After updating the documentation, verify correctness by comparing every field name and format in the documented examples against the actual CLI output.

**Rationale:** The original bug was introduced because examples were written without validation. The fix must not repeat this mistake.

## Risks / Trade-offs

- **[Examples go stale if CLI output changes]** → Low risk for a single fix. A systemic solution (generated docs) is out of scope.
