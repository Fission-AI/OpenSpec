---
'@fission-ai/openspec': patch
---

Read a requirement heading written with a CommonMark closing sequence, such as `### Requirement: Late Fees ###`, as the requirement it renders as. The trailing `#` run stayed in the name, so a REMOVED written that way looked for "Late Fees ###", missed the requirement, and archive exited 0 with a false "treating it as already removed" warning while the requirement stayed in the spec; a closed MODIFIED or RENAMED heading failed as "not found", and a closed and an open heading of one requirement were not reported as duplicates. Requirement names now drop the closing run wherever they are read, exactly as scenario names already did: only a run preceded by a space or tab counts, so a name such as `C#` keeps its `#`. Headings without a closing run are unaffected.
