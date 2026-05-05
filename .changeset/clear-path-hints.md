---
"@fission-ai/openspec": patch
---

### Bug Fixes

- **CLI path visibility**: OpenSpec now documents editor and agent PATH mismatches, warns during global installs when the detected CLI bin directory is not on PATH, and generates workflow skills with guidance for resolving `openspec` through `OPENSPEC_BIN` or an absolute path.
