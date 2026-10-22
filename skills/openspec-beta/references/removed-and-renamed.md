# Verifying REMOVED and RENAMED requirements

## REMOVED requirements

The change asks for the behavior to be gone, so invert the check:

  - A REMOVED block carries only the requirement name and any `**Reason**`/`**Migration**` notes, so the delta does not describe the behavior itself. Before searching, read the baseline requirement in the main spec at `<planningHome.root>/openspec/specs/<capability-path>/spec.md`, using the same capability path as the delta spec. Match it by normalized name, scanning that file's requirement headings rather than string-matching the delta's exact title. Its body and scenarios are the evidence for the behavior that must be gone; never search from the requirement name alone.
  - If that file holds no such requirement under this or a near-equivalent name - for example because an earlier sync already applied the removal - recover the baseline from the same file's history, in the planning repository rather than the current directory: `git -C "<planningHome.root>" log -p -- openspec/specs/<capability-path>/spec.md`, or `git -C "<planningHome.root>" show <commit>^:./openspec/specs/<capability-path>/spec.md` once you have identified the commit that applied the removal. Empty output means the pathspec matched nothing, not that there is no baseline: `git log` reports an unmatched path as success, so re-check the path before drawing any conclusion from silence.
  - A baseline that adds nothing to its own title - no body beyond a restatement of the name, no scenarios - is unusable evidence, the same as a missing one. If no usable baseline is available in either place, mark **Spec Coverage** as not verified for that entry with the reason and stop there: do not search, and never count an unsearched removal as passing.
  - Search codebase for that behavior. Matches in `openspec/` artifacts or docs, or in code that serves only the Migration note or an ADDED requirement, are not evidence by themselves. Report any code path that still delivers the removed behavior, including one shared with an ADDED requirement.
  - Finding no implementation is the expected result, but only once the baseline behavior was the thing you searched for. Never report a REMOVED requirement as "Requirement not found" or recommend implementing it.
  - If the behavior is still present:
    - Add CRITICAL issue: "Removed requirement still implemented: <requirement name>"
    - Recommendation: "Remove the remaining implementation at <file>:<lines>, following the requirement's Migration note if it has one"

## RENAMED requirements

For each `FROM:`/`TO:` entry the name changes but the behavior stays, so check the TO requirement for that unchanged behavior:

  - Do not report the FROM name as missing, and do not require code symbols, identifiers, or file names to be renamed.
  - If the TO name also appears under MODIFIED, its behavior is checked there against the MODIFIED text; skip it here.
  - Otherwise, read the baseline requirement in the main spec at `<planningHome.root>/openspec/specs/<capability-path>/spec.md`, using the same capability path as the delta spec: the requirement under the FROM name, or under the TO name only when the FROM name is absent because the main spec is already synced. Its body and scenarios are the evidence for the behavior the TO requirement keeps.
  - Search codebase for that behavior and assess if it is still implemented.
  - If it appears unimplemented:
    - Add CRITICAL issue: "Renamed requirement not found: <TO name>"
    - Recommendation: "Restore the behavior of <TO name> (renamed from <FROM name>); a rename must not change behavior"
  - If the baseline requirement cannot be found or read, mark **Spec Coverage** as not verified for that entry with the reason. Never count an unchecked rename as passing.
