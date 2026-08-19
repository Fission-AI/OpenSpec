---
"@fission-ai/openspec": patch
---

fix(workflows): create the main spec when a capability is new

The agent-driven archive workflow told agents to compare each delta spec with
its main spec, but said nothing about the case where that main spec does not
exist yet. Agents read "nothing to compare" as "already synced", archived the
change, and the capability's main spec was never written — the exact case
`openspec archive` handles by creating the spec from the delta's ADDED
requirements. The archive workflow now counts a missing main spec as changes
needed and names it as a spec the sync will create.

The sync workflow gained the matching rule for the other half: MODIFIED and
RENAMED have no requirement to act on when the main spec does not exist, so it
stops and reports instead of inventing one, matching the CLI's
"only ADDED requirements are allowed for new specs" error.
