# Design: test-side scenario references and a static coverage report

## Context

`openspec/specs/**/spec.md` holds 251 requirements and 747 scenarios across 36 capabilities in this repository. Each scenario is a named obligation. Nothing records which test discharges it.

Two things have already been settled on #900 and are taken as given here. The link lives on the test side, not in the spec, for the three reasons in the proposal. And a scenario rename invalidates its references loudly, because that is the failure an author needs to see rather than something to paper over with inference.

What remains is the part that gets expensive to change once annotations are sitting in thousands of test files: the exact grammar, the exact spelling of a name, and what the tool does when a reference does not resolve. This document decides those, and nothing more than those.

The parsers this needs already exist and are already shared. `extractRequirementsSection` yields requirement blocks, `normalizeRequirementName` yields a requirement name, `scenarioNameFromHeaderText` yields a scenario name, and `SCENARIO_HEADER` decides what counts as a scenario at all. `show --json` names a scenario through that same function since #1972, so there is one spelling of a scenario name in the tool today. Resolution reuses those functions rather than reading the Markdown a second way.

## Goals / Non-Goals

**Goals**

- One canonical, authorable spelling for a reference to any scenario in the specs.
- Resolution that reuses the existing name functions, so a reference and `show --json` cannot disagree about what a scenario is called.
- Four honest outcomes per reference, including the two that mean the author made a mistake.
- A scan whose cost and scope are stated in its own output.
- A first version nothing else depends on, so the convention can be corrected cheaply if it turns out wrong.

**Non-Goals**

- Reading change deltas. `--change` is the obvious next step and is deliberately left out so this one can be reviewed on the convention alone.
- Gating `archive` or `validate`. That is a policy decision, separately opt-in.
- Generating tests, or committing the project to test generation as part of any workflow.
- Knowing which test declaration an annotation sits above. See decision 5.
- Running the test suite, or reading its results. Nothing here executes anything.

## Decisions

### 1. The expanded spelling is a third `#` segment

The short form is `<capability>#<scenario>`. The expanded form inserts the requirement between them:

```
@openspec cli-show#json-output
@openspec cli-change#interactive-show-selection#non-interactive-fallback-keeps-current-behavior
```

`#` separates in both forms, and `/` stays available for the capability, which is a path: `specs-apply.ts` already merges `specs/<area>/<capability>/spec.md` by splitting an id on `/`, so a capability segment can be `billing/invoices`. Splitting a reference on `#` gives two or three parts, and the first part keeps its slashes, so the two forms are told apart by counting parts and never by guessing.

Requirement before scenario matches the spec's own nesting, and matches how the capability already reads left to right from broad to narrow.

Measured on this repository: 741 of 747 scenarios are unambiguous from the short form. Six need the requirement component, in three pairs:

| Capability | Scenario | Requirements that both declare it |
| --- | --- | --- |
| `cli-change` | Non-interactive fallback keeps current behavior | Interactive show selection, Interactive validation selection |
| `cli-spec` | Non-interactive fallback keeps current behavior | Interactive spec show, Interactive spec validation |
| `cli-update` | Updating files | File Handling, Tool-Agnostic Updates |

After the requirement component, zero references are ambiguous, and no two requirements inside one capability collide either. So the expanded form is sufficient for this corpus, not merely better. It is not guaranteed sufficient for every corpus, which is why decision 4 reports a residual collision as an error against the spec rather than pretending it cannot happen.

### 2. One canonical form, enforced, instead of an escaping rule

A reference segment is a fold of a name:

```
fold(name) = NFKC(name)
             .toLowerCase()
             .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
             .replace(/^-+|-+$/g, '')
```

Two properties make this pay for itself.

The fold alphabet is letters, marks, digits and `-`. It cannot contain `#` or `/`, so a reference parses by splitting on `#` with no escaping rule at all, and no quoting, and no backslashes. Escaping is not specified here because the design removes the need for it. For what it is worth, no requirement or scenario name in this repository contains a `#` today, but the grammar does not depend on that staying true: `C# support` folds to `c-support` and remains referenceable.

