# OpenSpec skills for skills.sh

Install the OpenSpec beta skills into any [skills.sh](https://skills.sh)-compatible agent, from your project:

```bash
npx skills add Fission-AI/OpenSpec -g -y && openspec update
```

`openspec update` removes the project's per-project OpenSpec skills, so your agent loads one set. They drive the `openspec` CLI (`npm i -g @fission-ai/openspec`); without it, they ask you to install it. To update the beta, run the first command again.

`openspec-beta/` is the router skill: its `SKILL.md` says what OpenSpec is, the principles every skill follows, and which file to read. Each skill's steps and a few short guides live in `openspec-beta/references/`. Each `openspec-beta-<skill>/` is a short pointer into it, so skills autocomplete (`/openspec-beta-propose`). Install them together.

To go back, or ask your agent to "remove OpenSpec beta" (the command is in `openspec-beta/references/install.md`):

```bash
npx skills remove -g -y openspec-beta openspec-beta-explore openspec-beta-propose openspec-beta-new openspec-beta-continue openspec-beta-ff openspec-beta-update openspec-beta-apply openspec-beta-verify openspec-beta-archive openspec-beta-bulk-archive openspec-beta-onboard && openspec update
```

A wildcard removes only the router, so every name is listed. `openspec update` writes the project's per-project skills back, byte for byte; your `openspec/` folder and the CLI are untouched.

**Upgrading from the earlier skills?** This folder used to hold `openspec-propose`, `openspec-apply-change` and the rest. `npx skills add` no longer touches them, so the copies an earlier run left on your machine stay until you remove them (`openspec update` prints the command for the ones it finds):

```bash
npx skills remove -g -y openspec-propose openspec-explore openspec-new-change openspec-continue-change openspec-apply-change openspec-update-change openspec-ff-change openspec-sync-specs openspec-archive-change openspec-bulk-archive-change openspec-verify-change openspec-onboard draft-openspec-docs release-openspec verify-openspec-docs write-openspec-docs
```

> These files are generated from the skill templates — do not edit by hand. Run
> `pnpm build && pnpm generate:skills` after changing a template;
> `skillssh-parity.test.ts` fails if they drift.
