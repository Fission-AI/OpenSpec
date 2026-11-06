# Updating or removing these skills

These skills come from `npx skills add`, separately from the `openspec` CLI. Change them only when the user asks.

- **Update:** `npx skills add Fission-AI/OpenSpec -g -y` installs the latest of them over these.
- **Remove:** `npx skills remove -g -y Fission-AI/OpenSpec` removes every skill the skills CLI installed from that repository: these 12, and any copies of the earlier `openspec-*` skills an older install left behind.

After removing them, run `openspec update` in the project: while these are installed it gives the project no per-project OpenSpec skills, so the agent loads one set, and once these are gone it writes them back. Neither touches `openspec/` or the CLI.
