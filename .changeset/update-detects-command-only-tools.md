---
'@fission-ai/openspec': patch
---

`openspec update` now refreshes tools that are configured with command files but no skills (delivery `commands`). Previously it read the generating version only from skill files, so such a tool was reported as "up to date" forever and its command files were never regenerated after a CLI upgrade. Command files carry no version stamp, so OpenSpec compares their contents against what it would generate now — including removing a command file left behind by a workflow you have since deselected. CRLF line endings and a UTF-8 BOM are treated as checkout artifacts rather than drift, so a Windows clone does not report a spurious update.
