## How it fits together

```
openspec init --scope global --tools claude,codex
        │
        ├─ OpenSpec writes the skill text ──▶ <data dir>/openspec/skills/<skill>/SKILL.md
        │
        └─ skills.installSkills(that folder, { scope: 'global', agents })
                 ├─ ~/.agents/skills/<skill>/SKILL.md      one real copy
                 ├─ ~/.claude/skills/<skill>               link, for tools that need one
                 └─ ~/.agents/.skill-lock.json             the package's own record
```

`src/core/global-skills.ts` is the only file that imports `skills`. It holds one table (OpenSpec tool id to the package's agent id) and no paths.

## Decisions

### D1. Use the `skills` package through its API

`installSkills`, `listSkills` and `removeSkills` cover install, state and cleanup. We call them in-process, not `npx skills` as a subprocess, so there is no second runtime to find. The package bundles into the standalone binary and runs without Node (checked with `bun build --compile`). It runs on Node 22.12, the oldest version OpenSpec supports, though its own `engines` field asks for 22.20.

Its telemetry is turned off on every call.

### D2. OpenSpec writes the text; the package installs it from a local folder

The published `skills/` folder in this repository is not what the CLI installs. It is one rendering for every profile, with `/openspec-propose` style references. The CLI writes tool-neutral references and drops mentions of workflows the profile doesn't install. Installing from the repository would change the text people get and bring back references to skills they don't have.

So the CLI generates the skills with the code a project install already uses, into `<data dir>/openspec/skills/`, and installs from there. This also means no git, no network, and no release tag that has to exist before the CLI works.

The cost: the lock file records a local path, so `npx skills update` can't refresh these skills. `openspec update` does. Pointing at the repository later is a change to one function, once its skills match what the CLI writes.

### D3. Reinstalling is the update

The API has no update call. `openspec update` writes the current text and installs it again, which replaces what is there. A skill the profile no longer wants is removed with `removeSkills`, and only if the lock file says OpenSpec installed it.

Edits to a skill OpenSpec installed are replaced without a backup. That is the package's behavior and we follow it.

### D4. Scope is read from disk, with one saved answer

| Situation | Scope |
|---|---|
| `--scope` given | That one |
| Project has its own OpenSpec skills or commands | Project |
| `skillsScope` saved in the global config | That one |
| The global skills are installed | Global |
| At a terminal | Ask once, save the answer |
| Scripted, nothing saved | Project, as in 2.0 |

A project doesn't record that it uses the global skills. Having none of its own is the record, so there is nothing for a teammate's CLI to misread, and a 2.0 CLI sees such a project as one with no tools set up.

Scripted runs default to the project because `openspec init --tools …` is in CI files and agent instructions today, and those expect project files.

### D5. `--tools` adds to the global install

The global tool list belongs to the machine, and `init` runs once per project. If `--tools codex` replaced the list, setting up a second project would silently unlink the first project's tool. So `--tools` adds, and existing tools are refreshed. Removing a tool is `npx skills remove --global --agent <id>`.

### D6. Moving a project to the global skills

`openspec init --scope global` in a project with its own skills removes them with 2.0's installer, asked for no workflows. It first runs that as a dry run. If any skill has the user's changes, init stops and names it, and nothing is removed. Only that project changes.

### D7. Tools the package doesn't know

Nine tools have no agent id in the package: AtomCode, CoStrict, DeepSeek Harness, EasyCode, GigaCode, GSD, Oh My Pi, SourceCraft Code Assistant and Veai. MiniMax Code is left out on purpose, because its project install already writes to `~/.minimax/skills/` and two installers must not share a folder. Init says so and sets up the rest. Those tools keep project skills.

### D8. What a global install never touches

- A skill with an OpenSpec name that the lock file doesn't attribute to OpenSpec. It is skipped and named, not replaced.
- The home folder as a project. `init` with the global scope refuses to run there, and `update` there only refreshes the global skills.
- A project's own skills, until the global install has succeeded. A failed install leaves the project as it was.

## Risks

- **A project install is still 2.0's installer.** Moving it to the `skills` package means re-proving every upgrade path from 1.x, so it is a separate change. Until then two installers exist: ours for projects, the package for the machine.
- **Both copies present.** A project with its own skills on a machine with the global ones may show each skill twice. `openspec update` says so and names the command that fixes it.
- **Yarn 1 on Node 22.12 to 22.19** refuses a dependency whose `engines` it doesn't meet. npm and pnpm only warn.
