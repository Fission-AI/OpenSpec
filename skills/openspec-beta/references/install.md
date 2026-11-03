# Updating or removing these skills

These skills come from `npx skills add`, separately from the `openspec` CLI. Change them only when the user asks.

- **Update:** `npx skills add Fission-AI/OpenSpec -g -y` installs the latest of them over these.
- **Remove:** `npx skills remove -g -y openspec-beta openspec-beta-explore openspec-beta-propose openspec-beta-new openspec-beta-continue openspec-beta-ff openspec-beta-update openspec-beta-apply openspec-beta-verify openspec-beta-archive openspec-beta-bulk-archive openspec-beta-onboard` removes exactly these. A wildcard would remove only `openspec-beta`.

Neither touches the project: `openspec/`, the CLI, and any per-project OpenSpec skills (`openspec-propose` and the rest) stay as they are.
