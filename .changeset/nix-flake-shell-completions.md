---
'@fission-ai/openspec': patch
---

Install shell completions with the Nix flake package ([#1785](https://github.com/Fission-AI/OpenSpec/pull/1785)). The package now ships bash, zsh and fish completions in their standard `share/` locations, so Nix users get tab completion without running `openspec completion install` against their home directory.
