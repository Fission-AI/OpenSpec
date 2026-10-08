## Context

The `schema init` action currently checks whether the destination exists and, when `--force` is present, immediately removes that directory. Only afterward does it collect the remaining inputs and validate `--artifacts`. An unknown artifact therefore produces the expected error only after the existing schema has already been deleted.

The command is implemented as one Commander action in `src/commands/schema.ts`. Its current tests largely exercise supporting schema functions or manually create expected files instead of invoking the registered command, so they do not observe mutation ordering.

## Goals / Non-Goals

**Goals:**

- Finish collecting and validating schema-init inputs before any forced replacement mutates the destination.
- Preserve the complete existing schema when an artifact ID is invalid.
- Keep error output, exit status, and successful `--force` replacement behavior compatible.
- Cover the behavior through the real registered `schema init` command on cross-platform temporary paths.

**Non-Goals:**

- Change the set of artifact IDs accepted by `schema init` or how the comma-separated list is parsed.
- Make replacement transactional for filesystem failures that occur after validation succeeds.
- Change overwrite behavior in other schema subcommands.

## Decisions

### Separate preparation from destination mutation

The action will retain the early destination-exists check so an invocation without `--force` still fails without prompting or doing extra work. When overwrite is allowed, it will defer `fs.rmSync()` until after the command has:

1. Determined interactive or non-interactive mode.
2. Collected the description and artifact selection.
3. Rejected an empty selection or unknown artifact ID.
4. Constructed the artifact definitions and in-memory schema object.

Only then will the command remove the existing directory and write the replacement.

This directly fixes the deterministic validation failure without introducing temporary-directory swaps or rollback machinery. Staging and atomically swapping the entire schema was considered, but it would broaden this targeted fix to cover unrelated filesystem failures and platform-specific rename behavior.

### Preserve the existing failure contract

Invalid artifacts will continue to produce the same text or JSON error, set a non-zero exit code, and report the valid artifact IDs. The only observable difference is that an existing destination remains unchanged.

Keeping the output contract stable limits the change for scripts and agents that already consume the JSON response.

### Add command-level regression tests

Tests will register `schema` on a fresh Commander program and call `parseAsync()` with real command arguments inside a temporary project directory. The primary regression test will place a sentinel file in an existing schema, invoke `schema init --force` with an unknown artifact, and verify that both the directory and sentinel content survive.

A successful overwrite test will use valid artifact IDs and verify that the old sentinel is removed while the expected generated files exist. Paths will be constructed with Node.js `path` helpers so the same tests run on Windows, macOS, and Linux.

## Risks / Trade-offs

- **Risk: Moving mutation later could accidentally weaken successful overwrite behavior.** Mitigation: Keep a positive command-level test that proves a valid forced initialization still replaces the destination.
- **Risk: Commander tests can leak `process.exitCode` or the working directory into neighboring tests.** Mitigation: Save and restore process state in test setup and teardown.
- **Trade-off: A write failure after validation can still leave a partial replacement.** Mitigation: Treat full transactional replacement as a separate hardening effort; this change guarantees safety for input and selection failures only.
