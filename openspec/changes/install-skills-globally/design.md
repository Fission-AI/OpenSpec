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
- **The release tag.** If the tag for the running version isn't published yet, the install falls back to the default branch, which holds the same skills at release time. Only a missing tag does this. Any other failure, such as no connection, is reported and nothing from another release is installed.

`OPENSPEC_SKILLS_SOURCE` points the install at another source, such as a local copy of the `skills/` folder. The tests use it so they never touch the network.

### D3. Reinstalling is the update

The API has no update call. `openspec update` first compares the installed skills with the text this CLI publishes. If they match, and no skill or tool was added or dropped, it says so and fetches nothing. Otherwise it installs the skills for the running version again, which replaces what is there. A skill the profile no longer wants is removed with `removeSkills`, and only if the lock file says OpenSpec installed it.

Edits to a skill OpenSpec installed are replaced without a backup. That is the package's behavior and we follow it, but not silently: `update` names each global skill whose edits it replaced, in the words a project update uses, and a dry run warns first.

### D4. Scope is read from disk, with one saved answer

The first of these that applies decides:

| Situation | Scope |
|---|---|
| `--scope` given | That one |
| Project has its own OpenSpec skills or commands | Project |
| `OPENSPEC_SKILLS_SCOPE` set | That one |
| `skillsScope` saved in the global config | That one |
| The global skills are installed | Global |
| At a terminal | Ask once, save the answer; global is the first choice |
| Scripted, nothing saved | Global |

A project doesn't record that it uses the global skills. Having none of its own is the record, so there is nothing for a teammate's CLI to misread, and a 2.0 CLI sees such a project as one with no tools set up.

A scripted run gets the same default as the question. This changes what `openspec init --tools …` does in a new project, so three things keep it from breaking anyone:

- **It falls back to the project when global can't serve the request**, and prints why: a tool the global skills don't cover, the Copilot cloud files, or no git to fetch with. Only the pure default does this; an explicit choice of global reports the problem.
- **One setting restores project installs** for a script, a CI job or a whole machine: the flag, the environment variable, or the saved choice.
- **A project that already has its own skills is never moved** by a default.

### D5. `--tools` adds to the global install

The global tool list belongs to the machine, and `init` runs once per project. If `--tools codex` replaced the list, setting up a second project would silently unlink the first project's tool. So `--tools` adds, and existing tools are refreshed. Removing a tool is `npx skills remove --global --agent <id>`.

### D6. Moving a project to the global skills

`openspec init --scope global` in a project with its own skills removes them with 2.0's installer, asked for no workflows. It first runs that as a dry run. If any skill has the user's changes, init stops and names it, and nothing is removed. Only that project changes.

### D7. Tools the package doesn't know

Nine tools have no agent id in the package: AtomCode, CoStrict, DeepSeek Harness, EasyCode, GigaCode, GSD, Oh My Pi, SourceCraft Code Assistant and Veai. MiniMax Code is left out on purpose, because its project install already writes to `~/.minimax/skills/` and two installers must not share a folder. Init says so and sets up the rest. Those tools keep project skills.

### D8. What a global install never touches

- A skill with an OpenSpec name that the lock file doesn't attribute to OpenSpec. It is skipped and named, not replaced.
- The home folder as a project. `init` with the global scope refuses to run there, and `update` there only refreshes the global skills.
- A project's own skills, until the global install has succeeded. A failed install, or one that installs nothing, leaves the project as it was.
- A project set up for a tool the global skills don't cover, or with the Copilot cloud files. Moving it is refused, because that tool or the cloud agent would be left with no skills.
- A project's skills when the machine did not get every one of them. A skill the global install had to leave alone keeps the whole project where it is.
- A skill of the user's in a tool's own folder. The tool is installed for without that skill.
- A `skills-lock.json` that links outside the project. It is never passed to the package or rewritten.
- A real folder in a tool's home skills folder. Only a tool whose entries are links to the shared copy counts as set up, so a folder the user put there is never replaced.
- A skill that only a tool outside this install holds, such as MiniMax Code's own copies.

### D9. Project installs go through the package too

`installSharedSkills`, 2.0's installer, keeps the parts that are about OpenSpec's own history and hands the writing to the package:

