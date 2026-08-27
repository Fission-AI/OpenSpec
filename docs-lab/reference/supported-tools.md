# Supported tools

> Which AI coding tools OpenSpec supports, and each one's command syntax.

Every tool in the matrix runs the same OpenSpec workflows. A skill and its command are
the same workflow instructions. The only difference is what you type. Which form init
installs is the delivery setting, covered in
[Set up your project](../start/setup.md#the-workflow-files-skills-and-commands).

## Support matrix

Invocations are shown for the apply workflow. Every workflow follows the same shape.
The id goes to `openspec init --tools <id>` to skip the picker ([CLI](cli.md)).

| Tool | `--tools` id | Skills | Skill invocation | Commands | Command invocation |
|---|---|---|---|---|---|
| Amazon Q Developer | `amazon-q` | `.amazonq/skills/` | `/openspec-apply-change` | `.amazonq/prompts/` | `@opsx-apply` |
| Antigravity | `antigravity` | `.agents/skills/` | `/openspec-apply-change` | `.agents/workflows/` | `/opsx-apply` |
| Auggie (Augment CLI) | `auggie` | `.augment/skills/` | `/openspec-apply-change` | `.augment/commands/` | `/opsx-apply` |
| Bob Shell | `bob` | `.bob/skills/` | `/openspec-apply-change` | `.bob/commands/` | `/opsx-apply` |
| Claude Code | `claude` | `.claude/skills/` | `/openspec-apply-change` | `.claude/commands/opsx/` | `/opsx:apply` |
| Cline | `cline` | `.cline/skills/` | `/openspec-apply-change` | `.clinerules/workflows/` | `/opsx-apply` |
| CodeArts | `codeartsagent` | `.codeartsdoer/skills/` | `/openspec-apply-change` | none | none |
| CodeBuddy Code (CLI) | `codebuddy` | `.codebuddy/skills/` | `/openspec-apply-change` | `.codebuddy/commands/opsx/` | `/opsx:apply` |
| Codex | `codex` | `.agents/skills/` | `$openspec-apply-change` | none | none |
| Continue | `continue` | `.continue/skills/` | `/openspec-apply-change` | `.continue/prompts/` | `/opsx-apply` |
| CoStrict | `costrict` | `.cospec/skills/` | `/openspec-apply-change` | `.cospec/openspec/commands/` | `/opsx-apply` |
| Crush | `crush` | `.crush/skills/` | `/openspec-apply-change` | `.crush/commands/opsx/` | `/opsx:apply` |
| Cursor | `cursor` | `.cursor/skills/` | `/openspec-apply-change` | `.cursor/commands/` | `/opsx-apply` |
| DeepSeek Harness | `dsh` | `.dsh/skills/` | `/openspec-apply-change` | none | none |
| Devin Desktop (formerly Windsurf) | `devin` | `.devin/skills/` | `/openspec-apply-change` | `.devin/workflows/` | `/opsx-apply` |
| Factory Droid | `factory` | `.factory/skills/` | `/openspec-apply-change` | `.factory/commands/` | `/opsx-apply` |
| ForgeCode | `forgecode` | `.forge/skills/` | `/openspec-apply-change` | none | none |
| Gemini CLI | `gemini` | `.gemini/skills/` | `/openspec-apply-change` | `.gemini/commands/opsx/` | `/opsx:apply` |
| GitHub Copilot | `github-copilot` | `.github/skills/` | `/openspec-apply-change` | `.github/prompts/` | `/opsx-apply` |
| Hermes Agent | `hermes` | `.hermes/skills/` | `/openspec-apply-change` | none | none |
| iFlow | `iflow` | `.iflow/skills/` | `/openspec-apply-change` | `.iflow/commands/` | `/opsx-apply` |
| Junie | `junie` | `.junie/skills/` | `/openspec-apply-change` | `.junie/commands/` | `/opsx-apply` |
| Kilo Code | `kilocode` | `.kilocode/skills/` | `/openspec-apply-change` | `.kilocode/workflows/` | `/opsx-apply` |
| Kimi Code | `kimi` | `.kimi-code/skills/` | `/skill:openspec-apply-change` | none | none |
| Kiro | `kiro` | `.kiro/skills/` | `/openspec-apply-change` | `.kiro/prompts/` | `/opsx-apply` |
| Lingma | `lingma` | `.lingma/skills/` | `/openspec-apply-change` | `.lingma/commands/opsx/` | `/opsx:apply` |
| MiniMax Code | `minimax-code` | `~/.minimax/skills/` (global) | `/openspec-apply-change` | none | none |
| Mistral Vibe | `vibe` | `.vibe/skills/` | `/openspec-apply-change` | none | none |
| Oh My Pi | `oh-my-pi` | `.omp/skills/` | `/openspec-apply-change` | `.omp/commands/` | `/opsx-apply` |
| OpenCode | `opencode` | `.opencode/skills/` | `/openspec-apply-change` | `.opencode/commands/` | `/opsx-apply` |
| Pi | `pi` | `.pi/skills/` | `/openspec-apply-change` | `.pi/prompts/` | `/opsx-apply` |
| Qoder | `qoder` | `.qoder/skills/` | `/openspec-apply-change` | `.qoder/commands/opsx/` | `/opsx:apply` |
| Qwen Code | `qwen` | `.qwen/skills/` | `/openspec-apply-change` | `.qwen/commands/` | `/opsx-apply` |
| Trae | `trae` | `.trae/skills/` | `/openspec-apply-change` | `.trae/commands/` | `/opsx-apply` |
| ZCode | `zcode` | `.zcode/skills/` | `/openspec-apply-change` | `.zcode/commands/opsx/` | `/opsx:apply` |
| Zoo Code | `roocode` | `.roo/skills/` | `/openspec-apply-change` | `.roo/commands/` | `/opsx-apply` |
| Shared `.agents` skills | `agents` | `.agents/skills/` | `/openspec-apply-change` | none | none |

- **Skill invocation**: whether a tool registers skills as typed entries is the tool's
  own behavior. The column shows the spelling OpenSpec uses in generated files and in
  the hint init prints. Check your tool's docs if typing it does nothing.
- **Command file formats**: most tools take `.md` command files. Gemini CLI takes
  `.toml`, Continue `.prompt`, Kiro and GitHub Copilot `.prompt.md`. The spelling you
  type is the same either way.

## Per-tool notes

A tool not listed here behaves exactly as its row reads.

### Antigravity

- **Current folder**: Antigravity v1.20.5 and later read workspace skills and
  workflows from `.agents/`.
- **Legacy folder**: after OpenSpec writes replacements, it removes equivalent
  generated files from `.agent/`. Custom files and changed generated files stay in
  `.agent/` for you to review.
- **Shared skills**: Antigravity shares `.agents/skills/` with Codex, Zed Agent, and
  the `agents` target. OpenSpec writes that skill tree once while still writing
  Antigravity commands to `.agents/workflows/`.

### Cline

Cline reads commands from `.clinerules/workflows/`, not from its `.cline/` folder.
Skills stay in `.cline/skills/`.

### Codex

- **Invocation**: type `$openspec-<skill>`. Codex does not recognize the
  `/openspec-<skill>` form ([upstream issue](https://github.com/openai/codex/issues/11817)).
- **No command files**: Codex runs skills directly, so init skips commands even when
  delivery includes them and prints `Commands skipped for: codex (uses skills)`.
- **Shared folder**: Codex skills land in `.agents/skills/`, the same tree Antigravity,
  Zed Agent, and the `agents` target use. Selecting more than one keeps a single
  compatible tree, and its handoffs spell both `$openspec-*` and `/openspec-*` when
  Codex owns it.
- **Legacy path**: skills installed under `.codex/skills/` by older versions are
  migrated on the next `openspec update`.

### DeepSeek Harness

- **Project root**: DSH uses the nearest `.git` ancestor, or the current directory
  outside Git. Run `openspec init --tools dsh` there. For a nested OpenSpec project,
  add the absolute path to its `.dsh/skills/` directory to DSH's `customSkillDirs`.
  Git-root skills still win if names overlap
  ([upstream discovery rules](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem)).
- **Priority**: `.dsh/skills/` takes precedence over same-named skills in
  `.agents/skills/`.
- **Delivery**: use `skills` or `both`. With `commands`, no DSH workflows are
  installed. Change delivery with `openspec config profile`, then rerun
  `openspec init --tools dsh`.

### Devin Desktop (formerly Windsurf)

- **Two agents**: command files in `.devin/workflows/` work only in Devin Desktop.
  Devin Local runs skills only, so generated skills reference `/openspec-<skill>`,
  which works in both.
- **Rename**: `--tools windsurf` still resolves to `devin`. A project holding
  OpenSpec files in the legacy `.windsurf/` folder is offered the move on the next
  `openspec update`.

### GitHub Copilot

Prompt files register as slash commands in the Copilot IDE extensions (VS Code,
JetBrains, Visual Studio). Copilot CLI does not read `.github/prompts/`.

### Hermes Agent

Hermes loads skills only from `~/.hermes/skills/` by default. Add the project's
`.hermes/skills/` folder to `skills.external_dirs` in `~/.hermes/config.yaml`;
init prints this reminder after install.

### MiniMax Code

- **Global only**: skills go to `~/.minimax/skills/`. Nothing is written inside
  the repo.
- **Safe across projects**: a commands-only delivery leaves the global skills in
  place, so one project's setting cannot remove skills another project uses.

### Shared `.agents` skills

- **When it fits**: any tool that reads the shared `.agents/skills/` folder,
  including tools with no row in the matrix.
- **Alongside other targets**: Antigravity, Codex, Zed Agent, and this target share
  one physical skill tree. OpenSpec records one writer in `.openspec-target` and
  writes the tree once per run. Each tool's separate command files are still
  generated.
- **What OpenSpec claims**: only the `openspec-*` folders and the
  `.openspec-target` marker. Anything else under `.agents/` is left alone.
- **`AGENTS.md`**: not created or edited. The target is the `.agents/` folder, not
  the file.
