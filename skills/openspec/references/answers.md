# Answers to common questions

Use this when the user asks how OpenSpec works or how to set it up. Check an answer against the CLI's own help (`openspec <command> --help`) before you rely on a flag.

## Where things live

- `openspec/specs/<capability>/spec.md`: how the system behaves today, as requirements with scenarios.
- `openspec/changes/<name>/`: one planned change. Usually `proposal.md`, `specs/` (the spec updates), `design.md` (optional), and `tasks.md`.
- `openspec/changes/archive/`: finished changes.
- `openspec/config.yaml`: the project's schema, `context` lines every agent reads, and per-artifact `rules`.

## Checking things

- What is in progress: `openspec list`. The specs: `openspec list --specs`.
- Where one change stands: `openspec status --change "<name>"`.
- Read a change or a spec: `openspec show "<name>"`.
- Check the files are well formed: `openspec validate "<name>"`, or `openspec validate --all`.
- A dashboard of everything: `openspec view`.

## Setting things up

- Set up a project, or add an agent to it: `openspec init`.
- Choose which skills are installed: `openspec config profile`, then `openspec update` in each project.
- Refresh the skills after upgrading OpenSpec: `openspec update`.
- Teach agents something about this project: add a short line under `context` in `openspec/config.yaml`. Edit the file only after the user approves the wording.
- See or change the artifact workflow: `openspec schemas` lists the schemas, `openspec templates` shows where each artifact's template comes from.

## Stores

A store is a separate OpenSpec repository registered on this machine, for specs that live outside the code. `openspec store --help` lists its commands. Most commands accept `--store <id>` to work in a store instead of this project.

## Something is wrong

- Run `openspec doctor` and read what it reports.
- To tell the maintainers, use `openspec feedback "<message>"`, after the user approves the message.
