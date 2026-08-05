---
"@fission-ai/openspec": minor
---

Make GitHub Copilot cloud coding-agent files opt-in. Selecting the `github-copilot` tool no longer silently writes a GitHub Actions workflow into `.github/`; `openspec init` now asks first (default No) and remembers the choice in `openspec/config.yaml` (`githubCopilot.cloudAgent`). Use `--copilot-cloud` / `--no-copilot-cloud` to decide non-interactively.

- `openspec update` never prompts — it only refreshes cloud files for projects that opted in (or that already have generated cloud files, so existing setups keep working).
- Opting out (`--no-copilot-cloud` or `cloudAgent: false`) removes OpenSpec-managed cloud files; a user-customized file is always preserved, never overwritten or deleted.
- `init` and `update` now report whether cloud files were written, skipped, or left untouched — and if you already have your own `copilot-setup-steps.yml`, they say it was preserved and that you need to add the OpenSpec install step by hand.
