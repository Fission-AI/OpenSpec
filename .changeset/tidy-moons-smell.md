---
'@fission-ai/openspec': patch
---

archive: tell the author how to retire a capability when the emptied spec also holds content the merge cannot account for. That combination printed only "Spec must have at least one requirement" and no guidance at all; the abort now names the blocking lines - sanitized and length-bounded before they reach the terminal - and reports a `retire_capabilities` marker that is present but cannot be honored.
