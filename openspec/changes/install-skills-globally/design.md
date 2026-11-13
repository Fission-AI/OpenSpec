## How it fits together

```
openspec init --scope global --tools claude,codex
        │
        └─ skills.installSkills('Fission-AI/OpenSpec', { ref: 'v<cli version>', scope: 'global', agents, skills })
                 ├─ clones the repository and reads its skills/ folder
                 ├─ ~/.agents/skills/<skill>/SKILL.md      one real copy
                 ├─ ~/.claude/skills/<skill>               link, for tools that need one
                 └─ ~/.agents/.skill-lock.json             the package's own record
```

`src/core/global-skills.ts` is the only file that imports `skills`. It holds one table (OpenSpec tool id to the package's agent id), no paths, and writes no skill text.

## Decisions

### D1. Use the `skills` package through its API

`installSkills`, `listSkills` and `removeSkills` cover install, state and cleanup. We call them in-process, not `npx skills` as a subprocess, so there is no second runtime to find. The package bundles into the standalone binary and runs without Node (checked with `bun build --compile`). It runs on Node 22.12, the oldest version OpenSpec supports, though its own `engines` field asks for 22.20.

Its telemetry is turned off on every call.

### D2. Install the skills the repository publishes

The CLI does not write skill text for a global install. The package clones `Fission-AI/OpenSpec` at the tag of the running CLI (`v2.1.0`) and installs from its `skills/` folder, the same files `npx skills add Fission-AI/OpenSpec` installs. The profile only picks which skills.

Two things had to change for the published files to be the right ones:

- **One text for every profile.** A skill used to be written differently depending on which other workflows were installed, so no single published file could match. Each of those 53 places now has one wording that is right either way ("use the `openspec-continue-change` skill if it is installed, otherwise ..."). A test holds this: every skill's text is the same for every workflow list.
- **The same reference style.** The published skills wrote `/openspec-propose`; they now write `openspec-propose`, as installed skills do.

What this costs:

- **git and a connection to GitHub.** Without git, init stops with a message that says so and names `--scope project`. That case is counted in telemetry (as the command name `skills:git-missing`, nothing else), so we learn how often it happens.
- **The release tag.** If the tag for the running version isn't published yet, the install falls back to the default branch, which holds the same skills at release time.

`OPENSPEC_SKILLS_SOURCE` points the install at another source, such as a local copy of the `skills/` folder. The tests use it so they never touch the network.

### D3. Reinstalling is the update

The API has no update call. `openspec update` installs the skills for the running version again, which replaces what is there. A skill the profile no longer wants is removed with `removeSkills`, and only if the lock file says OpenSpec installed it.

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

- **A project install fetches too.** `openspec init --scope project` and `openspec update` now install a project's `.agents/skills` with the same package, from the same published skills, and record them in `skills-lock.json`. 2.0's installer still decides what is the user's, makes the links for tools the package doesn't know, and migrates 1.x projects. When the skills can't be fetched (no git, no connection), it writes the same text itself and says the lock file is missing, so a project install never fails for that. The installed text has no version stamp: a project is up to date when its skills equal the text this CLI publishes.
- **Both copies present.** A project with its own skills on a machine with the global ones may show each skill twice. `openspec update` says so and names the command that fixes it.
- **Yarn 1 on Node 22.12 to 22.19** refuses a dependency whose `engines` it doesn't meet. npm and pnpm only warn.
