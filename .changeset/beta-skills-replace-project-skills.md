---
"@fission-ai/openspec": minor
---

With the `openspec-beta` skills installed (`npx skills add Fission-AI/OpenSpec`), `openspec init` and `openspec update` no longer give a tool that can see them a second set of OpenSpec skills and commands: `init` writes none, and `update` removes the ones it wrote. Remove the beta and run `openspec update`, and they come back byte for byte. For MiniMax Code, whose OpenSpec skills live in the home folder for every project, the switch is machine-wide. Which tools were switched is remembered in the user's config, never in the project, and a tool that cannot see the beta is left as it is. If an earlier `npx skills add` left today's skills in the home folder, `update` prints the `npx skills remove` command for them. Without the beta installed, nothing changes.
