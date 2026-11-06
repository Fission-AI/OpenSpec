---
"@fission-ai/openspec": patch
---

`openspec update` now upgrades a project made by any release from 0.12 onward in one run. It recognizes every file earlier releases generated, so it removes old copies nobody edited (in former tool folders, at paths no tool reads any more, and old command files that used to need `--force`) and keeps and reports anything you changed. Files reached through a link, and folders whose move asks first (`.windsurf`), are never touched.
