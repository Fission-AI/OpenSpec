# Review the plan

> The two-minute pass that catches wrong turns before they're code.

<!-- Partial draft: the plan-review sections are still headings only. -->

## The two-minute pass

## What good requirements look like

## What good scenarios look like

## Pushing back

## Advanced: verify after apply

Before archiving, check that the code does what the scenarios describe. The optional
[verify skill](../reference/skills.md#openspec-verify-change) can help find gaps.

### Keep a record when checks are hard to track

Use the change's `tasks.md` or an existing test report. For each check, record:

- **Scenario**: the requirement and scenario it checks, with a link to that version of the spec.
- **Check**: the test or manual check and what should happen.
- **Result**: pass, fail, not run, or unknown. Link to the original run or dated observation.
- **Tested version**: the code revision or build tested, and where it ran.

### Review the results

- **Open the source.** Confirm the result in the linked run or report. A checked task or an agent's summary alone does not prove the test passed.
- **Look for gaps.** Check that every scenario has a result. A passing test on one device or environment does not cover another. Keep missing and failed checks visible.
- **Check for changes.** Rerun checks affected by changes to the requirements, code, or environment. Unrelated documentation edits may leave earlier results valid.

**Archiving does not enforce these checks.** If passing results are required for
release, enforce that in your CI or release process.
