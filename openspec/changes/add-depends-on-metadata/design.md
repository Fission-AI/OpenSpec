## Context

See `proposal.md` for motivation. This covers the piece the proposal deliberately left undesigned: how a `depends_on` candidate actually gets detected, and how the user stays in control of whether that detection runs at all — rather than it being a silent, always-on judgment call the agent makes on its own.

Two things already exist and constrain the design:

- Every active change's capability scope is already recorded as a directory structure, not just prose: `openspec/changes/<id>/specs/<capability-path>/spec.md` for each capability the change touches. `openspec validate` already refuses a change with zero spec deltas unless `.openspec.yaml` sets `skip_specs: true`, so this structure is guaranteed on every active change that isn't explicitly opted out. `discoverSpecFiles()` (`src/utils/spec-discovery.ts`) already recursively resolves a `specs/` root into capability ids/paths — it's used for `openspec/specs/`, and the same function works unchanged against a change's own `openspec/changes/<id>/specs/` directory.
- `openspec validate` already runs a bulk pass over every active change (`runBulkValidation`) and already supports opt-in behavior via flags (`--strict`, `--json`). Adding another flag is the existing extension point, not a new one.

## Goals / Non-Goals

**Goals:**
- Make capability-overlap detection a deterministic, directory-based CLI check — not agent prose reading other changes' markdown by hand — so it's testable (Given/When/Then, in `specs/cli-validate/spec.md`) and usable by anyone (a human, CI, or an agent), not just `/opsx:explore`.
- Make running it explicit and opt-in at both layers: a CLI flag that defaults off, and an explore-side yes/no the user answers once rather than the agent silently deciding mid-conversation whether "scope shifted enough."
- Keep the judgment call ("is this really an ordering dependency, and which direction") with the agent, and the write decision with the user — the CLI only ever produces a suggestion, never a `depends_on` write.

**Non-Goals:**
- No embeddings, no semantic-similarity service, no persistent capability-ownership index.
- No change to `openspec new change`'s scaffold-time behavior beyond the `--depends-on` flag from `proposal.md` — at bare scaffold time there are no `specs/` deltas yet to compare, so the check only has something to find once the discussed change has at least one spec delta (or, conservatively, once its proposal names capabilities in `## Capabilities`, if we want to run it slightly earlier — see Open Questions).
- Not a replacement for #1387/#1698 overlap detection. A shared capability path is a reason to look closer for *this* proposal's purposes (ordering), not a separate reported conflict (same-requirement collision).

## Decisions

### 1. Deterministic pre-filter: shared capability *paths* (directories), computed by the CLI, not read out of `proposal.md` prose

`openspec validate <name> --check-dependencies` (and, in a bulk run, `openspec validate --check-dependencies`) adds one pass per validated change:

1. Resolve the change's own capability paths: `discoverSpecFiles(path.join(changeDir, 'specs'))` → the set of `id`s.
2. For every other active change, resolve its capability paths the same way.
3. Any active change whose capability-path set intersects the validated change's, and that has no `depends_on` relationship with it already (in either direction — check both changes' `depends_on` arrays), is reported as an **informational finding**: "shares capability `<path>` with `<other-change>`; consider `depends_on`."

This replaces an earlier draft of this design that had the agent read every candidate's `proposal.md` `## Capabilities` prose section by hand via `openspec status`. That approach is dropped: capability paths are already a first-class structural fact everywhere else in the codebase (delta discovery, archive, the artifact graph), while the `## Capabilities` section in `proposal.md` is free-form prose with no parser today — reusing the directory structure is strictly more reliable and reuses `discoverSpecFiles()` outright instead of writing a new markdown parser.

The finding is informational only (never a warning or error, never fails `--strict`) because a shared capability path is a hint, not a defect — see `specs/cli-validate/spec.md`'s new "capability-overlap suggestion" requirement for the exact scenarios (flag off → nothing; shared path + no declared relationship → finding; relationship already declared either direction → no finding; `--strict` still passes on suggestions alone).