Keeping `\p{L}` and `\p{M}` rather than transliterating to ASCII means the convention crosses a language boundary, which is exactly where similarity matching died. A French scenario folds to a French slug.

**A segment is valid only when it already equals its own fold.** `Cli-Show`, `cli--show`, `-cli-show`, and a reference carrying a decomposed accent are all malformed, and the diagnostic names the canonical spelling. The alternative, folding whatever the author typed and matching on that, would give several working spellings for one target, which makes annotations ungreppable and makes any future rewrite ambiguous. One spelling per target, and the tool tells you what it is.

Folding can collide: `Foo bar` and `foo-bar` both fold to `foo-bar`. That is the same class of collision the expanded form exists for, handled the same way, and reported rather than guessed. The repository has no such collision today, and a scenario whose fold is empty, such as one named `...`, is reported as unreferenceable instead of resolving to the empty string.

This also mirrors something the codebase already does. `foldRequirementName` exists for exactly this purpose, matching case-insensitively for typo detection while real matching stays case-sensitive. This fold is a wider version of the same idea, and the comment on `foldRequirementName` is the precedent for why it is separate from the name itself.

### 3. One annotation per line, first token wins, rest of line ignored

```
@openspec <reference>
```

`@openspec` matches at the start of a line or after any character that is not a letter, digit or underscore, so `// @openspec`, `# @openspec`, `-- @openspec` and `<!-- @openspec` all work without the tool knowing a single comment syntax, while `foo@openspec` does not match. The reference is the first whitespace-delimited token after it. Everything after that token on the line is ignored, so `<!-- @openspec cli-show#json-output -->` and `// @openspec cli-show#json-output (see #1234)` both work.

The token must match the grammar in full. `/*@openspec cli-show#json-output*/`, where a C-style closer is glued to the reference with no space, is reported as malformed rather than silently trimmed. Trimming it would mean teaching the scanner one comment syntax at a time, and the error message is a cheaper fix than that: it names the offending characters and says to put a space before the closer.

Several references are several lines. This is what the maintainer asked for on #900, and it is also the only form that stays language-neutral: a list separator inside one annotation would need a quoting rule the moment a name contains it, and we just removed the need for quoting.

### 4. Four outcomes, three of which are errors

| Outcome | Meaning | Exit status |
| --- | --- | --- |
| `resolved` | exactly one scenario matches | contributes 0 |
| `malformed` | the token is not a valid reference | contributes 1 |
| `unresolved` | valid, but no scenario matches | contributes 1 |
| `ambiguous` | valid, but more than one scenario matches | contributes 1 |

`unresolved` is the loud failure the rename is supposed to cause, so it says which part went missing: the capability, the requirement, or the scenario. Those are three different repairs, and the author should not have to work out which one happened.

`ambiguous` from a short reference is not a defect in the spec. It means the short form is not enough here, and the diagnostic lists the requirement segments to choose between, so the fix is a copy and paste. `ambiguous` from an expanded reference is different: it means one requirement declares two scenarios that fold to the same name, which the convention cannot express. It is reported against the spec, naming both scenarios. Zero occurrences today, and `validate` already rejects duplicate requirement names inside a capability for the same kind of reason.

An unreferenced scenario is information, never an error. It is the normal state of a repository that has not adopted this, and a command that failed on it would be useless on the day it shipped.

### 5. An annotation is a location, not a test

The report keys on `(file, line, reference)`. The tool does not work out which test declaration the annotation precedes.

Binding an annotation to a test means parsing `it`, `test`, `describe`, `def test_`, `func Test`, `@Test` and the rest, per language, and getting it wrong in template strings and nested closures. None of that is needed to answer the questions this version answers, which are whether every reference resolves and which scenarios nothing references. Leaving it out removes every language-specific code path from the scanner, and the file and line are enough to navigate to.

A consequence worth stating: `openspec coverage` does not know whether an annotation sits above a test, inside a comment block, or in a Markdown file. Anything that writes the token declares a reference. That is a feature for an agent writing a plan and a non-problem for everyone else, and it is why decision 7 keeps the spec tree itself out of the scan.

### 6. Enumerate with git when there is a git work tree

The scan needs a candidate list that excludes build output. A project that builds to `dist/` and scans it gets every annotation twice, and the second copy is stale the moment the source changes.

