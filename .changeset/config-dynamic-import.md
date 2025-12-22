---
"@fission-ai/openspec": patch
---

Fix pre-commit hook hang issue in config command by using dynamic import for @inquirer/prompts

The config command was causing pre-commit hooks to hang indefinitely due to stdin event listeners being registered at module load time. This fix converts the static import to a dynamic import that only loads inquirer when the `config reset` command is actually used interactively.

Also adds ESLint with a rule to prevent static @inquirer imports, avoiding future regressions.
