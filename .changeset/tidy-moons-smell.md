---
'@fission-ai/openspec': patch
---

archive: tell the author how to retire a capability when the emptied spec also holds content the merge cannot account for. That combination printed only "Spec must have at least one requirement" and no guidance at all; the abort now names the blocking lines and reports a `retire_capabilities` marker that is present but cannot be honored. Authored content quoted in those messages - the blocking lines, and the marker's own reason, which `openspec validate` prints too - is stripped of control characters and bounded in length before it reaches the terminal.
