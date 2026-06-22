# Assemble Working Context Spec (4.1)

## Outcome

From any root, one command produces the OpenSpec working context its
declarations describe: the resolved OpenSpec root plus referenced stores.
The result is consumable as an agent brief (JSON), human listing, or optional
`.code-workspace` file. Unresolvable references are reported, not guessed.

The earlier code-repo declaration/map experiment is removed. `openspec context`
does not infer implementation repos; users compose code folders explicitly with
personal worksets.

## Locked Decisions

1. **Assembly is a local convenience, not a planning system.** The selected
   OpenSpec root remains the source of truth; references provide read-only
   upstream context.
2. **The primary interface is an agent brief.** The editor file is one consumer
   of the same assembled data.
3. **No machinery.** No clone, pull, push, sync, branch, worktree, dashboard,
   launch, or edit-boundary enforcement.
4. **Unresolvable references are reported, not guessed.**

## JSON Shape

```json
{
  "root": { "path": "/abs/root", "source": "store|declared|nearest", "store_id": "...", "role": "openspec_root" },
  "members": [
    { "role": "referenced_store", "id": "upstream-context", "path": "/abs/store", "fetch": "openspec show <spec-id> --type spec --store upstream-context", "status": [] },
    { "role": "referenced_store", "id": "design-system", "status": [{ "code": "reference_unresolved" }] }
  ],
  "status": []
}
```

Available members have `path` and empty `status`. Unavailable members are kept
in the brief with their diagnostics and fixes. The top-level `status` carries
cross-cutting degradation such as an unreadable registry.

## Human Output

```text
$ openspec context
Working context for team-context (/Users/dev/src/team-context)

OpenSpec root
  team-context  /Users/dev/src/team-context

Referenced stores
  upstream-context  /Users/dev/openspec/upstream-context
    Fetch: openspec show <spec-id> --type spec --store upstream-context

Not available on this machine
  - design-system: not registered
    Fix: git clone -- https://github.com/acme/design-system.git /Users/dev/openspec/design-system && openspec store register '/Users/dev/openspec/design-system' --id design-system
```

## `.code-workspace` Emission

`--code-workspace <path>` writes `{folders: [{name, path}...]}` with the root
first, then available referenced stores named `ref:<id>`. Existing files refuse
without `--force`; missing parent directories fail; JSON mode keeps stdout as a
single brief and sends write confirmation to stderr.

## Scope

In scope:

- `src/core/working-set.ts`: pure working-set assembly and workspace JSON
  builder.
- `src/commands/context.ts` and `src/commands/shared-gather.ts`: root
  relationship data gather, human/JSON output, code-workspace write handling.
- Deletion of old workspace opening machinery.
- Docs and tests for root + referenced-store assembly.

Out of scope:

- Editor integrations beyond `.code-workspace`; terminal session launchers.
- Any code-repo inference or implementation-folder discovery.
- Per-change context narrowing.

## Acceptance Criteria

### Assembly From References

- **GIVEN** a store-backed root with one resolvable and one unresolvable
  reference
- **WHEN** `openspec context` runs in human and JSON modes
- **THEN** JSON contains the root and referenced-store members only, resolved
  members carry absolute paths and fetch recipes, unresolved members carry
  existing diagnostics verbatim, and exit code is 0

### Nothing Declared

- **GIVEN** a root with no references
- **WHEN** context runs
- **THEN** the set contains only the root, `members: []`, and human output says
  the working set is this root alone

### Code-Workspace Emission

- **GIVEN** the mixed-reference fixture above
- **WHEN** `openspec context --code-workspace out.code-workspace` runs
- **THEN** the file contains folders for the root plus resolved referenced
  stores only, unresolved members are reported on stderr, overwrite requires
  `--force`, and no other files or registry state change

### Old Machinery Is Gone

- **GIVEN** the post-4.1 tree
- **WHEN** the suite runs and the ledger is read
- **THEN** old workspace state machinery is gone and assembly works without any
  workspace or initiative state
