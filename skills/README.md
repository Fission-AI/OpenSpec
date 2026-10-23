# OpenSpec skills for skills.sh

Install the OpenSpec skills into any [skills.sh](https://skills.sh)-compatible agent:

```bash
npx skills add Fission-AI/OpenSpec
```

`openspec-beta/` is the router skill: its `SKILL.md` says what OpenSpec is, the
principles every skill follows, and which file to read. Each skill's steps and
a few short guides live in `openspec-beta/references/`. Each
`openspec-beta-<skill>/` is a short pointer into it, so skills autocomplete
(`/openspec-beta-propose`). Install them together.

The skills drive the `openspec` CLI. To install the CLI and the skills for
every agent on your machine at once:

```bash
npm i -g @fission-ai/openspec@beta && openspec setup
```

To go back:

- Installed with `openspec setup`: run `openspec setup --revert`. It removes these
  skills and restores what setup moved aside.
- Installed with `npx skills add`: remove them by name (a wildcard removes only
  the router):

  ```bash
  npx skills remove -g -y openspec-beta openspec-beta-apply openspec-beta-archive openspec-beta-bulk-archive openspec-beta-continue openspec-beta-explore openspec-beta-ff openspec-beta-new openspec-beta-onboard openspec-beta-propose openspec-beta-update openspec-beta-verify
  ```

> These files are generated from the skill templates — do not edit by hand. Run
> `pnpm build && pnpm generate:skills` after changing a template;
> `skillssh-parity.test.ts` fails if they drift.
