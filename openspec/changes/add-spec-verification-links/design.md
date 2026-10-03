## Context

#1967 names two symptoms with one cause. Specs fill up with test and implementation detail because they are the only artifact that stays live after archive. And nothing links a requirement to the code or tests behind it. The issue asks for careful thinking before anything is built, and leaves three questions open. This design answers them for a first, small step, and parks the rest.

What exists today:

| Piece | State |
|---|---|
| Requirement identity | Heading text. Archive matches MODIFIED/REMOVED/RENAMED by normalized name (`normalizeRequirementName`). |
| Scenario identity | Heading text, but the parsed model keeps only `rawText`, not the name. There is no scenario-level RENAMED. |
| `**ID**:` metadata lines | The body reader already skips them (`requirement-text.ts`), but nothing reads or checks them. |
| `specs/<capability>/design.md` | Listed in the `openspec-conventions` project structure ("HOW, optional"). No code reads, writes, or archives it. |
| `/opsx:verify` scenario coverage | The agent searches for tests that look related. Nothing is recorded. |

## Goals / Non-Goals

**Goals**
- Let evidence point at the behavior it proves, without changing how specs are written.
- Make gaps visible: scenarios with no link, and links that no longer point at anything.

**Non-Goals (this change)**
- Stable IDs in specs.
- A home for implementation context (see Follow-ups).
- Gating validate or archive on coverage (#1652 owns that question).
- Generating tests (#900).

## Decisions

### 1. The unit of linking is the scenario

Scenarios are the testable part of a spec: WHEN/THEN is already a test shape. A requirement's status is the rollup of its scenarios. A reference without a scenario part links the whole requirement. That covers a test that proves the requirement's overall rule rather than one case.

### 2. Links live in the evidence, not in the spec

The test (or a manual-check note, or a lint config) carries the reference. Specs stay clean, which is the point of #1967. The link also sits next to the thing most likely to change, so whoever deletes a test deletes its claim with it.

Rejected: links in the spec. That puts file paths and test names back into requirements, the exact leak the issue describes. Rejected: a separate index file. Nobody updates it, and it drifts from both the specs and the tests.

### 3. Address by heading text, not new IDs

`@spec cli-archive > Archive refuses scenario loss > MODIFIED block drops a scenario`

Heading text is already the identity archive uses. It is readable in a diff and needs nothing new in the spec. Its weakness is that renames break links. The report turns that into a visible finding (a dangling reference) instead of a silent gap. Opaque IDs survive renames, but they add structure to every requirement and scenario. Agents also invent or duplicate them, and they mean nothing to a human reader. That is a lot of cost for an advisory report. If dangling links turn out to be common in practice, IDs can be added later using the `**ID**:` lines the reader already skips. Heading-text references would keep working alongside them.

Matching uses the same normalization archive uses for requirement names, and the same rule for scenario names. The separator is ` > ` because `#` is legal in names (`C#`). A capability path never contains spaces, so the first ` > ` always ends the path. A requirement name that itself contains ` > ` can't be referenced unambiguously, and the report says so rather than guessing.

### 4. A read-only report, advisory only

`openspec spec coverage [spec-id] [--json]` scans git-tracked text files in the project root for `@spec` references. It reads the main specs, which live in the store when one is configured. Then it reports:

| Section | Meaning |
|---|---|
| Linked | Scenario, with each `file:line` that references it |
| Unlinked | Scenario with no reference |
| Dangling | Reference that matches no current requirement or scenario, with the nearest existing name as a hint |

It exits 0 whatever it finds. "Unlinked" means nothing points here. It does not mean unverified, and the output says so. A project that adopts links gradually should not see red.

### 5. Git-tracked files only

Scanning what git tracks skips build output, dependencies, and anything ignored. There's no include/exclude config to maintain. Outside a git repository, the command reports that it can't scan and exits 0.

## Risks / Tradeoffs

- **Renames break links.** Accepted, and surfaced as dangling references. Watch how often this happens before adding IDs.
- **A reference is a claim, not proof.** A test can link a scenario and assert nothing useful. The report shows where to look. It does not vouch for the evidence (#1937 covers how a reviewer judges it).
- **Scan cost on large repos.** The scan is a single pass over tracked files for a fixed marker, the same cost class as `git grep`.

## Follow-ups (not in this change)

1. **Lasting home for implementation context.** Either implement the `specs/<capability>/design.md` the conventions spec already promises, with archive merging a change's relevant design notes into it, or remove the promise. This needs its own proposal, because archive would start writing a second file per capability.
2. **Verify uses the links.** `/opsx:verify` Scenario Coverage reads the report instead of guessing, and reports linked, unlinked, and dangling separately.
3. **Verification plan at proposal time.** Once links exist, `tasks.md` guidance can ask which scenarios each test task will link, and name the ones that will be verified manually or not at all.
4. **Strict mode.** Whether `--strict` should fail on dangling references, once there is data on how noisy they are.

## Open Questions for review

- Is heading-text addressing (Decision 3) acceptable as the first step, or should stable IDs come first?
- `openspec spec coverage` versus a top-level `openspec coverage`?
- Should manual verification have its own marker (for example `@spec-manual`), so the report can tell "tested" from "checked by hand"?
