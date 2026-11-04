# OpenSpec beta skills

A shorter, easier-to-read set of OpenSpec skills. They sit beside today's skills under their own names (`openspec-beta`), drive the same `openspec` CLI you already have, and one command takes them away again.

## Try it

You need the OpenSpec CLI (`npm i -g @fission-ai/openspec`). Then, in your project:

```bash
npx skills add Fission-AI/OpenSpec -g -y && openspec update
```

The first command installs the beta skills where your agents read them (for Claude Code, `~/.claude/skills`). The second removes the project's per-project OpenSpec skills, so your agent loads one set: the beta. New projects need nothing extra, because `openspec init` gives them no per-project skills while the beta is installed. Other projects switch the next time you run `openspec update` in them. Start a new agent session afterwards. To update the beta, run the first command again.

## Go back

```bash
npx skills remove -g -y openspec-beta openspec-beta-explore openspec-beta-propose openspec-beta-new openspec-beta-continue openspec-beta-ff openspec-beta-update openspec-beta-apply openspec-beta-verify openspec-beta-archive openspec-beta-bulk-archive openspec-beta-onboard && openspec update
```

Or ask your agent to "remove OpenSpec beta": the skills carry this exact command. The first part removes those 12 skill folders and nothing else; `openspec update` writes the project's per-project skills back, byte for byte, and names any other project that still needs it. Every name is listed because a wildcard would remove only `openspec-beta`.

## What happens to today's skills

| | While the beta is installed | Once it's removed |
|---|---|---|
| A project's skills and commands (`.claude/skills/openspec-*`, `/opsx` commands) | `openspec update` removes them; `openspec init` writes none | `openspec update` writes them back, byte for byte |
| MiniMax Code, whose skills live in `~/.minimax/skills` for every project | switched for the whole machine | any project's `openspec update` brings them back |
| A tool that can't see the beta | left as it is | left as it is |

Only the files `openspec update` already rewrites on every run are removed. Which tools were switched is remembered in your own OpenSpec config, never in the project. So if a project's skills are committed, the switch shows them as deleted: commit that to switch the whole team, or leave it uncommitted to keep them for teammates.

If an earlier `npx skills add` installed today's skills in your home folder, `openspec update` prints the command to remove them. The skills CLI installed them, so it's the one to remove them:

```bash
npx skills remove -g -y openspec-propose openspec-explore openspec-new-change openspec-continue-change openspec-apply-change openspec-update-change openspec-ff-change openspec-sync-specs openspec-archive-change openspec-bulk-archive-change openspec-verify-change openspec-onboard
```

## How it works

You say what you want. The agent picks the skill that fits, or you name one. Each skill is a short pointer into one `openspec-beta` skill that holds everything else:

```text
openspec-beta/
├── SKILL.md            what OpenSpec is, the agent's job, which skill to run, how to find the project, eight principles
└── references/
    ├── propose.md, apply.md, archive.md, …   one skill's steps each
    ├── changes.md, capabilities.md, decisions.md, specs.md, deltas.md   short guides
    └── install.md      how to update or remove these skills
openspec-beta-propose/SKILL.md   "read ../openspec-beta/SKILL.md, then follow references/propose.md"
```

The agent reads `SKILL.md` first, then the steps for its skill. It reads a guide only when a step reaches that kind of decision: sizing or splitting a change, naming a capability, raising a costly choice, writing a requirement, or changing an existing spec without losing a requirement.

| You want | Say |
|---|---|
| to think something through | `/openspec-beta-explore should exports be CSV or JSON?` |
| a plan | `/openspec-beta-propose todos need an optional due date` |
| the plan built | `/openspec-beta-apply` |
| to close it out | `/openspec-beta-archive` |
| several things | in one message, in order: "archive the finished change, then plan due dates" |

Planning skills stop at the plan, even when you also ask to build it; start apply in your next message.

## Known limits

- Measured with Claude Code on Sonnet and Haiku. Other agents read the same standard folder, but whether a given one honours it is its own to say.
- Requirement and decision IDs (`[AUTH-3]`, `### D1`) are written by the skills; renaming a requirement by its ID needs a CLI that matches on IDs (#1979).

## Feedback

Open an issue at <https://github.com/Fission-AI/OpenSpec/issues> with what you asked for, what the agent did, and your agent and OS.
