# Supported tools

> Which AI coding tools OpenSpec supports, and how to invoke each one's skills.

Every tool in the matrix runs the same OpenSpec workflows, installed as skills. Earlier
versions also wrote command files. [Upgrade to 2.0](../help/upgrade-to-2.md) covers what
happens to them.

## Where skills go

Every tool's skills are written once, to `.agents/skills/`. A tool that doesn't read that folder gets one link per skill in its own `skills/` folder, pointing back at the shared copy.

A project set up for Claude Code, Cursor, and Codex:

```
my-project/
├── .agents/skills/
│   ├── .openspec-target           the tools set up here, one per line
│   └── openspec-propose/SKILL.md  the one copy every tool reads
└── .claude/
    └── skills/openspec-propose    link to ../../.agents/skills/openspec-propose
```

Cursor and Codex read `.agents/skills/` themselves, so they need nothing else.

`skills-lock.json`, at the project root, is the record the [`skills`](https://github.com/vercel-labs/skills) package keeps of the skills it installed there.

`.openspec-target` is how `openspec update` knows which tools are set up and what is OpenSpec's. Each line is one of:

| Line | Meaning |
|---|---|
| `<tool>` | A tool set up in this project, such as `cursor`. |
| `<tool> own-files` | OpenSpec gave the tool links in its own folder, such as `claude own-files`. Delete that folder and `update` removes the tool. |
| `keep <skill>` | Your own skill, such as `keep openspec-mine`. It was there before OpenSpec used the folder, so OpenSpec never touches it. |

- **Links**: Claude Code, Continue, ForgeCode, Kiro, CodeBuddy, EasyCode, iFlow, CodeArts, Lingma, GigaCode, Veai, Rovo Dev, Code Studio, and Hermes Agent.
- **No link**: every other tool reads `.agents/skills/` directly, so it never loads a skill twice.
- **Where a link can't be made**: OpenSpec writes a plain copy instead, and refreshes it on `openspec update`.

To add a tool that isn't listed, see [Link another tool](#link-another-tool).

With `openspec init --scope global` the same layout sits in your home folder: one copy in `~/.agents/skills/`, and links such as `~/.claude/skills/openspec-propose`. The [`skills`](https://github.com/vercel-labs/skills) package places them, so there is no `.openspec-target` file there. These tools have no machine-wide folder it knows, so they keep their skills in each project: AtomCode, CoStrict, DeepSeek Harness, EasyCode, GigaCode, GSD, Oh My Pi, SourceCraft Code Assistant, and Veai. MiniMax Code is not part of the global install either, because its project install already writes to `~/.minimax/skills/`.

## Support matrix

Invocations are shown for the apply workflow. Every workflow follows the same shape.
The id goes to `openspec init --tools <id>` to skip the picker ([CLI](cli.md)).

| Tool | `--tools` id | Skills | Skill invocation |
|---|---|---|---|
| Amp | `amp` | `.agents/skills/` | `/openspec-apply-change` |
| Antigravity | `antigravity` | `.agents/skills/` | `/openspec-apply-change` |
| AtomCode | `atomcode` | `.agents/skills/` | `/openspec-apply-change` |
| Auggie (Augment CLI) | `auggie` | `.agents/skills/` | `/openspec-apply-change` |
| IBM Bob | `bob` | `.agents/skills/` | `/openspec-apply-change` |
| Claude Code | `claude` | `.agents/skills/` (links in `.claude/skills/`) | `/openspec-apply-change` |
| Cline | `cline` | `.agents/skills/` | `/openspec-apply-change` |
| CodeArts | `codeartsagent` | `.agents/skills/` (links in `.codeartsdoer/skills/`) | `/openspec-apply-change` |
| CodeBuddy Code (CLI) | `codebuddy` | `.agents/skills/` (links in `.codebuddy/skills/`) | `/openspec-apply-change` |
| Code Studio | `codestudio` | `.agents/skills/` (links in `.codestudio/skills/`) | `/openspec-apply-change` |
| Codex | `codex` | `.agents/skills/` | `$openspec-apply-change` |
| Continue | `continue` | `.agents/skills/` (links in `.continue/skills/`) | `/openspec-apply-change` |
| CoStrict | `costrict` | `.agents/skills/` | `/openspec-apply-change` |
| Crush | `crush` | `.agents/skills/` | `/openspec-apply-change` |
| Cursor | `cursor` | `.agents/skills/` | `/openspec-apply-change` |
| DeepSeek Harness | `dsh` | `.agents/skills/` | `/openspec-apply-change` |
| Devin Desktop (formerly Windsurf) | `devin` | `.agents/skills/` | `/openspec-apply-change` |
| EasyCode | `easycode` | `.agents/skills/` (links in `.easycode/skills/`) | `/openspec-apply-change` |
| Factory Droid | `factory` | `.agents/skills/` | `/openspec-apply-change` |
| ForgeCode | `forgecode` | `.agents/skills/` (links in `.forge/skills/`) | `/openspec-apply-change` |
| Gemini CLI | `gemini` | `.agents/skills/` | `/openspec-apply-change` |
| GigaCode | `gigacode` | `.agents/skills/` (links in `.gigacode/skills/`) | `/openspec-apply-change` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `/openspec-apply-change` |
| Grok Build | `grok` | `.agents/skills/` | `/openspec-apply-change` |
| GSD | `gsd` | `.agents/skills/` | ask for `openspec-apply-change` |
| Hermes Agent | `hermes` | `.agents/skills/` (links in `.hermes/skills/`) | `/openspec-apply-change` |
| iFlow | `iflow` | `.agents/skills/` (links in `.iflow/skills/`) | `/openspec-apply-change` |
| Junie | `junie` | `.agents/skills/` | `/openspec-apply-change` |
| Kilo Code | `kilocode` | `.agents/skills/` | `/openspec-apply-change` |
| Kimi Code | `kimi` | `.agents/skills/` | `/skill:openspec-apply-change` |
| Kiro | `kiro` | `.agents/skills/` (links in `.kiro/skills/`) | `/openspec-apply-change` |
| Lingma | `lingma` | `.agents/skills/` (links in `.lingma/skills/`) | `/openspec-apply-change` |
| MiniMax Code | `minimax-code` | `~/.minimax/skills/` (global) | `/openspec-apply-change` |
| Mistral Vibe | `vibe` | `.agents/skills/` | `/openspec-apply-change` |
| Oh My Pi | `oh-my-pi` | `.agents/skills/` | `/openspec-apply-change` |
| OpenCode | `opencode` | `.agents/skills/` | `/openspec-apply-change` |
| Pi | `pi` | `.agents/skills/` | `/openspec-apply-change` |
| Qoder | `qoder` | `.agents/skills/` | `/openspec-apply-change` |
| Qwen Code | `qwen` | `.agents/skills/` | `/openspec-apply-change` |
| Rovo Dev CLI | `rovodev` | `.agents/skills/` (links in `.rovodev/skills/`) | ask for `openspec-apply-change` |
| Trae | `trae` | `.agents/skills/` | `/openspec-apply-change` |
| [Veai](https://veai.ru/docs/veai/download) | `veai` | `.agents/skills/` (links in `.veai/skills/`) | `/openspec-apply-change` |
| Warp | `warp` | `.agents/skills/` | `/openspec-apply-change` |
| ZCode | `zcode` | `.agents/skills/` | `/openspec-apply-change` |
| Zoo Code | `roocode` | `.agents/skills/` | `/openspec-apply-change` |
| Other / Universal | `agents` | `.agents/skills/` | `/openspec-apply-change` |

- **Skill invocation**: whether a tool registers skills as typed entries is the tool's
  own behavior. The column shows the spelling OpenSpec uses in generated files and in
  the hint init prints. Check your tool's docs if typing it does nothing.

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

**Committing links**: Git stores links as links. A teammate on Windows should run `git config --global core.symlinks true` (or clone with `git clone -c core.symlinks=true <url>`) and enable Developer Mode so links can be created. Otherwise each link checks out as a small text file, which `openspec update` replaces with a plain copy of the skill. A junction made with `mklink /J` is not committed as a link; recreate it on each machine.

## Per-tool notes

A tool not listed here behaves exactly as its row reads.

### Amazon Q Developer (retired)

OpenSpec 2.0 no longer supports Amazon Q Developer: it can't load skills, and AWS is
retiring it in favor of Kiro. `openspec init --tools amazon-q` stops with that
message. In a project set up for it, `openspec update` removes the prompts and skills
OpenSpec wrote in `.amazonq/`, and keeps and lists any you edited. Set up Kiro
instead: `openspec init --tools kiro`.

### Antigravity

- **Current folder**: Antigravity v1.20.5 and later read workspace skills and
  workflows from `.agents/`.
- **Legacy folder**: after OpenSpec writes replacements, it removes equivalent
  generated files from `.agent/`. Custom files and changed generated files stay in
  `.agent/` for you to review.
- **Shared skills**: Antigravity reads the same `.agents/skills/` copy as every other
  tool. Workflows OpenSpec wrote to `.agents/workflows/` before 2.0 are removed on
  update.

### Cline

Skills are the shared copy in `.agents/skills/`. Workflows OpenSpec wrote to
`.clinerules/workflows/` before 2.0 are removed on update; your own rules there are
left alone.

### Codex

- **CLI and IDE extension**: mention `$openspec-propose` with your idea, or run
  `/skills` to select the skill. Codex does not recognize `/openspec-propose`
  ([upstream issue](https://github.com/openai/codex/issues/11817)).
- **Desktop app**: open Skills in the sidebar and select `openspec-propose`.
  [OpenAI's skills documentation](https://learn.chatgpt.com/docs/build-skills)
  describes both interfaces.
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

### Devin Desktop (formerly Windsurf)

- **Both agents**: Devin Desktop and Devin Local both run the shared skills.
  Workflows OpenSpec wrote to `.devin/workflows/` before 2.0 are removed on update.
- **Rename**: `--tools windsurf` still resolves to `devin`. A project holding
  OpenSpec files in the legacy `.windsurf/` folder is offered the move on the next
  `openspec update`.

### GitHub Copilot

- **Skills**: Copilot loads `.agents/skills/openspec-*/SKILL.md`. Invoke a skill as
  `/openspec-<skill>`. In the CLI, if a skill disappears while its file still exists,
  run `/skills reload`, then `/skills info openspec-propose` to confirm discovery. In
  an IDE, restart it.
- **Old prompt files**: the `.github/prompts/opsx-*.prompt.md` files OpenSpec wrote
  before 2.0 are removed on update.

### GSD

- **Project skills**: GSD reads OpenSpec workflows from
  [`.agents/skills/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/skills.md).
- **Invocation**: ask GSD to use the `openspec-<workflow>` skill. GSD can also select
  a matching skill through its skill discovery setting.
- **No subagent files**: [`.gsd/agents/`](https://github.com/open-gsd/gsd-pi/blob/main/docs/user-docs/subagents.md)
  contains GSD subagent definitions. OpenSpec does not write workflow skills there.

### Hermes Agent

OpenSpec links each skill into the project's `.hermes/skills/` folder. Hermes
v2026.6.5 and later load that folder once you trust the repo: run
`hermes skills trust` inside the project. Until then, Hermes shows a notice that it
found project skills but did not load them. On older versions, add the project's
`.hermes/skills/` folder to `skills.external_dirs` in `~/.hermes/config.yaml`
instead. Init prints this reminder after install.

### MiniMax Code

- **Global only**: skills go to `~/.minimax/skills/`. Nothing is written inside
  the repo.

### Warp

- **What OpenSpec claims**: nothing in `.warp/`. Warp settings and `WARP.md` are not
  created or edited.

### Other / Universal (shared `.agents` skills)

- **When it fits**: any tool that reads the shared `.agents/skills/` folder,
  including tools with no row in the matrix. It is the entry to pick when your
  assistant is not listed. The init picker's search box finds it by `universal`,
  `other`, `generic`, `custom`, `proprietary`, `unlisted`, `unsupported`,
  `vendor-neutral`, or `agents.md`.
- **Alongside other tools**: every tool reads this one skill tree. `.openspec-target`
  lists the tools set up in the project. To remove a tool, delete its folder (or, for a tool
  with no folder of its own, its line in `.openspec-target`).
- **Your own `openspec-*` skills**: a skill already in `.agents/skills/` before
  OpenSpec used the folder is kept, never written over, and recorded as
  `keep <skill>` in `.openspec-target`. Delete that skill to let OpenSpec write its own.
- **What OpenSpec claims**: only the `openspec-*` folders and the `.openspec-target`
  list. Anything else under `.agents/` is left alone.
- **`AGENTS.md`**: not created or edited. The target is the `.agents/` folder, not
  the file.
