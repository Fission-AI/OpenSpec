# OpenSpec beta skills

A shorter, easier-to-read set of OpenSpec skills, installed once for every coding agent on your machine. They sit beside today's skills under their own names (`openspec-beta`), and one command takes them away again.

## Try it

Until a new beta is published, install from the default branch — `openspec setup`
arrives with this work, so no released version has it yet:

```bash
npm i -g github:Fission-AI/OpenSpec
openspec setup
```

Do not use `@fission-ai/openspec@beta` for this: that tag still points at
`1.6.0-beta.1` from July, which would downgrade you and has no `openspec setup`.
Once a new beta ships, `npm i -g @fission-ai/openspec@beta` is the command.

If you installed OpenSpec as a standalone binary, the npm install sits beside it and both report the same version. Run `which -a openspec` (`Get-Command -All openspec` in PowerShell) and make sure the npm one comes first, or call it by its full path.

Run `openspec setup --dry-run` first to see what it would install and move. Start a new agent session afterwards.

Or install only the skills with `npx skills add Fission-AI/OpenSpec -g` (you still need the CLI). To update, run the same command again.

That route installs the beta beside anything already on your machine, so if an earlier `npx skills add` put `openspec-propose` and the rest there, your agent now sees two OpenSpec skill sets. `openspec setup` moves aside only skills OpenSpec itself wrote, through `init`, `update` or `setup`; a copy `npx skills add` left under the older names is not one of those, so remove it yourself:

```bash
npx skills remove -g -y openspec-propose openspec-explore openspec-new-change openspec-continue-change openspec-apply-change openspec-update-change openspec-ff-change openspec-sync-specs openspec-archive-change openspec-bulk-archive-change openspec-verify-change openspec-onboard draft-openspec-docs release-openspec verify-openspec-docs write-openspec-docs
```

## What you get

| Agent | Where | Start a workflow |
|---|---|---|
| Claude Code | an `openspec-beta` plugin | `/openspec-beta:propose` |
| Any other agent | `~/.agents/skills/openspec-beta*` | `/openspec-beta-propose` (`$openspec-beta-propose` in Codex) |

`~/.agents/skills` is the standard Agent Skills folder, so setup writes it whether or not it recognises an agent on your machine: an agent you install later finds the skills without re-running anything, and one OpenSpec has never heard of works as long as it follows the convention. There is only ever one copy, which is what keeps a harness that reads both its own folder and the standard one from finding the same skill twice and warning about it ([#2180](https://github.com/Fission-AI/OpenSpec/issues/2180)). Claude Code is the exception: it does not read that folder, so it gets a plugin instead.

Or ask in plain words ("plan this as an OpenSpec change"). The `openspec-beta` skill tells the agent what OpenSpec is and holds short guides it reads when needed: sizing a change, naming capabilities, decisions to raise, writing a requirement, and how specs change. Explore keeps a living draft of the scope; propose turns the settled draft into the change. Specs are merged by apply's last task and by archive, so there is no separate sync skill. Setup moves the skills OpenSpec wrote itself and, when run inside a project, its `/opsx` command files into a backup, so those never load twice.

## How it works

You say what you want. The agent picks the skill that fits, or you name one. Each skill is a short pointer into one `openspec-beta` skill that holds everything else:

```text
openspec-beta/
├── SKILL.md            what OpenSpec is, the agent's job, which skill to run, how to find the project, eight principles
└── references/
    ├── propose.md, apply.md, archive.md, …   one skill's steps each
    └── changes.md, capabilities.md, decisions.md, specs.md, deltas.md   short guides
openspec-beta-propose/SKILL.md   "read ../openspec-beta/SKILL.md, then follow references/propose.md"
```

The agent reads `SKILL.md` first, then the steps for its skill. It reads a guide only when a step reaches that kind of decision: sizing or splitting a change, naming a capability, raising a costly choice, writing a requirement, or changing an existing spec without losing a requirement.

What to say (in Claude Code the skills are namespaced by the plugin, so it is `/openspec-beta:explore` and so on):

| You want | Say |
|---|---|
| to think something through | `/openspec-beta-explore should exports be CSV or JSON?` |
| a plan | `/openspec-beta-propose todos need an optional due date` |
| the plan built | `/openspec-beta-apply` |
| to close it out | `/openspec-beta-archive` |
| several things | in one message, in order: "archive the finished change, then plan due dates" |

Planning skills stop at the plan, even when you also ask to build it; start apply in your next message.

## Go back

```bash
openspec setup --revert
npm i -g @fission-ai/openspec@latest
```

`--revert` removes the plugin and the beta skills and moves every backed-up file back where it was. If you installed the skills with `npx skills add` instead, remove them by name (a wildcard removes only the router):

```bash
npx skills remove -g -y openspec-beta openspec-beta-apply openspec-beta-archive openspec-beta-bulk-archive openspec-beta-continue openspec-beta-explore openspec-beta-ff openspec-beta-new openspec-beta-onboard openspec-beta-propose openspec-beta-update openspec-beta-verify
```

## Known limits

- Plans are as good as today's or slightly better, at about the same token cost.
- Claude Code, Codex, and Gemini CLI are tested with their real CLIs on macOS, Linux, and Windows. Every other agent reads the same standard folder, so there is nothing agent-specific to test, but whether a given one honours the convention is its own to say.
- `openspec init --tools <tool>` still installs per-project skills under today's names, with the same text as the previous release: `init` and `update` write byte for byte what `main` writes. The shorter steps, the router and its guides are the machine install only.

## Feedback

Open an issue at <https://github.com/Fission-AI/OpenSpec/issues> with what you asked for, what the agent did, and your agent and OS.
