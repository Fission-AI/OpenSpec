## Context

See proposal.md — Why. What shapes the approach here is where the two ends
already sit:

- `buildSpecSkeleton` composes the placeholder inline, interpolating the change
  name. It is generated text with no name of its own.
- `applySpecRules` is the single place both spec entry points converge —
  `validateSpec` (a file) and `validateSpecContent` (a rebuilt spec, called by
  archive). A rule added there reaches the CLI and archive at once, so the
  blast radius on archive has to be answered rather than assumed.
- Strict mode is already defined as "warnings fail": `createReport` treats a
  warning as invalid only when `strictMode` is set. Severity is therefore a
  choice between two existing behaviors, not a new mechanism.
- `task-numbering.ts` establishes the shape for a check like this: a pure module
  under `src/core/validation/` returning findings, mapped to issues at one call
  site in the validator.

## Goals / Non-Goals

**Goals:**

- Report the placeholder without changing what any command does today by default.
- Recognise placeholders already on disk, including ones written by earlier
  versions, since those are the ones that have lingered longest.
- Keep the rule quiet on authored prose, so the warning stays worth reading.

**Non-Goals:**

- Changing what archive writes. The placeholder is a useful marker at the moment
  it is written; this change is about reporting it afterwards.
- Reporting a `## Purpose` in a delta spec. Delta Purposes are only read when a
  capability is created, and archive already warns when it ignores one.
- Filling the Purpose in automatically. Only the author knows what the capability
  is for.

## Decisions

### Severity is a warning, not an error

Strict mode already means "warnings are failures", so a warning gives both
behaviors from one severity: silent by default, failing under `--strict`.

*Alternative — error:* every project with a placeholder on disk starts failing
`openspec validate` on upgrade. On the evidence that these linger for months,
that is a large and involuntary blast radius for a documentation defect.

*Alternative — a dedicated opt-in flag:* adds a surface to learn and to document,
and duplicates what `--strict` is for. Rejected as a second mechanism for an
existing one.

### The check lives in validation, not in archive

Placed as a pure module beside `task-numbering.ts` and called from
`applySpecRules`, so it applies to every path that validates a main spec.

*Alternative — report at archive time, when the placeholder is written:* archive
already prints at that moment, and a line in a terminal is exactly what did not
survive. The defect is what persists on disk, so the check belongs where disk
state is inspected, and it must keep working for a spec archived a year ago by a
version that no longer runs.

### The generated sentence is recognised through a shared constant

The placeholder is text this tool generates, so it gets a name: the template
moves into a constant that `buildSpecSkeleton` composes from and the check
recognises through. Detection is then anchored to the thing itself rather than to
a second, hand-copied spelling of it that can drift from the writer.

The change name is interpolated, so recognition matches the constant's fixed
segments around it rather than the whole string.

*Alternative — spell the sentence out in the detector:* two independent copies of
one string, and the check silently stops matching the day the writer is reworded
— the failure mode being a check that reports nothing and looks healthy.

### A second, narrow marker rule covers what the constant cannot

A placeholder is not always the generated one. The `specs` instruction tells
agents to write "a brief TBD placeholder" when a delta has none, and an agent
writes its own wording. So a `TBD` **opening** the Purpose is also reported.

The rule is deliberately positional rather than a search: a Purpose that opens
with `TBD` is announcing it was not written, while "the retry budget is TBD
pending benchmarks" is a real Purpose with an open question in it. Reporting the
second would train people to ignore the warning, which costs more than the
findings it would add. A word that merely starts with those letters (`TBDs`) is
excluded for the same reason.

This is the one place the change cannot use an explicit lookup — the text is
written by agents and authors, not generated here, so there is no list to consult.
It is kept to a single anchored marker at a known position precisely to stay as
close to a lookup as the input allows.

It also covers a case the constant match cannot. A markdown formatter that
rewraps the generated sentence across two lines breaks the constant lookup, and
the marker rule still catches it, because every spelling of the placeholder opens
with `TBD`. So the fallback is not only for agent-written placeholders — it is
what keeps detection working when the generated one is reformatted.

### The placeholder finding replaces the brevity finding

A bare `TBD` is both a placeholder and under the length floor. Reporting both puts
two findings on one line where only one is actionable: "you left the placeholder
in" tells the author what to do, "your Purpose is under 50 characters" does not.
The placeholder check therefore runs first and the brevity check runs only when it
does not fire.

### Locating the line follows the rule that matched

The warning names the line carrying the placeholder, and which line that is
depends on which rule fired. A leading `TBD` is the section's first non-blank line
by definition. The generated sentence is not: it can sit below prose somebody
wrote, so it is located by its own text.

Naming the first non-blank line in that second case points at the authored prose —
a line the reader can see is fine, which reads as the check being wrong rather
than the Purpose being unwritten. When both rules match the leading marker wins,
because it is the earlier of the two.

When the placeholder cannot be located — no section header, or a generated
sentence no single line carries — the finding is reported without a line rather
than with a guessed one, since a wrong line number is worse than none.

Line endings are normalised before counting, so a spec saved on Windows reports
the same line number as the same spec saved on macOS or Linux.

## Risks / Trade-offs

- **A project running `--strict` in CI starts failing on upgrade** → that is the
  intended effect and the reason severity is not an error: the failure is opt-in,
  arrives only where a stricter gate was already requested, and is fixed by
  writing one sentence. The message names the file to edit.

- **A legitimate Purpose that opens with "TBD" is reported** → accepted. A Purpose
  whose first word is `TBD` is stating it was not written; reporting it is the
  feature, not a false positive.

- **The marker rule is a positional match on authored prose, against the project's
  preference for explicit lookups** → confined to the one case where no list can
  exist, and anchored at a single position so its behavior is enumerable. The
  generated sentence, which *can* be looked up, is looked up.

- **Wording of the generated placeholder changes later and old specs stop being
  recognised by the constant** → the marker rule still catches them, since every
  spelling used so far opens with `TBD`.

- **Archive behavior changes unintentionally** → archive constructs its validators
  without strict mode, so a warning cannot flip a rebuilt spec to invalid. Covered
  by a test asserting the exact call archive makes.

## Migration Plan

None. No data, config, or spec files change. A project sees the new warning the
first time it validates after upgrading, and fixes it by writing the Purpose in
the main spec.

## Open Questions

- Should a `TODO` marker be treated the same as `TBD`? No tool or instruction
  produces one today, so it is left out; adding it later is a one-line widening
  that changes no scenario already written here.
