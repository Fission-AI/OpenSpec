---
'@fission-ai/openspec': patch
---

Make `openspec completion uninstall zsh` hand `.zshrc` back exactly as `completion install zsh` found it. Uninstall stripped every blank line at the top of the file, so a `.zshrc` that started with blank lines lost them after an install/uninstall round trip, even when the OpenSpec block had been moved further down. Uninstall now drops only the separator line install added, and only when the block sits at the top of the file, matching the bash installer.