| Step | Who does it |
|---|---|
| Decide which skills are the user's and must not be replaced | OpenSpec, as in 2.0 |
| Remove the copies 1.x left in tool folders | OpenSpec, as in 2.0 |
| Write `.agents/skills/<skill>` and record it in `skills-lock.json` | the `skills` package |
| Link a tool's folder | the package where it uses the same folder OpenSpec does; OpenSpec for the rest and on Windows |
| Remove a skill the profile dropped | the package for what it recorded, then OpenSpec for what is left |

- **Up to date means the text matches.** Installed skills carry no version line, so `update` compares them with the text this CLI publishes. A matching project is left alone and nothing is fetched.
- **A project install never needs git.** If the skills can't be fetched, the CLI writes the same text itself and says the lock file wasn't written. The global install still stops, because it is new and opt-in.
- **A skill folder with the user's files beside `SKILL.md`** is written by the CLI, not the package, because the package replaces the whole folder.
- **A dry run plans the same text** and the lock file change, and calls neither the network nor the package.
- **A teammate on 2.0** reads the unstamped skills as edited and rewrites them, and marks them as kept if their profile drops them. This CLI puts both right on its next update: a kept mark only holds while the skill's text isn't OpenSpec's.

### D10. Remember which projects use OpenSpec

Moving to the global skills is done one project at a time, and nothing told the user which projects were left. `openspec init` and `openspec update` now note the project they ran in, in `projects.json` in the global data folder. On a machine with the global skills, `update` and `init --scope global` name the noted projects that still have their own skills and give the command that moves one.

- **It only names them.** Moving a project removes files from it, so that stays a command the user runs in that project.
- **It never fails a command.** A list that can't be read or written is treated as empty.
- **It looks after itself.** A project whose `openspec/` folder is gone drops off. A dry run records nothing.
- **It stays on the machine.** Paths are never sent anywhere, telemetry included.
- **It starts empty.** A project is known once a 2.1 CLI has run `init` or `update` in it.
- **It trusts nothing in the file.** Only absolute paths without control characters are read, a file over 1 MB is ignored, and a project on a drive that isn't mounted is neither named nor dropped.

### D11. Skills installed earlier with `npx skills add` are OpenSpec's

`npx skills add Fission-AI/OpenSpec` installs whatever `skills/` held that day, and that text was never one the CLI generated. It read as the user's own edit: a project kept those skills as "yours" beside the new ones, and the global update warned about edits nobody made. `scripts/capture-released-fingerprints.mjs` now also records every text `skills/` has held, from git history, so these are replaced like any other OpenSpec file.

A global install made for a single tool leaves real copies in that tool's own folder and none in the shared one, and the package does the same for Antigravity, and for any tool where it can't make a link. So a tool counts as set up when its folder holds, for one of OpenSpec's skills, a link or a copy with OpenSpec's text:

| In the tool's folder | Read as |
|---|---|
| A link | OpenSpec's |
| A copy with the current text | OpenSpec's, and up to date |
| A copy with an earlier release's text | OpenSpec's, and replaced on update |
| The folder the lock file records for the skill, edited, in a tool that is set up | OpenSpec's: replaced, and the edit named |
| Any other folder: the user's text, or no skill in it | The user's: left alone and named |

A copy counts only for a tool the global install covers and that the package gives a folder of its own. That leaves out MiniMax Code, whose copies belong to its project install, and the tools that read the shared folder. Which tools get their own folder is the package's call: its "universal" flag describes the project folder, and Antigravity is universal there but not globally. A test installs for every covered tool and fails if OpenSpec and the package disagree.

### D12. A removal never takes the user's own folder

When the profile drops a skill, the package removes that name from every tool's folder, whatever is in it. Before the removal, any folder of that name holding something other than OpenSpec's text is renamed aside, and it is renamed back straight after. An edit in OpenSpec's own copy of a dropped skill is named, in a dry run and after the real one, like any other replaced edit.

## Risks

- **A project install fetches too.** `openspec init --scope project` and `openspec update` now install a project's `.agents/skills` with the same package, from the same published skills, and record them in `skills-lock.json`. 2.0's installer still decides what is the user's, makes the links for tools the package doesn't know, and migrates 1.x projects. When the skills can't be fetched (no git, no connection), it writes the same text itself and says the lock file is missing, so a project install never fails for that. The installed text has no version stamp: a project is up to date when its skills equal the text this CLI publishes.
- **Both copies present.** A project with its own skills on a machine with the global ones may show each skill twice. `openspec update` says so and names the command that fixes it.
- **Yarn 1 on Node 22.12 to 22.19** refuses a dependency whose `engines` it doesn't meet. npm and pnpm only warn.
