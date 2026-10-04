---
"@fission-ai/openspec": patch
---

The specs instruction now tells the agent to write each capability's spec file as soon as it has drafted it, announcing each one first, instead of planning all of them before writing any. A change with many capabilities no longer sits silent until every file is planned, and an interrupted run keeps the files it already wrote. Because `specs` reads `done` once any spec file exists, `/opsx:continue` now checks for capabilities in the proposal that still have no spec file and writes those before moving on.
