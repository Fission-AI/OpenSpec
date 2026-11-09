# Supported tools

> Which AI coding tools OpenSpec supports, and each one's command syntax.

Every tool in the matrix runs the same OpenSpec workflows. A skill and its command are
the same workflow instructions. The only difference is what you type. Which form init
installs is the delivery setting, covered in
[Set up your project](../start/setup.md#the-workflow-files-skills-and-commands).

## Where skills go

Every tool's skills are written once, to `.agents/skills/`. A tool that doesn't read that folder gets one link per skill in its own `skills/` folder, pointing back at the shared copy. Commands stay in each tool's own folder.

A project set up for Claude Code, Cursor, and Codex:

```
my-project/
├── .agents/skills/
│   ├── .openspec-target           the tools set up here, one per line
│   └── openspec-propose/SKILL.md  the one copy every tool reads
├── .claude/
│   ├── skills/openspec-propose    link to ../../.agents/skills/openspec-propose
│   └── commands/opsx/propose.md
└── .cursor/
    └── commands/opsx-propose.md   Cursor reads .agents/skills itself
```

- **Links**: Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio, and Hermes Agent.
- **No link**: every other tool reads `.agents/skills/` directly, so it never loads a skill twice.
- **Where a link can't be made**: OpenSpec writes a plain copy instead, and refreshes it on `openspec update`.

To add a tool that isn't listed, see [Link another tool](#link-another-tool).

## Support matrix

Invocations are shown for the apply workflow. Every workflow follows the same shape.
The id goes to `openspec init --tools <id>` to skip the picker ([CLI](cli.md)).

| Tool | `--tools` id | Skills | Skill invocation | Commands | Command invocation |
|---|---|---|---|---|---|
| Amazon Q Developer | `amazon-q` | `.amazonq/skills/` | `/openspec-apply-change` | `.amazonq/prompts/` | `@opsx-apply` |
| Amp | `amp` | `.agents/skills/` | `/openspec-apply-change` | none | none |
| Antigravity | `antigravity` | `.agents/skills/` | `/openspec-apply-change` | `.agents/workflows/` | `/opsx-apply` |
| AtomCode | `atomcode` | `.agents/skills/` | `/openspec-apply-change` | `.atomcode/commands/` | `/opsx-apply` |
| Auggie (Augment CLI) | `auggie` | `.agents/skills/` | `/openspec-apply-change` | `.augment/commands/` | `/opsx-apply` |
| IBM Bob | `bob` | `.agents/skills/` | `/openspec-apply-change` | `.bob/commands/` | `/opsx-apply` |
| Claude Code | `claude` | `.agents/skills/` (links in `.claude/skills/`) | `/openspec-apply-change` | `.claude/commands/opsx/` | `/opsx:apply` |
| Cline | `cline` | `.agents/skills/` | `/openspec-apply-change` | `.clinerules/workflows/` | `/opsx-apply` |
| CodeArts | `codeartsagent` | `.agents/skills/` (links in `.codeartsdoer/skills/`) | `/openspec-apply-change` | none | none |
| CodeBuddy Code (CLI) | `codebuddy` | `.agents/skills/` (links in `.codebuddy/skills/`) | `/openspec-apply-change` | `.codebuddy/commands/opsx/` | `/opsx:apply` |
| Code Studio | `codestudio` | `.agents/skills/` (links in `.codestudio/skills/`) | `/openspec-apply-change` | `.codestudio/prompts/` | `/opsx-apply` |
| Codex | `codex` | `.agents/skills/` | `$openspec-apply-change` | none | none |
| Continue | `continue` | `.agents/skills/` (links in `.continue/skills/`) | `/openspec-apply-change` | `.continue/prompts/` | `/opsx-apply` |
| CoStrict | `costrict` | `.agents/skills/` | `/openspec-apply-change` | `.cospec/openspec/commands/` | `/opsx-apply` |
| Crush | `crush` | `.agents/skills/` | `/openspec-apply-change` | `.crush/commands/opsx/` | `/opsx:apply` |
| Cursor | `cursor` | `.agents/skills/` | `/openspec-apply-change` | `.cursor/commands/` | `/opsx-apply` |
| DeepSeek Harness | `dsh` | `.agents/skills/` | `/openspec-apply-change` | none | none |
| Devin Desktop (formerly Windsurf) | `devin` | `.agents/skills/` | `/openspec-apply-change` | `.devin/workflows/` | `/opsx-apply` |
| EasyCode | `easycode` | `.agents/skills/` (links in `.easycode/skills/`) | `/openspec-apply-change` | `.easycode/commands/opsx/` | `/opsx:apply` |
| Factory Droid | `factory` | `.agents/skills/` | `/openspec-apply-change` | `.factory/commands/` | `/opsx-apply` |
| ForgeCode | `forgecode` | `.agents/skills/` (links in `.forge/skills/`) | `/openspec-apply-change` | none | none |
| Gemini CLI | `gemini` | `.agents/skills/` | `/openspec-apply-change` | `.gemini/commands/opsx/` | `/opsx:apply` |
| GigaCode | `gigacode` | `.agents/skills/` (links in `.gigacode/skills/`) | `/openspec-apply-change` | `.gigacode/commands/` | `/opsx-apply` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `/openspec-apply-change` | `.github/prompts/` | `/opsx-apply` |
| Grok Build | `grok` | `.agents/skills/` | `/openspec-apply-change` | none | none |
| GSD | `gsd` | `.agents/skills/` | ask for `openspec-apply-change` | none | none |
| Hermes Agent | `hermes` | `.agents/skills/` (links in `.hermes/skills/`) | `/openspec-apply-change` | none | none |
| iFlow | `iflow` | `.agents/skills/` (links in `.iflow/skills/`) | `/openspec-apply-change` | `.iflow/commands/` | `/opsx-apply` |
| Junie | `junie` | `.agents/skills/` | `/openspec-apply-change` | `.junie/commands/` | `/opsx-apply` |
| Kilo Code | `kilocode` | `.agents/skills/` | `/openspec-apply-change` | `.kilo/command/` | `/opsx-apply` |
| Kimi Code | `kimi` | `.agents/skills/` | `/skill:openspec-apply-change` | none | none |
| Kiro | `kiro` | `.agents/skills/` (links in `.kiro/skills/`) | `/openspec-apply-change` | `.kiro/prompts/` | `/opsx-apply` |
| Lingma | `lingma` | `.agents/skills/` (links in `.lingma/skills/`) | `/openspec-apply-change` | `.lingma/commands/opsx/` | `/opsx:apply` |
| MiniMax Code | `minimax-code` | `~/.minimax/skills/` (global) | `/openspec-apply-change` | none | none |
| Mistral Vibe | `vibe` | `.agents/skills/` | `/openspec-apply-change` | none | none |
| Oh My Pi | `oh-my-pi` | `.agents/skills/` | `/openspec-apply-change` | `.omp/commands/` | `/opsx-apply` |
| OpenCode | `opencode` | `.agents/skills/` | `/openspec-apply-change` | `.opencode/commands/` | `/opsx-apply` |
| Pi | `pi` | `.agents/skills/` | `/openspec-apply-change` | `.pi/prompts/` | `/opsx-apply` |
| Qoder | `qoder` | `.agents/skills/` | `/openspec-apply-change` | `.qoder/commands/opsx/` | `/opsx:apply` |
| Qwen Code | `qwen` | `.agents/skills/` | `/openspec-apply-change` | `.qwen/commands/` | `/opsx-apply` |
| Rovo Dev CLI | `rovodev` | `.agents/skills/` (links in `.rovodev/skills/`) | ask for `openspec-apply-change` | none | none |
| Trae | `trae` | `.agents/skills/` | `/openspec-apply-change` | `.trae/commands/` | `/opsx-apply` |
| [Veai](https://veai.ru/docs/veai/download) | `veai` | `.agents/skills/` (links in `.veai/skills/`) | `/openspec-apply-change` | none | none |
| Warp | `warp` | `.agents/skills/` | `/openspec-apply-change` | none | none |
| ZCode | `zcode` | `.agents/skills/` | `/openspec-apply-change` | `.zcode/commands/opsx/` | `/opsx:apply` |
| Zoo Code | `roocode` | `.agents/skills/` | `/openspec-apply-change` | `.roo/commands/` | `/opsx-apply` |
| Other / Universal | `agents` | `.agents/skills/` | `/openspec-apply-change` | none | none |

- **Skill invocation**: whether a tool registers skills as typed entries is the tool's
  own behavior. The column shows the spelling OpenSpec uses in generated files and in
  the hint init prints. Check your tool's docs if typing it does nothing.
- **Command file formats**: most tools take `.md` command files. EasyCode and Gemini
  CLI take `.toml`, Continue `.prompt`, and Code Studio, Kiro, and GitHub Copilot
  `.prompt.md`. The spelling you type is the same either way.

## Link another tool

A tool that reads `.agents/skills/` needs nothing: pick `agents` at init ([Other / Universal](#other--universal-shared-agents-skills)). A tool that reads only its own folder can be pointed at the shared copy with one link. In your terminal, from the project root:

```bash
mkdir -p .mytool
ln -s ../.agents/skills .mytool/skills
```

On Windows, in Command Prompt:

```
mkdir .mytool
mklink /J .mytool\skills .agents\skills
```

Replace `.mytool` with your tool's folder. If the tool already has a `skills/` folder of its own, link each skill instead: `ln -s ../../.agents/skills/openspec-propose .mytool/skills/openspec-propose`.

**Committing links**: Git stores links as links. A teammate on Windows needs `git config core.symlinks true` (and permission to create links) before cloning, or they check out as small text files. A junction made with `mklink /J` is not committed as a link; recreate it on each machine.

## Per-tool notes

A tool not listed here behaves exactly as its row reads.

### Amp

- **Project skills**: Amp reads OpenSpec skills from `.agents/skills/`.
- **No command files**: Amp runs skills directly, so init skips command generation.
- **Shared folder**: Amp reads the same `.agents/skills/` copy as every other tool.

### Antigravity

- **Current folder**: Antigravity v1.20.5 and later read workspace skills and
  workflows from `.agents/`.
- **Legacy folder**: after OpenSpec writes replacements, it removes equivalent
  generated files from `.agent/`. Custom files and changed generated files stay in
  `.agent/` for you to review.
- **Shared skills**: Antigravity reads the same `.agents/skills/` copy as every other
  tool. Its commands go to `.agents/workflows/`.

### Cline

Cline reads commands from `.clinerules/workflows/`, not from its `.cline/` folder.
Skills are the shared copy in `.agents/skills/`.

### Codex

- **CLI and IDE extension**: mention `$openspec-propose` with your idea, or run
  `/skills` to select the skill. Codex does not recognize `/openspec-propose`
  ([upstream issue](https://github.com/openai/codex/issues/11817)).
- **Desktop app**: open Skills in the sidebar and select `openspec-propose`.
  [OpenAI's skills documentation](https://learn.chatgpt.com/docs/build-skills)
  describes both interfaces.
- **No command files**: Codex runs skills directly, so init skips commands even when
  delivery includes them and prints `Commands skipped for: codex (uses skills)`.
- **Shared folder**: Codex reads the same `.agents/skills/` copy as every other tool.
  Skills name each other by skill name (`openspec-apply-change`), which Codex
  invokes as `$openspec-apply-change`.
- **Legacy path**: skills installed under `.codex/skills/` by older versions are
  migrated on the next `openspec update`.

### DeepSeek Harness

- **Project root**: DSH uses the nearest `.git` ancestor, or the current directory
  outside Git. Run `openspec init --tools dsh` there. For a nested OpenSpec project,
  add the absolute path to its `.agents/skills/` directory to DSH's `customSkillDirs`.
  Git-root skills still win if names overlap
  ([upstream discovery rules](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/skill/skill-filesystem)).
- **Old copies**: a `.dsh/skills/` copy from before 2.0 would take precedence over
  `.agents/skills/`. `openspec update` removes untouched ones and reports any you
  changed.
- **Delivery**: use `skills` or `both`. With `commands`, no DSH workflows are
  installed. Change delivery with `openspec config profile`, then rerun
  `openspec init --tools dsh`.

### Devin Desktop (formerly Windsurf)

- **Two agents**: command files in `.devin/workflows/` work only in Devin Desktop.
  Devin Local runs skills only, so skills name other skills
  (`openspec-<skill>`), never workflows.
- **Rename**: `--tools windsurf` still resolves to `devin`. A project holding
  OpenSpec files in the legacy `.windsurf/` folder is offered the move on the next
  `openspec update`.

### GitHub Copilot

- **IDE extensions (command delivery)**: VS Code, JetBrains, and Visual Studio load
  `.github/prompts/opsx-<id>.prompt.md` as `/opsx-<id>`. If a command disappears
  while its file still exists, restart the IDE.
- **Copilot CLI (skill delivery)**: the CLI ignores `.github/prompts/` and loads
  `.agents/skills/openspec-*/SKILL.md` instead. Invoke a skill as
  `/openspec-<skill>`. If a skill disappears while its file still exists, run
  `/skills reload`, then `/skills info openspec-propose` to confirm discovery.

### GSD

- **Project skills**: GSD reads OpenSpec workflows from
  [`.agents/skills/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/skills.md).
- **Invocation**: ask GSD to use the `openspec-<workflow>` skill. GSD can also select
  a matching skill through its skill discovery setting.
- **No subagent files**: [`.gsd/agents/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/subagents.md)
  contains GSD subagent definitions. OpenSpec does not write workflow skills there.

### Hermes Agent

Hermes loads skills only from `~/.hermes/skills/` by default. OpenSpec links each
skill into the project's `.hermes/skills/` folder; add that folder to
`skills.external_dirs` in `~/.hermes/config.yaml`. Init prints this reminder after
install.

### MiniMax Code

- **Global only**: skills go to `~/.minimax/skills/`. Nothing is written inside
  the repo.
- **Safe across projects**: a commands-only delivery leaves the global skills in
  place, so one project's setting cannot remove skills another project uses.

### Warp

- **Skills always**: Warp's skills stay in `.agents/skills/` even when delivery is
  `commands`, because Warp has no command files and invokes skills directly.
- **What OpenSpec claims**: nothing in `.warp/`. Warp settings and `WARP.md` are not
  created or edited.

### Other / Universal (shared `.agents` skills)

- **When it fits**: any tool that reads the shared `.agents/skills/` folder,
  including tools with no row in the matrix. It is the entry to pick when your
  assistant is not listed. The init picker's search box finds it by `universal`,
  `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`,
  `vendor-neutral`, or `agents.md`.
- **Alongside other tools**: every tool reads this one skill tree. `.openspec-target`
  lists the tools set up in the project, and each tool's command files are still
  generated in its own folder.
- **What OpenSpec claims**: only the `openspec-*` folders and the `.openspec-target`
  list. Anything else under `.agents/` is left alone.
- **`AGENTS.md`**: not created or edited. The target is the `.agents/` folder, not
  the file.
