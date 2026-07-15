# Design: Domain Support & Archive Restructure

**Date:** 2026-06-03  
**Status:** Approved

## Summary

Restructure the OpenSpec `changes/` and `archive/` directories to support multi-level domain grouping. Move `archive/` to be a sibling of `changes/` rather than nested inside it, and add an interactive domain-selection step when creating a new change.

## Goals

1. Remove `changes/archive/` — archive is no longer nested inside changes
2. `archive/` is a sibling of `changes/` under `openspec/`
3. `changes/` and `archive/` both support arbitrary multi-level domain hierarchies
4. Archiving a change preserves its domain hierarchy in `archive/`
5. Creating a change prompts the user to optionally select or create a domain, level by level

## Directory Structure

```
openspec/
  changes/
    <change-name>/                              # no domain (root level)
    <domain>/<change-name>/                     # one-level domain
    <domain>/<sub-domain>/<change-name>/        # multi-level domain
  archive/
    <date>-<change-name>/                       # no domain
    <domain>/<date>-<change-name>/              # one-level domain
    <domain>/<sub-domain>/<date>-<change-name>/ # multi-level domain
```

## Change ID Convention

A change's **id** is its path relative to `changes/`, with the final segment being the change name (kebab-case) and preceding segments being domain levels:

```
add-login                  # id with no domain
auth/add-login             # id with domain = auth
auth/oauth/add-login       # id with domain = auth/oauth
```

**Naming constraints:** Every segment (domain segments and change name) must satisfy the existing kebab-case validation rule. No two changes may share the same id within a planning home.

## Domain Selection Interaction (new change)

When running `openspec new change <name>` interactively, after validating the change name, an optional domain-selection step is inserted before the directory is created.

**Flow — level by level:**

```
? Select domain (optional, press Enter to skip)
  ❯ [Create here, no domain]
    auth/
    infra/
    [Create new domain…]

# If auth/ is selected, descend one level:
? Place under auth/, or go deeper?
  ❯ [Create under auth/]
    auth/oauth/
    [Create new sub-domain…]

# If [Create new domain…] or [Create new sub-domain…] is selected:
? Enter new domain name (kebab-case): _
```

| Option | Meaning |
|--------|---------|
| `[Create here, no domain]` | Place change directly under `changes/` |
| `auth/` (existing directory) | Descend into that directory for the next level |
| `[Create under auth/]` | Place change under `changes/auth/` |
| `[Create new domain…]` | Prompt for a new kebab-case name; create that directory level |

**Non-interactive / scripted use:** A new `--domain <path>` CLI option accepts a slash-separated domain path (e.g. `--domain auth/oauth`). Each segment is validated against the kebab-case rule. Use `--domain ""` (explicit empty string) to declare "no domain".

**Agent / non-TTY enforcement (mandatory domain decision):** Domain selection cannot be silently skipped. When the CLI detects it cannot prompt interactively (no TTY on stdin, or `--json` mode) AND `--domain` was not provided, the command **must fail** with an agent-readable error instructing the caller to consult the human user. Example error:

```
Error: Domain selection is required and cannot be skipped.

This environment does not support interactive prompts (no TTY / --json mode).
If you are an AI agent: please ask the user which domain to place this
change under, then re-run with one of:

  --domain <path>     e.g. --domain auth/oauth
  --domain ""         to place the change at the root (no domain)
```

The exit code is non-zero so agents can detect the failure programmatically. Existing changes' domain layout (under `openspec/changes/`) should be surfaced to the agent so it can present meaningful options to the user.

## Archive Logic

**Archive root:** `openspec/archive/` (sibling of `changes/`, not nested inside it).

**Archive path calculation:** The domain portion of the change id is preserved; only the final segment (change name) receives the date prefix.

```
# No domain
changes/add-login/
→ archive/2025-01-23-add-login/

# One-level domain
changes/auth/add-login/
→ archive/auth/2025-01-23-add-login/

# Multi-level domain
changes/auth/oauth/add-login/
→ archive/auth/oauth/2025-01-23-add-login/
```

**Changes to `ArchiveCommand`:**
1. `archiveDir` becomes `path.join(openspecDir, 'archive')` instead of `path.join(changesDir, 'archive')`
2. Target path is built by joining `archiveDir`, the domain segments from the change id, and the date-prefixed change name
3. `selectChange()` is updated to recursively scan `changes/` for leaf-node change directories and display their full relative-path ids

**Existing `changes/archive/` compatibility:** No automatic migration and no error. The old directory is simply ignored by all updated code paths. Users may manually migrate if desired.

## Affected Files

### Modified

| File | Change |
|------|--------|
| `src/core/archive.ts` | New `archiveDir`; domain-aware path calc; recursive leaf scan |
| `src/core/list.ts` | Recursive scan of `changes/`, display full relative-path id |
| `src/core/view.ts` | Recursive scan replacing single-level `readdir` |
| `src/utils/item-discovery.ts` | `getActiveChangeIds` recurses to leaf nodes; `getArchivedChangeIds` scans `openspec/archive/` |
| `src/utils/change-utils.ts` | `createChange` accepts slash-separated id; joins `changesDir` + id |
| `src/commands/workflow/new-change.ts` | Domain-selection interactive step; `--domain` option |
| `src/core/planning-home.ts` | `getChangeDir` / `formatChangeLocation` compatible with multi-segment ids |
| `src/commands/completion.ts` | `getArchivedChangeIds` targets new archive root |
| `src/core/templates/workflows/archive-change.ts` | Update archive-path instructions in skill template |
| `src/core/templates/workflows/bulk-archive-change.ts` | Same |

### Not Modified

- `src/core/validation/` — content-based, path-agnostic
- `src/core/artifact-graph/` — receives `changeRoot` as parameter, no hardcoded paths
- `src/core/schemas/` — schema definitions, path-agnostic
- `src/telemetry/` — records command names only

## New Helper Functions

Suggested location: `src/utils/change-path.ts`

```ts
// Split a full change id into domain segments and change name
splitChangeId(id: string): { domain: string[]; name: string }

// Recursively find all leaf-node change directories under changesDir,
// returning relative-path ids
findAllChangeIds(changesDir: string): Promise<string[]>

// Same, but for the archive root
findAllArchivedChangeIds(archiveDir: string): Promise<string[]>

// Compute the archive target path for a given change id and date string
buildArchivePath(archiveDir: string, changeId: string, date: string): string
```

A "leaf node" is a directory that contains `.openspec.yaml` or `proposal.md`, indicating it is a change rather than a domain container.

## Error Handling

- If the user provides `--domain auth//oauth` or a segment that fails kebab-case validation, fail with a clear error message listing the invalid segment
- If a new domain name entered interactively fails validation, re-prompt rather than aborting
- If the computed archive target already exists, fail with an actionable message (same behaviour as today)
- **If the environment is non-interactive (no TTY, or `--json`) AND `--domain` was not provided, fail with a non-zero exit and the agent-readable error described in the "Agent / non-TTY enforcement" section above. Do NOT default to "no domain".**

## Testing Notes

- All path assertions in tests must use `path.join()` — no hardcoded slashes
- Add test cases for: no-domain change, single-level domain, two-level domain, archive path calculation for each case
- Add test cases for the `splitChangeId` and `buildArchivePath` helpers
- The domain selection interaction should be testable via the `--domain` flag without interactive prompts
