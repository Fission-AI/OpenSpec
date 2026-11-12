## Layout

The same layout `npx skills add -g` writes (skills CLI 1.8.1), so the two tools never fight over a path:

```text
~/.agents/skills/openspec-propose/SKILL.md     the one real copy
~/.agents/skills/.openspec-target              tools set up for this machine, as in a project
~/.claude/skills/openspec-propose -> ../../.agents/skills/openspec-propose
```

## Decisions

### D1. `--global` on the commands people already know

`openspec init --global` installs, `openspec update --global` refreshes. No new command (a separate `install` command read as "install the CLI") and no persisted scope setting (the earlier design needed migration rules and made every command consult it). Neither needs a project, and neither reads or writes one.

### D2. Which tools, and where

Each tool's home folder comes from the skills CLI's own table, so a skill installed either way lands in the same place:

| Group | Tools | What `--global` writes |
|---|---|---|
| Reads `~/.agents/skills/` | Amp, Cline, Codex, Cursor, Factory Droid, Gemini CLI, GitHub Copilot, Kilo Code, Kimi Code, OpenCode, Pi, Warp, Zed, the vendor-neutral target | Nothing more |
| Own home folder | Claude Code (`$CLAUDE_CONFIG_DIR` or `~/.claude`), Antigravity, Auggie, IBM Bob, Command Code, CodeArts, CodeBuddy, Code Studio, Continue, Crush, Devin Desktop, ForgeCode, Grok Build, Hermes Agent, iFlow, Junie, Kiro, Lingma, Mistral Vibe, Qoder, Qwen Code, Rovo Dev, Zoo Code, Trae, ZCode | One link per skill in its folder |
| No known home folder | AtomCode, CoStrict, DeepSeek Harness, EasyCode, GigaCode, GSD, Oh My Pi, SourceCraft, Veai | Refused with a note to set it up per project |

MiniMax Code already keeps its skills per machine and is unchanged.

### D3. The same safety rules as a project

The global install reuses the 2.0 installer with a home layout instead of a project one, so every rule from the 2.0 design (D9) holds: only text OpenSpec wrote is replaced or removed; an `openspec-*` skill that was in `~/.agents/skills/` before OpenSpec used the folder (from `npx skills`, or written by hand) is the user's and is kept; nothing is written through a link; a link spot holding anything else is kept and reported. Every path written must resolve inside the folder it belongs to, so a home folder linked elsewhere (a dotfiles repo) fails that tool, with a message, and never writes outside it.

### D4. Workflows come from the global profile

Skills are rendered from the global profile's workflows, with the same shared wording a project uses. A skill's text depends only on the version and the workflow set, never on a project, so one copy serves every project.

### D5. Switching a project, once, and saving it

A project with its own OpenSpec skills and a global install covering its tools holds two copies. Interactive `update` asks once: "Switch this project to your global skills?" On yes:

1. The project's OpenSpec skills and links are removed under the same rule as deselecting a workflow: unedited ones go, edited ones are kept and listed.
2. `skills: global` is saved in `openspec/config.yaml`.

On no, the project keeps its skills and `skills: project` is saved, so the question isn't asked again; `--use-global-skills` still switches it later. Non-interactive runs never switch and save nothing; they print one line naming `--use-global-skills`. The removals show in `git status`, so they are reviewed and committed like any change, and `--dry-run` lists them first.

With `skills: global`, `init` and `update` write no project skills. If this machine has no global install covering the project's tools, they say so and name `openspec init --global`; they never install globally on their own.

### D6. Older CLIs and teammates

A 2.0 CLI ignores `skills: global` (unknown keys are allowed). A switched project records its tools as `global <tool>` lines in `.agents/skills/.openspec-target`; 2.0 reads the first word of a line as a tool id, so its `update` finds no tools and writes nothing, while 2.1 still knows them (a teammate is told the exact `--tools`, and `skills: project` brings the skills back). 2.0's `init --tools` writes the project skills back. That is duplication, not loss, and Claude Code runs the personal copy over the project one. The docs ask teams to update their CLI before switching a shared repo.

## Risks

| Risk | Mitigation |
|---|---|
| One person's machine setting changes a shared repo | The switch is asked, saved in a committed file, and reviewed |
| A teammate loses skills after the switch | `update` tells them the one command to run |
| A tool's home folder is wrong | Paths come from the skills CLI's table; unknown tools are refused, not guessed |
| Global install overwrites someone's `npx skills` copy | Kept as the user's, the same rule a project uses |
