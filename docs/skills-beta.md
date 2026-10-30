# OpenSpec beta skills

A shorter, easier-to-read set of OpenSpec skills, installed once for every coding agent on your machine. They sit beside today's skills under their own names (`openspec-beta`), and one command takes them away again.

## Try it

Before the beta is published, install the CLI from the branch:

```bash
npm i -g github:Fission-AI/OpenSpec#claude/openspec-skills-overhaul-1e6c68
openspec setup
```

Once it is published: `npm i -g @fission-ai/openspec@beta && openspec setup`.

If you installed OpenSpec as a standalone binary, the npm install sits beside it and both report the same version. Run `which -a openspec` (`Get-Command -All openspec` in PowerShell) and make sure the npm one comes first, or call it by its full path.

Run `openspec setup --dry-run` first to see what it would install and move. Start a new agent session afterwards.

Or install only the skills with `npx skills add "Fission-AI/OpenSpec#claude/openspec-skills-overhaul-1e6c68" -g` (you still need the CLI). To update, run the same command again.

## What you get

| Agent | Where | Start a workflow |
|---|---|---|
| Claude Code | an `openspec-beta` plugin | `/openspec-beta:propose` |
| Codex, Cursor, Gemini CLI, OpenCode, GitHub Copilot, and others that read `~/.agents/skills` | `~/.agents/skills/openspec-beta*` | `/openspec-beta-propose` (`$openspec-beta-propose` in Codex) |

Or ask in plain words ("plan this as an OpenSpec change"). The `openspec-beta` skill tells the agent what OpenSpec is and holds short guides it reads when needed: sizing a change, naming capabilities, decisions to raise, and how specs change. Explore keeps a living draft of the scope; propose turns the settled draft into the change. Specs are merged by apply's last task and by archive, so there is no separate sync skill. Setup moves your older OpenSpec skills and, when run inside a project, its `/opsx` command files into a backup, so you never see two copies.

## How it works

You say what you want. The agent picks the skill that fits, or you name one. Each skill is a short pointer into one `openspec-beta` skill that holds everything else:

```text
openspec-beta/
├── SKILL.md            what OpenSpec is, the agent's job, which skill to run, how to find the project, six principles
└── references/
    ├── propose.md, apply.md, archive.md, …   one skill's steps each
    └── changes.md, capabilities.md, decisions.md, deltas.md   short guides
openspec-beta-propose/SKILL.md   "read ../openspec-beta/SKILL.md, then follow references/propose.md"
```

The agent reads `SKILL.md` first, then the steps for its skill. It reads a guide only when a step reaches that kind of decision: sizing or splitting a change, naming a capability, raising a costly choice, or changing an existing spec without losing a requirement.

What to say:

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
- Claude Code, Codex, and Gemini CLI are tested with their real CLIs on macOS, Linux, and Windows. Cursor, OpenCode, and the other agents are covered by their documented `~/.agents/skills` support.
- `openspec init --tools <tool>` still installs per-project skills under today's names. They carry the same shorter steps as the beta, but not the router or its guides.

## Feedback

Open an issue at <https://github.com/Fission-AI/OpenSpec/issues> with what you asked for, what the agent did, and your agent and OS.
