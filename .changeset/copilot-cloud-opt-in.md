---
"@fission-ai/openspec": minor
---

Make GitHub Copilot cloud coding-agent files opt-in. Selecting the `github-copilot` tool no longer silently writes a GitHub Actions workflow into `.github/`; `openspec init` now asks first (default No) and remembers the choice in `openspec/config.yaml` (`githubCopilot.cloudAgent`). Use `--copilot-cloud` / `--no-copilot-cloud` to decide non-interactively. `openspec update` never prompts — it only refreshes cloud files for projects that opted in (or that already have generated cloud files, so existing setups keep working). User-customized cloud files continue to be preserved and are never overwritten or deleted.
