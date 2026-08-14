# Profiles

> Choose which workflows are installed, and whether they install as skills, commands, or both.

A profile is your preference for which OpenSpec workflows (the [skills and commands](../start/setup.md#the-workflow-files-skills-and-commands) in your AI tool) are installed across your machine. The default profile is `core`; include or exclude workflows and your selection is saved as the `custom` profile.

## The core set

The `core` profile installs six workflows, covering the whole loop from idea to archive:

| Workflow | What it's for |
|---|---|
| [`explore`](../reference/skills.md#openspec-explore) | Think through an idea before it becomes a change proposal |
| [`propose`](../reference/skills.md#openspec-propose) | Create a change proposal and generate all its planning artifacts in one step |
| [`apply`](../reference/skills.md#openspec-apply-change) | Implement a change proposal's tasks |
| [`update`](../reference/skills.md#openspec-update-change) | Revise a change proposal's existing planning artifacts |
| [`sync`](../reference/skills.md#openspec-sync-specs) | Merge a change proposal's spec updates into `specs/` without archiving it |
| [`archive`](../reference/skills.md#openspec-archive-change) | Move a finished change proposal to the archive |

Each links to its full contract: arguments, what it creates, and what it responds with.

## Expanding the set: optional workflows

Six more workflows are available beyond the core set. Three of them (`new`, `continue`, `ff`) create a change proposal artifact by artifact, instead of all at once like `propose`.

| Workflow | What it's for |
|---|---|
| [`new`](../reference/skills.md#openspec-new-change) | Start a change proposal as an empty scaffold |
| [`continue`](../reference/skills.md#openspec-continue-change) | Create the next planning artifact in a change proposal, one at a time |
| [`ff`](../reference/skills.md#openspec-ff-change) | Create a change proposal and every planning artifact implementation needs, in one pass |
| [`verify`](../reference/skills.md#openspec-verify-change) | Check that the implementation matches the change proposal's artifacts |
| [`bulk-archive`](../reference/skills.md#openspec-bulk-archive-change) | Archive several change proposals at once |
| [`onboard`](../reference/skills.md#openspec-onboard) | Learn the workflow by doing one real change proposal end to end |

To change the set, run the interactive picker:

```bash
openspec config profile
```

The picker asks what to configure ([delivery](#delivery-skills-commands-or-both), workflows, or both), then lists all twelve workflows as checkboxes, with the installed ones checked. Any selection that isn't exactly the core six is saved as the `custom` profile, so you can also uncheck core workflows you don't use.

## Delivery: skills, commands, or both

Delivery is a profile setting that lets you choose to have only skills or only commands installed. The default is `both`. [Set up your project](../start/setup.md#the-workflow-files-skills-and-commands) explains the two forms and why both exist. The field's exact contract is in [CLI settings (config.json)](../reference/configuration/config-json.md#delivery).

Two ways to change it:

**Interactively**: run `openspec config profile` and choose "Delivery only". Here's switching to skills only:

```
Current profile settings
  Delivery: both

? What do you want to configure? Delivery only
? Delivery mode (how workflows are installed): Skills only

Config changes:
  delivery: both -> skills
? Apply changes to this project now? (Y/n) y
```

**Directly**: one command, no prompts:

```bash
openspec config set delivery skills   # or: both, commands
```

Delivery never changes the profile name: `core` and `custom` describe the workflow set only, and switching back to `core` keeps your delivery setting.

## Switching profiles

Switching is two steps: change the profile on your machine, then update each project to apply it.

1. Change the profile:

   ```bash
   openspec config profile        # interactive
   openspec config profile core   # reset to the core six (keeps delivery)
   ```

2. Run the update in each project you work in:

   ```bash
   openspec update
   ```

When your current directory is an existing OpenSpec project, the interactive flow offers to run step 2 there for you.
