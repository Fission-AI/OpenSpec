---
"@fission-ai/openspec": patch
---

Delta and main-spec parsers strip a UTF-8 BOM, so files saved by Windows editors or PowerShell redirects no longer fail with "No delta sections found".
