---
"@fission-ai/openspec": patch
---

Report delta merge conflicts during validation as informational findings, including in successful text reports, without changing validation exit codes. Preserve filesystem read errors so unreadable main specs are not mistaken for missing specs.

Keep the validation report intact when the advisory merge preflight cannot resolve its inputs.
