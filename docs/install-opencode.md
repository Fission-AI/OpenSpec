# Install and Use OpenSpec in OpenCode

This guide installs the OpenSpec skill set — invoked as `openspec-autonomous-apply` — into a project for use with [OpenCode](https://opencode.ai/).

## Prerequisites

- Node.js 18+ and `npx` available.
- OpenCode CLI installed (`opencode`).
- Your project initialized as a git repository.

## Install the Skills

From your project root:

```bash
npx openspec@latest init --tools opencode
```

This installs the **core** workflow skills into `.opencode/skills/` plus the project's `openspec/` scaffolding.

The autonomous-apply skill is **opt-in** — registered but excluded from the default core profile. To install it, select the `custom` profile with the full workflow list in `~/.config/openspec/config.json`:

```json
{
  "profile": "custom",
  "workflows": [
    "propose", "explore", "new", "continue", "apply", "update",
    "ff", "sync", "archive", "bulk-archive", "verify", "onboard",
    "autonomous-apply"
  ]
}
```

then re-run `npx openspec@latest init --tools opencode` (or `openspec update`).

OpenCode only picks up project `.opencode/skills/` when the directory is registered in `~/.config/opencode/opencode.json`. Ensure this entry exists (OpenSpec init normally configures it; verify if unsure):

```json
{
  "skills": {
    "paths": [".opencode/skills"]
  }
}
```

Restart OpenCode after editing `opencode.json`.

## Using `openspec-autonomous-apply` in OpenCode

OpenCode reads `.opencode/skills/*/SKILL.md` files as invocable skills by their `name:` frontmatter:

```
/skill openspec-autonomous-apply
```

(or mention it: "use the openspec-autonomous-apply skill").

### Behavioral Differences vs Claude Code

- **Worktree isolation**: OpenCode has no built-in agent-isolation flag. The skill requires the implementation subagent to `cd` into `.opencode/worktrees/openspec-<change-name>/` before any file operation; this is a documented contract, not a hard filesystem boundary. Always review the worktree diff before merging.
- **Concurrency cap**: the skill chunks concurrent reviewer agents to 2 at a time by default (hard max 4). To skip the interactive prompt, set in `openspec/config.yaml`:

  ```yaml
  agent:
    max_parallel_requests: 4
  ```

- **Review mode / merge strategy**: the skill uses sequential question prompts: review mode first, then merge strategy, never batched.

## Making It Project-Local (Recommended)

Committing `.opencode/skills/` and `openspec/` makes every contributor's environment identical. The `~/.config/opencode/opencode.json` entry and the OpenSpec profile config are per-user, so document both snippets above in your contributor guide if the whole team should have `autonomous-apply`.

## Uninstall / Reset

```bash
rm -rf .opencode/skills/openspec-*
rm -rf openspec/changes/<your-change-name>
git worktree remove .opencode/worktrees/openspec-<change-name>/ 2>/dev/null
```
