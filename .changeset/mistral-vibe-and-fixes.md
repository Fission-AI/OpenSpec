---
"@fission-ai/openspec": minor
---

### New Features

- **Mistral Vibe support** — OpenSpec can now initialize Mistral Vibe as a supported skills-only tool using `.vibe/skills/`

### Bug Fixes

- **Case-insensitive requirement headers** — Requirement headers are now parsed regardless of capitalization, so specs no longer fail to parse over header casing
- **Zsh completions on oh-my-zsh** — Fixed shell completion setup so tab completion installs correctly under oh-my-zsh's `compinit`

### Other

- **Clearer validation hints** — When a requirement has SHALL/MUST only in its header, `openspec validate` now points you to move the keyword onto the requirement body line instead of showing the generic error
