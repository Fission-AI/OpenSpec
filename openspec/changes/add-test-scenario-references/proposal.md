## Why

A spec names every scenario it requires. Nothing in a repository says which test checks which scenario, so coverage of the spec is reviewed by reading, and a scenario can be reworded or removed while a test keeps checking the old behavior with nobody noticing.

The link cannot be recovered after the fact. Measured across five public OpenSpec repositories, 8,860 criteria in total, text similarity recovered 2 to 10 percent of scenarios where specs and tests are written in the same language, and nothing at all across a language boundary: on a French-spec repository, 268 of 482 failures shared not one significant word with any of 644 test titles (reported on #900). No threshold fixes that, so the link has to be written down by the author.

Where it is written down decides whether it survives. A link stored in a spec is fragile for three reasons that are specific to how OpenSpec works today:

1. A `MODIFIED` block replaces a whole requirement, so a link stored inside one disappears quietly when an author rewrites the block and does not copy it over.
2. `SCENARIO_HEADER` is `/^####\s+/`, so every level-4 header is a scenario. Link metadata written as a `####` block becomes a scenario, which is why the one existing tool that tried this had to hide its links in HTML comments.
3. Specs are the thing under review. Adding bookkeeping to them makes the review worse.

A link stored in the test has none of those problems. Renaming a test breaks nothing. Renaming a scenario breaks its references loudly, which is the useful failure, and a `RENAMED` entry says exactly how to repair them. A comment works in every language and every test runner.

This proposal writes down that convention and adds one static command that resolves it and reports what it finds.

## What Changes

- Define a test-side annotation, `@openspec <reference>`, that declares one reference to one spec scenario. One annotation per line, so the grammar stays line-oriented and language-neutral.
- Define the reference as `<capability>#<scenario>`, with the expanded spelling `<capability>#<requirement>#<scenario>` required when a scenario name is ambiguous inside its capability. In this repository 741 of 747 scenarios resolve from the short form, the remaining 6 need the requirement component, and nothing is left ambiguous after it.
- Bound how a target can be spelled. A reference segment is valid only when it already equals its own fold, so `Cli-Show`, `cli--show` and a decomposed accent are reported as malformed with the canonical spelling named. A scenario therefore has at most two accepted spellings, the short and the expanded, exactly one of which is canonical. Both resolve, the tool reports the canonical one on every resolved reference, and a reference that is more specific than it needs to be is noted rather than failed, so removing an unrelated colliding scenario cannot invalidate annotations that still identify one scenario.
- Add `openspec coverage`, which scans the project for annotations, resolves each one against `openspec/specs/`, and reports four outcomes per reference: resolved, unresolved, ambiguous, malformed. It also reports which scenarios no annotation references, and the canonical reference to paste for each one.
- Bound the scan explicitly. Candidate files come from `git ls-files -zco --exclude-standard` in a git work tree, which lists 1,289 files in 25 ms on this repository and excludes build output for free, and from a directory walk with a declared exclusion list otherwise. `-z` is required rather than cosmetic: without it git quotes unusual paths, so `café.ts` arrives as `"caf\303\251.ts"` and a filename containing a newline is split into two paths that do not exist. The report always states which enumeration ran and how many files were read or skipped.
- Keep the first version advisory. `openspec coverage` exits 1 when a reference is malformed, unresolved or ambiguous, because a stale reference is a defect the author wants to hear about. An unreferenced scenario never affects exit status. No other command changes behavior: `validate`, `archive` and the workflows do not call this.

Deliberately not in this change: change-aware coverage (`--change`), which needs delta reading and builds on the resolver added here; any archive gate, which stays a separate opt-in policy decision; and test generation, which this does not commit the project to.

## Capabilities

### New Capabilities

- `test-scenario-references`: the annotation grammar, the canonical spelling of a reference, and the rules for resolving one against the current specs. Tool-independent, so an editor, an agent or a third-party reporter can implement the same convention.
- `cli-coverage`: the `openspec coverage` command, its scan boundaries, its human and JSON reports, and its exit status.

### Modified Capabilities

- `cli-completion`: register `coverage` in the generated completion scripts alongside the other commands.

## Impact

- **Public CLI:** one additive command. No existing command, output or exit status changes.
- **Repositories:** nothing is required of a project that does not use it. A project with no annotations gets a report listing every scenario as unreferenced and exit 0, which is accurate rather than a failure.
- **Specs:** no new spec syntax, and no link metadata in spec files.
- **Configuration:** an optional `coverage.exclude` and `coverage.include` under the project config, for narrowing a scan that is larger than a project wants to read.
- **Documentation and completions:** document the convention and the command in `docs-lab/`, and register `coverage` on the existing Bash, Zsh, Fish and PowerShell surfaces.
- **Implementation:** a reference parser, a spec index built from the existing parsers, a scanner, the command and its two output modes, completions, docs, tests, and a changeset. One new subprocess call to `git`, which `src/core/store/git.ts` already establishes, and no new dependency.
