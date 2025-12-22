---
"@fission-ai/openspec": minor
---

### New Features
- Add `openspec config` command for managing global configuration settings
- Implement global config directory with XDG Base Directory specification support
- Add Oh-my-zsh shell completions support for enhanced CLI experience

### Bug Fixes
- Fix hang in pre-commit hooks by using dynamic imports
- Respect XDG_CONFIG_HOME environment variable on all platforms
- Resolve Windows compatibility issues in zsh-installer tests
- Align cli-completion spec with implementation
- Remove hardcoded agent field from slash commands

### Documentation
- Alphabetize AI tools list in README and make it collapsible
