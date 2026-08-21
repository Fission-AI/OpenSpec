# Schemas

> Change what OpenSpec produces: the artifacts, their order, and their templates.

A schema defines what a change proposal produces: which artifacts, in what order, from which templates. For example, [spec-driven](../reference/schemas/spec-driven/index.md), the default bundled schema, produces these four in roughly this order, each building on what came before:

```
proposal → specs → design → tasks
```

Fork a schema when you want these to be different documents, whether that means fewer of them, different names, or a different structure.

## Where schemas live

OpenSpec looks for a schema in three places, in order, and uses the first one it finds:

1. **Your project**: `openspec/schemas/`, committed with the repo so your whole team gets it.
2. **Your machine**: `~/.local/share/openspec/schemas` on macOS and Linux, or `%LOCALAPPDATA%\openspec\schemas` on Windows. Schemas here are available in every project you work in.
3. **The package**: the built-ins, like `spec-driven`, ship inside openspec itself.

The same name can exist in more than one place, and the more specific location wins. `openspec schema which` shows which copy is in use:

```
$ openspec schema which spec-driven
Schema: spec-driven
Source: project
Path: /your-project/openspec/schemas/spec-driven

Shadows:
  package: .../openspec/schemas/spec-driven
```

## What's in a schema

A schema is defined by a folder of plain files: one schema.yaml that declares the artifacts, and a template for each of them. Here's the built-in `spec-driven`:

```
spec-driven/
├── schema.yaml
└── templates/
    ├── proposal.md
    ├── spec.md
    ├── design.md
    └── tasks.md
```

- **schema.yaml**: declares each artifact, the file it generates, the template it starts from, what it requires first, and the instruction the agent receives when creating it. Every field's contract is in [schema.yaml](../reference/schemas/schema-yaml.md).
- **templates/**: one markdown skeleton per artifact, which the agent fills in.

Here's the tasks artifact's entry in schema.yaml, trimmed:

```yaml
artifacts:
  - id: tasks
    generates: tasks.md
    description: Implementation checklist with trackable tasks
    template: tasks.md
    instruction: |
      ...what the agent is told when creating tasks.md...
    requires:
      - specs
      - design
```

The built-in schemas ship inside the openspec package, so you never edit them in place. You get your own copy by forking.

## Creating your own custom schema

There are two ways to get your own schema:

1. **Fork an existing schema** and edit your copy. Start here when an existing schema is close to what you want, because everything in it already works.
2. **Start from scratch** when none of them fit, scaffolding an empty schema with `openspec schema init`.

### Fork an existing schema

1. Fork the schema you want to start from, running from your project root:

   ```console
   $ openspec schema fork spec-driven

   Note: Schema commands are experimental and may change.
   ✔ Forked 'spec-driven' to 'spec-driven-custom'

   Source: .../openspec/schemas/spec-driven (package)
   Destination: /your-project/openspec/schemas/spec-driven-custom
   ```

   Pass a second argument to pick the name (`openspec schema fork spec-driven team-flow`). Names are kebab-case.

2. Edit the copy: schema.yaml and the templates. [Editing your fork](#editing-your-fork) covers what to change.

3. Validate it:

   ```bash
   openspec schema validate spec-driven-custom
   ```

   This is the one command that catches a broken schema (missing templates, bad YAML, dependency cycles) before you're in the middle of a change.

4. Point your project at it in openspec/config.yaml. This step is yours to do because fork leaves config.yaml untouched:

   ```yaml
   schema: spec-driven-custom
   ```

5. New change proposals now follow your schema. Changes created earlier keep the schema they started with.

To replace the default everywhere without touching config.yaml, fork to the same name: `openspec schema fork spec-driven spec-driven`. Your project's copy then shadows the built-in, as [Where schemas live](#where-schemas-live) explains.

### Start from scratch

`openspec schema init` scaffolds a new schema instead of copying one:

```console
$ openspec schema init lite --description "Lite flow" --artifacts proposal,tasks

✔ Created schema 'lite'
Schema created at: /your-project/openspec/schemas/lite
Artifacts: proposal, tasks
```

The scaffold is bare. Artifacts come from the built-in four ids only, and the generated templates carry no instructions, so the agent gets less guidance until you write your own. From there the fork steps apply unchanged: validate it, then point config.yaml at it.

## Editing your fork

A fork has two kinds of files to edit:

- **templates/** change the skeleton of each document. Add a section to the tasks template and every new tasks.md starts with it.
- **schema.yaml** changes the workflow itself: which artifacts exist, what each one requires first, and the instruction the agent gets when creating it.

For example, to drop the design document for a leaner flow:

1. Delete the `design` entry from schema.yaml.
2. Remove `design` from the `requires` list of `tasks`.
3. Validate:

   ```console
   $ openspec schema validate spec-driven-custom

   ✓ Schema 'spec-driven-custom' is valid
   ```

Skip step 2 and validate catches it:

```console
✗ Schema 'spec-driven-custom' has errors:
  error: Invalid dependency reference in artifact 'tasks': 'design' does not exist
```

Validate after every hand-edit. A broken schema otherwise surfaces in the middle of a change, when a workflow asks for a file that isn't there. Like config.yaml, schema edits reach the agent on the next run.

## A fork is a snapshot

`openspec update` refreshes the installed skills and commands, and it never touches `openspec/schemas/`. Your fork keeps working exactly as you left it, which also means it stops receiving improvements when the built-in schema evolves. To pick those up later, fork the built-in again under a new name and port the differences across.

## Sharing schemas

Sharing a schema means copying its folder.

- **With your team**: commit `openspec/schemas/` and everyone on the repo uses it.
- **Across your projects**: put the folder in the user-level directory from [Where schemas live](#where-schemas-live).
- **From the community**: the [community catalog](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md#community-schemas) lists shared schemas. Copy one into `openspec/schemas/<name>` and it works like your own.

We're working on a schema registry, public and private, so schemas can be installed by name instead of copied by hand.
