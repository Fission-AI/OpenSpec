# OpenSpec beta skills

A shorter, easier-to-read set of OpenSpec skills, installed once for every coding agent on your machine. They sit beside today's skills under their own names (`openspec-beta`), and one command takes them away again.

## Try it

Before the beta is published, install the CLI from the branch:

```bash
npm i -g github:Fission-AI/OpenSpec#claude/openspec-skills-overhaul-1e6c68
openspec setup
```

Once it is published: `npm i -g @fission-ai/openspec@beta && openspec setup`.

Run `openspec setup --dry-run` first to see what it would install and move. Start a new agent session afterwards.

## What you get

| Agent | Where | Start a workflow |
|---|---|---|
| Claude Code | an `openspec-beta` plugin | `/openspec-beta:propose` |
| Codex, Cursor, Gemini CLI, OpenCode, GitHub Copilot, and others that read `~/.agents/skills` | `~/.agents/skills/openspec-beta*` | `/openspec-beta-propose` (`$openspec-beta-propose` in Codex) |

Or ask in plain words ("plan this as an OpenSpec change"). Explore keeps a living draft of the scope; propose turns the settled draft into the change. Setup moves your older OpenSpec skills and, when run inside a project, its `/opsx` command files into a backup, so you never see two copies.

## Go back

```bash
openspec setup --revert
npm i -g @fission-ai/openspec@latest
```

`--revert` removes the plugin and the beta skills and moves every backed-up file back where it was. If you installed the skills with `npx skills add` instead, remove them by name (a wildcard removes only the router):

```bash
npx skills remove -g -y openspec-beta openspec-beta-apply openspec-beta-archive openspec-beta-bulk-archive openspec-beta-continue openspec-beta-explore openspec-beta-ff openspec-beta-new openspec-beta-onboard openspec-beta-propose openspec-beta-sync openspec-beta-update openspec-beta-verify
```

## Known limits

- Plans are as good as today's, not better; planning uses about 5–10% more tokens.
- Claude Code, Codex, and Gemini CLI are tested with their real CLIs on macOS, Linux, and Windows. Cursor, OpenCode, and the other agents are covered by their documented `~/.agents/skills` support.
- `openspec init --tools <tool>` still installs today's per-project skills.

## Feedback

Open an issue at <https://github.com/Fission-AI/OpenSpec/issues> with what you asked for, what the agent did, and your agent and OS.
