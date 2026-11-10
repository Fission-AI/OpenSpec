# Profiles

> Choose which workflows are installed.

A profile is your preference for which OpenSpec workflows (the [skills](../start/setup.md#the-workflow-files-skills) in your AI tool) are installed across your machine. The default profile is `core`. Include or exclude workflows and your selection is saved as the `custom` profile.

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

The picker lists all twelve workflows as checkboxes, with the installed ones checked. Any selection that isn't exactly the core six is saved as the `custom` profile, so you can also uncheck core workflows you don't use.

## Delivery (retired in 2.0)

OpenSpec 2.0 installs skills only, so the `delivery` setting no longer changes anything. An existing value is kept, and `openspec config set delivery <value>` still works but only prints a note. In 1.x, delivery chose between skills, commands, or both; [Upgrade to 2.0](../help/upgrade-to-2.md) covers what happens to command files.

## Switching profiles

Switching is two steps: change the profile on your machine, then update each project to apply it.

1. Change the profile:

   ```bash
   openspec config profile        # interactive
   openspec config profile core   # reset to the core six
   ```

2. Run the update in each project you work in:

   ```bash
   openspec update
   ```

When your current directory is an existing OpenSpec project, the interactive flow offers to run step 2 there for you.
