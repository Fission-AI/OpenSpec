# Review the plan

> The two-minute pass that catches wrong turns before they're code.

<!-- Partial draft: the plan-review sections are still headings only. -->

## The two-minute pass

## What good requirements look like

## What good scenarios look like

## Pushing back

## Advanced: verify after apply

Check each scenario against the implemented behavior before archiving. The optional
[verify skill](../reference/skills.md#openspec-verify-change) can help find gaps.

For changes that need several checks, keep a short record in `tasks.md` or link to
an existing test report. For each scenario, record:

- **Check**: the test or manual check and its expected outcome.
- **Result**: what happened, with a link to the original test run or recorded observation.
- **Version**: the code revision or build tested, and the environment it ran in.
- **Gaps**: failures, checks not run, or results you could not confirm.

Open the linked results yourself. A checked task or an agent's claim that a test
passed is not enough to confirm the behavior. A passing check covers only the
scenario and environment it tested.

When requirements or code change, rerun the affected checks. Reuse earlier results
only when the changes leave the tested behavior and environment unaffected.

**Archiving does not enforce these checks.** If your project requires passing
results before release, enforce that in your CI or release process.
