# Never dead-end a capability retirement

## Why

A change whose delta removes the last requirement a capability has rebuilds the
main spec empty, and an empty spec can never validate. Retirement is what
archive does instead, and because it deletes a file it has to be asked for: the
change declares `retire_capabilities: true`. The abort names that marker when it
is the single thing missing.

Retirement is also refused while the spec holds any non-blank line the merge
cannot name — a `## Notes` section, a comment under a requirement. Both are
ordinary things to find in a hand-written spec. When the marker was missing *and*
such a line was present, neither hint fired: the marker hint was suppressed
because adding it would not have let the archive through, and the hint that names
those lines only spoke to authors who had already declared the marker.

The archive then aborted on a bare "Spec must have at least one requirement" with
no guidance at all — the dead end the marker exists to close, still reachable
(#1696, worked around there with `--skip-specs` plus a hand-applied sync).

## What Changes

- When this run emptied the capability, the marker is absent, and the spec holds
  content the merge cannot account for, the abort names that content and says
  what archive would otherwise do with the spec.
- It still does not name the marker in that case. The marker is named only when
  adding it would really let the archive through; a spec with a second
  `## Requirements` section holding a live requirement must not be pointed toward
  a deletion. Once the content is resolved, the rerun names the marker.
- The blocking lines are authored file content printed to a terminal, so they are
  rendered with control characters replaced and their length bounded — the same
  treatment a change directory name already gets. This also hardens the
  marker-declared refusal, which echoed them verbatim.

No change to what archive writes, deletes, or refuses. Message paths only.

## Impact

- Affected specs: `cli-archive` (MODIFIED: Capability Retirement)
- Affected code: `src/core/archive.ts`
- Affected docs: `docs/writing-specs.md` (states the second refusal condition,
  which was true before this change but undocumented)