Comparing `affected_areas` (also on `ChangeMetadataSchema`) instead was rejected: no current CLI path populates it — the option that used to set it was removed (`new-change.ts`'s `assertRemovedOptionsAbsent`) — so it would be an empty signal for nearly every change today.

### 2. The check is opt-in at the CLI layer: off by default, on with `--check-dependencies`

This is the direct answer to "should the user be able to choose the general behavior vs. the dependency-checking behavior": `openspec validate` and `openspec validate --check-dependencies` are the two explicit modes, the same way `--strict` already toggles stricter behavior on the same command rather than existing as a separate command. No new top-level verb is introduced — extending `validate`'s existing flag surface was chosen over a new `openspec check-dependencies` command because the check only makes sense in the context of a specific change's validation pass, which `validate` already frames, resolves (`--json`/human, single item/bulk, root selection), and reports findings for today. Nothing needs re-deriving.

### 3. `/opsx:explore` asks once, explicitly, instead of deciding on its own

`src/core/templates/workflows/explore.ts` inlines the relevant prose twice (`getExploreSkillTemplate` and `getOpsxExploreCommandTemplate` — not a shared constant like `PLANNING_GUIDANCE`, so both copies need the identical addition). Add a new subsection immediately after "### Check for context" and before "### When no change exists":

```
### Check for dependencies

This project may have other active changes yours could depend on. Ask once,
early, rather than deciding silently mid-conversation:

"This project has N other active change(s). Want me to check whether this one
depends on any of them as we go? (Uses `openspec validate --check-dependencies`,
which only looks for shared capability areas - it won't write anything without
asking first.)"

- **If yes:** before offering to capture a new change, and again whenever the
  change's capability scope changes (a spec delta gets added, or an existing
  one changes which capability it targets), run
  `openspec validate "<name>" --check-dependencies --json` (once the change
  has at least one spec delta - there is nothing to compare before that) and
  read its findings. For each change named in a finding, read that change's
  `proposal.md` `## Why` / `## What Changes` (via `openspec status --change
  "<name>" --json` -> `changeRoot`/`artifactPaths`) and judge the
  relationship: coincidental (same capability, unrelated concern - no
  action), a genuine ordering dependency (this change assumes the other lands
  first), or the reverse (the other should depend on this one). Offer a
  genuine dependency to the user - never write it silently: "It looks like
  this builds on `<other-change>` - want me to record that as a dependency?"
  A yes on a change that already exists is written straight to its
  `.openspec.yaml` (`depends_on: [<name>, ...]`, preserving any entries
  already there); a yes before the change exists is passed as
  `--depends-on <name>` to `openspec new change`.
- **If no:** don't run the check for the rest of the session. The user can
  still set `depends_on` manually at any time, and can turn the check back on
  by asking.

A dependency on an *archived* change is never worth recording - once
archived it is already reflected in the specs, so there is nothing left to
depend on. `openspec validate --check-dependencies` only considers active
changes, so this never comes up as a finding.
```

Also extend the "When a change exists" → "Offer to capture when decisions are made" table with one row (`Possible dependency on another active change` → `` .openspec.yaml (depends_on) ``).

This is the second half of "both": the CLI flag gives any caller an explicit on/off, and explore's one up-front question gives the conversational user the same explicit on/off for the session, instead of the agent inferring from context whether "scope shifted enough" to justify a check no one asked for.

### 4. Writing an existing change's `.openspec.yaml` is a direct file edit, not a new command

There is no `openspec change set-metadata`-style command today; `.openspec.yaml` is written once by `createChange` and otherwise expected to be hand-edited. Explore already writes directly into `proposal.md`/`design.md`/`tasks.md` on confirmation, so writing a `depends_on` key into `.openspec.yaml` the same way is consistent with what explore already does, not a new capability. A future `openspec change` metadata-editing command would be strictly nicer (it could re-run the existence/self-reference checks from `specs/change-creation/spec.md` before writing), but is not required to ship this, and is listed under Open Questions rather than blocking.

## Risks / Trade-offs

- **A shared capability path that means nothing** (two unrelated changes both touch `cli-list` for different columns) **produces a finding that goes nowhere.** → Bounded cost: one extra `proposal.md` read per finding, and the judgment step explicitly allows "coincidental, no action."
- **A real dependency exists with no shared capability path** (e.g., one change's implementation needs another's helper function, with no spec-level overlap) **— the check misses it.** → Accepted: this proposal's scope is spec-level ordering; the issue itself frames the signal as "stated scope/affected areas," not code-level coupling. The user can still set `depends_on` manually via `openspec new change --depends-on` or by hand-editing `.openspec.yaml`.
- **A user says yes once and forgets the check is running, or says no and later wants it.** → The offer is re-askable ("can turn the check back on by asking"); nothing about saying no is persisted anywhere, so there's no stale opt-out to go stale.
- **Duplicated prose in two template functions can drift** if only one copy is edited. → Called out explicitly in Decision 3 so the impl PR edits both, the same discipline the file's existing content already requires.

## Migration Plan

1. Ship the schema/`new-change`/`list`/existence-and-cycle-`validate` pieces from `proposal.md` first — independently useful and unblock dogfooding this proposal on itself.
2. Ship `--check-dependencies` on `openspec validate` next — it only needs `discoverSpecFiles()` (already exists) and the `depends_on` field from step 1.
3. Ship the `explore.ts` prose addition (Decision 3) last, once `--check-dependencies` exists for it to call.
4. No rollback hazard at any step: `--check-dependencies` is opt-in and produces no persisted state; the prose addition is instructional text only.

## Open Questions

- Should `--check-dependencies` also run once a change has a `## Capabilities` section in `proposal.md` but no spec deltas yet (earlier in the workflow, before `specs` artifacts exist)? That would need parsing the prose section after all for that narrow window. Deferred: the common case (spec deltas already exist by the time explore would reasonably suggest a dependency) doesn't need it, and it can be added later without changing the flag's meaning.
- A dedicated `openspec change set-metadata` (or similar) command to write `depends_on` (and validate existence/self-reference/cycles before writing, instead of after) would remove the "direct file edit" step in Decision 4. Not required to ship this proposal; worth its own follow-up if hand-editing `.openspec.yaml` from explore turns out to be error-prone in practice.