`git ls-files -co --exclude-standard` returns tracked files plus untracked files that are not ignored. On this repository that is 1,289 files in 25 ms, and `dist/` drops out because `.gitignore` already says so. One subprocess, no ignore-file parser, and the project's own ignore rules rather than a guess at them. `src/core/store/git.ts` already runs git through `execFile`, which is the pattern to follow: git is a real binary on Windows, so it needs no shell shim and no `cross-spawn` wrapper.

Without git, or outside a work tree, the fallback is a directory walk that excludes `node_modules` and `.git`, and the report says which enumeration ran. The fallback is deliberately worse at excluding build output, and saying so in the output is better than quietly scanning twice as much.

Reading cost, measured on this repository: 1,191 source files and 9.2 MB in 183 ms, of which 13 ms is enumeration. That number depends entirely on testing `buf.includes('@openspec')` on the raw buffer before decoding UTF-8 or splitting lines; almost no file in a real repository contains the token. The scan is a read, not a gate, so unlike the hook described on #1112 there is no timeout behind which a silent failure could hide, but the prefilter is still the reason this is a fixed implementation detail in `design.md` rather than something left to the implementer.

### 7. Hard limits, and what the report says about them

Never scanned, regardless of configuration: `openspec/` and `.git/`. Excluding the spec tree is what keeps decision 5 safe, since a spec that quotes the annotation in an example would otherwise declare a reference. It is also the rule from #900 restated as a scan boundary: specs stay free of link metadata, so there is no reason to read them for links.

Skipped and counted, with the counts in the report: files containing a NUL byte in their first 8 KiB, files above 2 MiB, and anything outside the resolved OpenSpec root, including the target of a directory symlink that leaves it.

Narrowing, for a project that does not want a whole-repository read: `coverage.include` and `coverage.exclude` globs in the project config. Both narrow, neither can reach past the hard limits, and a scan that read fewer files than the enumeration offered says so.

The report always states the enumeration, the number of files read, and the number skipped by reason. A coverage report whose scope is wrong is worse than no report, because it reports scenarios as unreferenced when the annotation was simply never read. Printing the scope is what makes that visible instead of silent.

### 8. Nothing else calls it

`validate`, `archive`, `status` and the workflows are unchanged. The command is the only consumer of the convention in this change.

That is partly the maintainer's scoping on #900, and partly self-interest: this change fixes a grammar into test files, which is the expensive part to undo. A version that nothing depends on can be corrected in a minor release. A version that `archive` already gates on cannot.

## Risks

- **The grammar is load-bearing once adopted.** A project with 2,000 annotations cannot cheaply re-spell them. Mitigation is decision 2: one canonical form, enforced from the first release, so there is never a second spelling to migrate from. A future change that widens the grammar can accept the old form; one that narrows it cannot.
- **`coverage` reads as code coverage.** It does not mean line coverage, and in a repository that also runs `vitest --coverage` the two will be confused in conversation. The alternative names considered were `trace` and `links`. `coverage` wins because #900 already names the follow-on work "change-aware coverage", and inventing a second word for the same thing is worse than sharing one. The documentation says plainly in its first line that this counts scenarios, not lines.
- **The whole-repository read will eventually meet a repository where it is too slow.** 183 ms here is not evidence about a monorepo an order of magnitude larger. `coverage.include` is the release valve, and the measured cost is in the docs so the reader can judge.
- **An unreferenced-scenario list of 747 is not actionable.** On first run in an unadopted repository the interesting output is the empty error list, not the inventory. Human output leads with the errors and summarizes the inventory rather than printing it, and the full inventory is available in `--json`.

## Open questions

- Should `coverage.include` and `coverage.exclude` live under the project config at all for the first release, or should the first release ship the hard limits only and add narrowing when someone asks? Shipping without them is smaller and cannot be configured wrongly; shipping with them avoids a second config change later.
- Is `@openspec` the right token, given a project may already use `@openspec` in unrelated prose? A rarer token such as `@openspec-scenario` is safer and uglier. The measured hit count for `@openspec ` across this repository today is zero, which is one data point and not five repositories.
