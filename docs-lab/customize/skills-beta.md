# Beta skills

> Try the shorter, easier-to-read OpenSpec skills, and go back with one command.

The beta skills are a new set of OpenSpec skills: one `openspec-beta` skill that explains OpenSpec, and a short skill per workflow that points into it. They drive the same `openspec` CLI, and they replace today's skills while they're installed, so your agent loads one set, never both.

## Try it

You need the OpenSpec CLI (`npm i -g @fission-ai/openspec`). Then, in your project:

```bash
npx skills add Fission-AI/OpenSpec -g -y && openspec update
```

The first command installs the beta where your agents read skills (`~/.claude/skills` for Claude Code, `~/.agents/skills` for Codex, Cursor, GitHub Copilot and the other tools that read it). The second switches the project over. Start a new agent session afterwards. To update the beta later, run the first command again.

## Go back

```bash
npx skills remove -g -y openspec-beta openspec-beta-explore openspec-beta-propose openspec-beta-new openspec-beta-continue openspec-beta-ff openspec-beta-update openspec-beta-apply openspec-beta-verify openspec-beta-archive openspec-beta-bulk-archive openspec-beta-onboard && openspec update
```

Or ask your agent to "remove OpenSpec beta": the skills carry this exact command. Every name is listed because a wildcard would remove only `openspec-beta`.

## What happens to today's skills

| | While the beta is installed | Once it's removed |
|---|---|---|
| A project's skills and commands (`.claude/skills/openspec-*`, `/opsx` commands) | `openspec update` removes them; `openspec init` writes none | `openspec update` writes them back, byte for byte |
| MiniMax Code, whose skills live in `~/.minimax/skills` for every project | switched for the whole machine | any project's `openspec update` brings them back |
| A tool that can't see the beta | left as it is | left as it is |

Only the files `openspec update` already rewrites on every run are removed. Other projects switch the next time you run `openspec update` in them. After you go back, `openspec update` names any project that still needs it.

Which tools were switched is remembered in your [global config](../reference/configuration/config-json.md), never in the project. So if a project's skills are committed, the switch shows them as deleted in git: commit that to switch the whole team, or don't, to keep them for teammates.

If an earlier `npx skills add` installed today's skills in your home folder, `openspec update` prints the `npx skills remove` command for them. The skills CLI installed those copies, so it's the one to remove them.

## How the skills fit together

```text
openspec-beta/
├── SKILL.md            what OpenSpec is, which skill to run, how to find the project, eight principles
└── references/
    ├── propose.md, apply.md, archive.md, …   one workflow's steps each
    ├── changes.md, capabilities.md, decisions.md, specs.md, deltas.md   short guides
    └── install.md      how to update or remove these skills
openspec-beta-propose/SKILL.md   "read ../openspec-beta/SKILL.md, then follow references/propose.md"
```

| You want | Say |
|---|---|
| to think something through | `/openspec-beta-explore should exports be CSV or JSON?` |
| a plan | `/openspec-beta-propose todos need an optional due date` |
| the plan built | `/openspec-beta-apply` |
| to close it out | `/openspec-beta-archive` |

Planning skills stop at the plan, even when you also ask to build it. Start apply in your next message.

## Known limits

- Measured with Claude Code on Sonnet and Haiku. Other agents read the same standard folders, but whether a given one honors them is up to that agent.
- A tool is switched only where the beta actually is. If it's installed somewhere a tool doesn't read, that tool keeps today's skills.

Feedback: [open an issue](https://github.com/Fission-AI/OpenSpec/issues) with what you asked for, what the agent did, and your agent and OS.
