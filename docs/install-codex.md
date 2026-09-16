# Install and Use OpenSpec in Codex

This guide installs the OpenSpec skill set — including `openspec-autonomous-apply` — into a project for use with [OpenAI Codex](https://openai.com/index/introducing-codex/) (CLI or web).

## Prerequisites

- Node.js 18+ and `npx` available.
- Codex CLI installed (`codex` command available) or Codex web connected to the repository.
- Your project initialized as a git repository.

## Install the Skills

From your project root:

```bash
npx openspec@latest init --tools codex
```

This installs the **core** workflow skills into `.agents/skills/` plus the project's `openspec/` scaffolding.

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

then re-run `npx openspec@latest init --tools codex` (or `openspec update`). Verify the generated file exists:

```bash
ls .agents/skills/openspec-autonomous-apply/SKILL.md
```

## Using `openspec-autonomous-apply` in Codex

Invoke it as a project skill:

> "Run the OpenSpec autonomous-apply skill for my change."

### Behavioral Differences vs Claude Code

- **Worktree isolation**: Codex has no built-in `Agent(isolation="worktree")` flag. The skill instructs each subagent to `cd` into the worktree at `.agents/worktrees/openspec-<change-name>/` before any file operation; this is a documented discipline, not a hard filesystem boundary. Review the worktree diff yourself before merging.
- **Concurrency cap**: Codex has no external `Workflow` primitive; the skill limits concurrency by chunking subagent mentions (2 at a time by default, hard max 4). To skip the interactive prompt, set in `openspec/config.yaml`:

  ```yaml
  agent:
    max_parallel_requests: 4
  ```

- **Review mode / merge strategy**: the skill uses sequential question prompts, identical to Claude Code — review mode first, then merge strategy.

## Making It Project-Local (Recommended)

Committing `.agents/skills/` and `openspec/` means every Codex contributor gets identical skill behavior. The profile config (`~/.config/openspec/config.json`) is per-user; document the custom-profile snippet in your contributor guide if you want `autonomous-apply` for everyone.

## Uninstall / Reset

```bash
rm -rf .agents/skills/openspec-*
rm -rf openspec/changes/<your-change-name>
git worktree remove .agents/worktrees/openspec-<change-name>/ 2>/dev/null
```
