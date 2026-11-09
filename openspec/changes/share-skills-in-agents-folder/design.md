## Layout

```text
.agents/skills/openspec-propose/SKILL.md      the one real copy
.agents/skills/.openspec-target               every tool set up here, one id per line
.claude/skills/openspec-propose -> ../../.agents/skills/openspec-propose
```

## Decisions

### D1. Which tools get links

A tool gets links when it does not read project `.agents/skills`, or when we could not confirm that it does. Confirmed by installing each tool: Claude Code, Continue, ForgeCode (user folder only), Kiro, CodeBuddy, EasyCode, iFlow, CodeArts. Not testable without an account: Lingma, GigaCode, Veai, Rovo Dev, Code Studio. Hermes reads only its own folder plus configured ones. Every other project-skill tool reads `.agents/skills` and gets no link, so it never loads a skill twice.

### D2. Links

One link per skill folder, relative (`../../.agents/skills/<skill>`), like `npx skills`. A relative link survives moving or cloning the project; a Windows junction would store an absolute path, so on Windows we try a relative symlink and fall back to a plain copy. The link spot is classified on every run:

| What is there | Action |
|---|---|
| Nothing, or a link to the shared copy | Create or keep the link |
| A copy equal to the shared copy | Keep (the fallback); refresh it when the shared copy changes |
| A copy matching any released version | Replace with the link |
| Anything else | User's: keep and report; drift checks do not ask for a link there again |

### D3. One wording

Per-tool rendering existed so a skill could name its own tool's command (`/opsx:apply`, `$openspec-…`). One shared file cannot. Skills now name other workflows in plain language ("the openspec-propose skill"), which every tool resolves. Command files keep their per-tool wording.

### D4. Tool list instead of an owner

The marker used to name the single tool that rendered a shared folder. With one wording there is nothing to arbitrate, so the marker lists every tool set up in the project. The reader still accepts the old one-id file. A tool counts as set up when it is listed, or has links, commands, old skill copies or old commands. `.agents/skills` alone is no longer evidence of any one tool.

The list also records two things the folder alone can't show:

- **`<tool> own-files`**: OpenSpec gave the tool files of its own (commands or links). It stays set up only while some remain, so deleting its folder removes it, as in 1.x. A tool without them (skills-only, reading the shared folder) has only the list.
- **`keep <skill>`**: an `openspec-*` skill that was in `.agents/skills/` before OpenSpec used the folder (from `npx skills`, or hand-written). It is the user's: never written over or removed, and skipped by version and drift checks. Deleting it hands the name back.

### D5. Skills exist per project, not per tool

The shared copy exists when any listed tool needs skills under the current delivery, and holds the union of their workflows. Links follow each tool's own setting.

### D6. Moving old copies

Each tool's old `<skillsDir>/skills/openspec-*` folders are a skills-only former location, moved after the shared copy is written: untouched copies (equal to current, or to any released version) go; edited ones stay and are reported. Commands are never touched by this move. For linked tools the link goes where the old copy was, once it is gone.

## Risks

- **Committed links on Windows.** With git's `core.symlinks` off, a teammate on Windows checks links out as text files. `update` sees a non-link and replaces it with a copy. The docs say so.
- **Edited old copies** next to the shared copy are loaded twice by tools that read both, until the user deletes them; `update` reports each one.
