---
"@fission-ai/openspec": patch
---

### Bug Fixes

- `openspec completion install zsh` now writes its setup to `$ZDOTDIR/.zshrc` when `ZDOTDIR` is set, which is the file zsh actually reads. Before, it created a `~/.zshrc` that zsh never loaded, so completion silently didn't work in XDG-style setups such as Home Manager with `xdg.enable`. `completion uninstall zsh` cleans the same file, and also removes a block an earlier install left in `~/.zshrc`.
