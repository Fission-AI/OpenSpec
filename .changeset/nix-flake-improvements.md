---
"@fission-ai/openspec": patch
---

### Improvements

- **Nix flake maintenance** — Version now read dynamically from package.json, reducing manual sync issues
- **Nix build optimization** — Source filtering excludes node_modules and artifacts, improving build times
- **update-flake.sh script** — Detects when hash is already correct, skipping unnecessary rebuilds

### Other

- Updated Nix CI actions to latest versions (nix-installer v21, magic-nix-cache v13)
