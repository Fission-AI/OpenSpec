# Supported Tools

OpenSpec works with many AI coding assistants. When you run `openspec init`, OpenSpec configures selected tools using your active profile/workflow selection and delivery mode.

## How It Works

For each selected tool, OpenSpec can install:

1. **Skills** (if delivery includes skills): `.../skills/openspec-*/SKILL.md`
2. **Commands** (if delivery includes commands): tool-specific `opsx-*` command files

Codex is skills-only: OpenSpec installs `.agents/skills/openspec-*/SKILL.md` for Codex even when delivery is set to `commands`, and it does not generate Codex custom prompt files. Existing OpenSpec-managed skills under the legacy `.codex/skills` path are reconciled after their replacements are written; custom and divergent files are preserved.

By default, OpenSpec uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `update`
- `sync`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`) via `openspec config profile`, then run `openspec update`.

## How To Invoke

These docs use `/opsx:propose` as the canonical name, but each tool spells it the
way it loads the file OpenSpec wrote. Find your tool's command path in the
[Tool Directory Reference](#tool-directory-reference) below, then match its shape here.

| Command file OpenSpec writes | You type | Tools |
|------------------------------|----------|-------|
| `.../commands/opsx/<id>.*` — an `opsx/` folder namespaces it | `/opsx:<id>` | Claude Code, CodeBuddy, Crush, Gemini CLI, Lingma, Qoder, ZCode |
| `.../opsx-<id>.*` — the filename is the command | `/opsx-<id>` | Every other tool with generated command files, except Amazon Q and Devin |
| `.devin/workflows/opsx-<id>.md` — read by only one of Devin's two agents | `/opsx-<id>` on Devin Desktop, `/openspec-<skill>` on Devin Local | Devin Desktop\*\*\*\* |
| `.amazonq/prompts/opsx-<id>.md` — a prompt, not a command | `@opsx-<id>` | Amazon Q Developer |
| none — skills only | `/openspec-<skill>` | CodeArts, ForgeCode, Hermes, MiniMax Code, Mistral Vibe, Zed Agent, shared `.agents` |
| none — Kimi Code | `/skill:openspec-<skill>` | Kimi Code |
| none — Codex CLI | `$openspec-<skill>` | Codex ([`/openspec-<skill>` is not recognized](https://github.com/openai/codex/issues/11817)) |

So `/opsx:propose` is `/opsx-propose` in Cursor, `@opsx-propose` in Amazon Q, and
`$openspec-propose` in Codex.

Two things vary independently, which is why the rows do not collapse:

- **The name.** Rows 1–2 differ only in how the file names the command, and the
  `opsx-<id>` / `opsx:<id>` stem is the same for every tool with generated
  command files.
- **The wrapper.** Amazon Q loads its files into a prompt library invoked with
  `@`. Skills-only tools generate no command files at all, so their last three
  rows use *skill* names — listed under
  [Generated Skill Names](#generated-skill-names) — which do not map one-to-one
  onto command ids (`/opsx:apply` is the `openspec-apply-change` skill).

The command path patterns above are extension-neutral (`.*`) on purpose: the
extension is the tool's (`.toml` for Gemini CLI, `.prompt` for Continue,
`.prompt.md` for Kiro and GitHub Copilot), and a few tools show the name with
its extension in the picker. Match the directory shape, not the extension.

The files OpenSpec generates, and the "Getting started" hint printed after setup,
already use the right form for the tools you selected — so the fastest answer is
to read the hint.

## Tool Directory Reference

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Antigravity (`antigravity`) | `.agents/skills/openspec-*/SKILL.md` | `.agents/workflows/opsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/openspec-*/SKILL.md` | `.bob/commands/opsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| Command Code (`command-code`) | `.commandcode/skills/openspec-*/SKILL.md` | `.commandcode/commands/opsx-<id>.md` |
| CodeArts (`codeartsagent`) | `.codeartsdoer/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex (`codex`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (skills-only; use `$openspec-*`) |
| Devin Desktop, formerly Windsurf (`devin`) | `.devin/skills/openspec-*/SKILL.md` | `.devin/workflows/opsx-<id>.md`\*\*\*\* |
| ForgeCode (`forgecode`) | `.forge/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Continue (`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| Hermes Agent (`hermes`) | `.hermes/skills/openspec-*/SKILL.md`\*\*\* | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/openspec-*/SKILL.md` | `.junie/commands/opsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kimi Code (`kimi`) | `.kimi-code/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/skill:openspec-*` invocations) |
| Kiro (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| Lingma (`lingma`) | `.lingma/skills/openspec-*/SKILL.md` | `.lingma/commands/opsx/<id>.md` |
| MiniMax Code (`minimax-code`) | `~/.minimax/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use MiniMax Code skills) |
| Mistral Vibe (`vibe`) | `.vibe/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Oh My Pi (`oh-my-pi`) | `.omp/skills/openspec-*/SKILL.md` | `.omp/commands/opsx-<id>.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.md` |
| [Rovo Dev CLI](https://support.atlassian.com/rovo/docs/use-rovo-dev-cli/) (`rovodev`) | `.rovodev/skills/openspec-*/SKILL.md` | Not generated. Rovo has no slash-command surface — it matches skills automatically or by prompt (e.g. "use the openspec-propose skill"); `/skills` only manages them. Generated content references skills by name, never as `/openspec-*` commands. |
| [Zoo Code](https://github.com/Zoo-Code-Org/Zoo-Code) (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/openspec-*/SKILL.md` | `.trae/commands/opsx-<id>.md` |
| [Zed Agent](https://zed.dev/docs/ai/skills) (`zed`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (skills-only; use `/openspec-*` or `@openspec-*`) |
| ZCode (`zcode`) | `.zcode/skills/openspec-*/SKILL.md` | `.zcode/commands/opsx/<id>.md` |
| Shared `.agents` skills (`agents`) | `.agents/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |

\*\* GitHub Copilot prompt files are recognized as custom slash commands in IDE extensions (VS Code, JetBrains, Visual Studio). Copilot CLI does not currently consume `.github/prompts/*.prompt.md` directly. Selecting `github-copilot` can also set up the GitHub-hosted **cloud coding agent** — see [GitHub Copilot cloud coding agent](#github-copilot-cloud-coding-agent) below.

\*\*\* Hermes loads skills from `~/.hermes/skills/` by default. To use project-local OpenSpec skills, add the project `.hermes/skills/` directory to `skills.external_dirs` in `~/.hermes/config.yaml`; Hermes then exposes skills with user-facing slash invocations such as `/openspec-propose`.

\*\*\*\* Windsurf was [rebranded to Devin Desktop](https://docs.devin.ai/desktop/devin-desktop-faq) on June 2, 2026, and its config directory moved: `.devin/` is the preferred read + write location, `.windsurf/` a legacy read-only fallback. OpenSpec follows the rename — the tool id is `devin`, and `--tools windsurf` still resolves to it so existing setup scripts keep working. A project still holding OpenSpec files in `.windsurf/` is offered the move on the next `openspec update`; declining leaves them in place, and files you wrote yourself are never touched. Workflows are invoked by filename, so `.devin/workflows/opsx-apply.md` is `/opsx-apply`. The [Devin Local agent does not support workflows](https://docs.devin.ai/desktop/devin-local) — only skills, and it does not read `.windsurf/` at all — so whenever OpenSpec writes Devin skills it keeps their bodies, and the getting-started hint, on `/openspec-*` skill invocations, which work on both agents. Under commands-only delivery no skills are written and both fall back to `/opsx-*`.

MiniMax Code is a global skills-only integration. OpenSpec writes only its
`openspec-*` directories under `~/.minimax/skills/`; it does not create
repo-local `.minimax` or `.mavis` directories. Commands-only delivery leaves
existing global MiniMax Code skills untouched so one project's delivery setting
cannot remove skills used by another project.

### GitHub Copilot cloud coding agent

GitHub's [Copilot coding agent](https://docs.github.com/en/copilot/using-github-copilot/coding-agent) runs on GitHub in a GitHub Actions environment — separate from Copilot in your editor. OpenSpec can set it up to use the OpenSpec CLI by generating two files:

- `.github/workflows/copilot-setup-steps.yml` — installs `@fission-ai/openspec` in the agent's environment
- `.github/agents/openspec.agent.md` — tells the agent how to drive OpenSpec

Because this writes a GitHub Actions workflow into your repository, it is **opt-in**:

| How | Behavior |
|-----|----------|
| `openspec init` (interactive) | Asks whether to set up cloud files. Default is **No**. |
| `openspec init --copilot-cloud` | Sets them up without prompting (for scripts/CI). |
| `openspec init --no-copilot-cloud` | Skips them without prompting, and removes any previously generated ones. |
| `openspec update` | Never prompts. Refreshes the files only if you opted in (or the project already has them). If you opted out, it removes OpenSpec-managed cloud files. |

Your choice is saved in `openspec/config.yaml` as `githubCopilot.cloudAgent: true|false`, so non-interactive updates honor it. OpenSpec only ever writes or removes files whose content it generated — if you customize `copilot-setup-steps.yml` or `openspec.agent.md`, or already have your own, it is left untouched (and `init`/`update` tell you so).

### When to pick the shared `.agents` target

`agents` is the vendor-neutral option: it writes skills to `.agents/skills/`, the
shared root many agent tools read, instead of a tool-specific directory.

| Situation | Pick |
|-----------|------|
| Your tool has its own row above | Its own ID — you get that tool's integration, including slash commands where it supports them |
| Several agents on one repo, all reading `.agents/skills` | `agents` — one skill tree instead of one per tool |
| Your tool isn't listed yet but reads `.agents/skills` | `agents` |

Selecting it alongside a tool-specific ID is fine; each normally writes to its
own root. Codex and Zed Agent are the exceptions because they use the same canonical
`.agents` root. If Codex is selected with Zed or `agents`, OpenSpec keeps one
Codex-led tree. Its handoffs name both `$openspec-*` for Codex and
`/openspec-*` for other agents, so `--tools all` and existing multi-agent
setups keep working without two writers overwriting the same files.
OpenSpec also offers it automatically once a project has a `.agents/skills/`
directory — a bare `.agents/` is not enough, since tools use that root for rules
and subagent definitions too. Note `.agents` is not `.agent`: the singular
directory belongs to Antigravity.

Two things to know:

- **Skills only.** No command adapter exists, so no `opsx-*` command files are
  written; with a commands-inclusive delivery mode `openspec init` lists `agents`
  among the tools it reports under `Commands skipped for: … (no adapter)`.
  Invoke the workflows by skill name —
  most assistants that read `.agents/skills` spell that `/openspec-propose`, the form
  OpenSpec's setup hint prints. The target is vendor-neutral, so check your
  assistant's own docs if it uses another form.
- **No `AGENTS.md` is created or edited.** The target is the `.agents/` directory.
  If your root `AGENTS.md` still carries OpenSpec marker blocks from an older
  version, `openspec update` strips them — see the [Migration Guide](migration-guide.md).

Zed support here is for the built-in Zed Agent. Zed External Agents and Terminal
Threads use their own integrations. Agent Skills require
[Zed v1.4.2](https://github.com/zed-industries/zed/releases/tag/v1.4.2) or newer.
Project-local skills are unavailable in an untrusted worktree until you
[grant trust](https://zed.dev/docs/worktree-trust).

Because `.agents/skills/` is shared by Codex, Zed Agent, and the vendor-neutral target,
it is worth knowing what OpenSpec claims there:
it writes, refreshes, and removes only the `openspec-*` skill directories for your
selected workflows, plus an `.openspec-target` marker that records whether Codex,
Zed Agent, or the vendor-neutral target rendered that shared tree. Anything else in that
directory is left alone. Treat the `openspec-*` names and marker as OpenSpec's —
edits inside them are replaced on the next `openspec update`, the same as for
every other tool.

For pre-marker projects, OpenSpec infers ownership from managed skill references:
`$openspec-*` means Codex and `/openspec-*` means the vendor-neutral target. A
generic canonical tree alongside legacy `.codex/skills` is treated as an older
dual-target install and consolidated into the compatible shared tree.

`openspec update` honors this ownership too. If a project owns `.agents` as the
vendor-neutral target and a leftover Codex install is detected only from stray
prompt files, the update leaves the established `agents` tree in place instead of
rewriting it with Codex syntax, and preserves those legacy prompt files rather
than deleting them. To hand the shared tree to Codex, run `openspec init --tools
codex` explicitly.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**Available tool IDs (`--tools`)** — `windsurf` is also accepted, as an alias for `devin`: `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `command-code`, `codeartsagent`, `codex`, `devin`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `hermes`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `minimax-code`, `vibe`, `oh-my-pi`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `zed`, `zcode`, `agents`

## Workflow-Dependent Installation

OpenSpec installs workflow artifacts based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `update`, `sync`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `update`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill/command counts are profile-dependent and delivery-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, OpenSpec generates these skills:

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-update-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

See [Commands](commands.md) for command behavior and [CLI](cli.md) for `init`/`update` options.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
