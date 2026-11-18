---
"@fission-ai/openspec": patch
---

`openspec version --check` and `openspec update` no longer tell a Homebrew or Nix install to update with `npm install -g`, and no longer offer to run it. A Homebrew copy is reported as `homebrew` and told to run `brew upgrade openspec`; a Nix copy is reported as `nix` and gets no npm command.
