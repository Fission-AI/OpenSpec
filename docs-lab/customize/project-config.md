# Project configuration

> Make the workflows plan changes the way you want with a few lines in config.yaml.

`openspec/config.yaml` tells the workflows how you want changes planned.

For example, the following configuration updates the creation rules for the [tasks.md](../reference/schemas/spec-driven/index.md) artifact:

```yaml
rules:
  tasks:
    - End every task with a commit
```

When the agent runs, it pulls from these rules and ensures every task ends with a commit step.

Keep rules short. Everything here lands in the agent's context, and verbose rules can make the output worse.

## How it works

config.yaml holds instructions the agent receives when it creates artifacts or works through the workflow.

Here's what happens on every run:

1. You run a workflow (e.g. `/openspec-propose`).
2. The agent calls the [`openspec instructions`](../reference/cli.md) command.
3. The command reads your context and rules from config.yaml.
4. OpenSpec's built-in instructions and your customizations are combined into a single prompt for the agent.
5. The agent follows that prompt to write the artifact.

For example, with a `context` field and the rule from the top of this page, here's what [`openspec instructions`](../reference/cli.md) returns for tasks.md (trimmed and annotated):

```xml
<artifact id="tasks" change="add-dark-mode" schema="spec-driven">

  <!-- From your config.yaml: context -->
  <project_context>
    Designs and tasks must cover Windows, macOS, and Linux
    Write all artifacts in Spanish
  </project_context>

  <!-- From your config.yaml: rules for tasks -->
  <rules>
    - End every task with a commit
  </rules>

  <!-- From OpenSpec: the built-in guidance -->
  <instruction>
    ...how to write a good tasks.md...
  </instruction>

  <template>
    ...the tasks.md structure to fill in...
  </template>

</artifact>
```

Your config arrives first, then OpenSpec's built-in instruction and template. Rules add to the built-ins and never replace them. Edits to config.yaml reach the agent on the next run.

## The fields

Four fields shape what the agent receives. Each field's exact contract (types, limits, validation) is in [Project configuration (config.yaml)](../reference/configuration/config-yaml.md).

| Field | What it does | Injected into |
|---|---|---|
| `context` | Instructions the agent always receives | Everything: every artifact, `apply`, `archive` |
| `rules` | Extra instructions for one artifact | Only that artifact's creation |
| `operations` | Guidance for how a workflow step is carried out | Only `apply` and `archive` |
| `lifecycle` | Named actions the agent offers or runs at one point in the workflow | Only the hooks you attach them to (creating a change, `apply`, `archive`) |

config.yaml's other fields (`schema`, `store`, `references`) select which schema and which OpenSpec root a project uses. The contract page covers them.

The last column is exact, so a field reaches only the steps listed there. In particular, `verify` never receives `rules`. It checks the implementation against the artifacts as written.

### context

`context` is background the agent receives when it creates an artifact, applies tasks, or archives a change.

```yaml
context: |
  We ship cross-platform. Designs and tasks must cover Windows, macOS, and Linux
  Write all artifacts in Spanish
```

Use `context` for facts and constraints that should shape workflow output. Keep durable project documentation in the project's documentation files, and leave out anything the agent can learn by reading the code.

**Another language**: because context reaches every artifact, you can add `Write all artifacts in Spanish.` to instruct the agent to write proposal, spec, design, and tasks artifacts in Spanish.

### rules

`rules` attach to one artifact, keyed by artifact id. Each line is added to that artifact's built-in guidance:

```yaml
rules:
  proposal:
    - Keep proposals under 500 words
  tasks:
    - Every UI task includes a Playwright test
```

Proposals now stay short and tasks.md always plans browser tests. Every other artifact is untouched.

### operations

`operations` guides how the agent carries out `apply` and `archive`, rather than what artifacts say:

```yaml
operations:
  apply:
    guidance:
      - Run the linter before marking a task complete
  archive:
    guidance:
      - Summarize what shipped before archiving
```

During apply, the agent lints as it completes tasks. During archive, it closes with a summary.

### lifecycle

`lifecycle` attaches a named action to a point in the workflow, such as the moment before apply edits code:

```yaml
lifecycle:
  actions:
    run-tests:
      instructions: Run the full test suite and report any failures.
  triggers:
    - on: change.apply.before
      action: run-tests
      mode: suggest
```

Before apply edits anything, the agent offers to run the tests. You can accept or skip. [Lifecycle actions](lifecycle-actions.md) covers the hooks, the modes, and ready-to-copy recipes.

## Which field to use

| Field | Use it for |
|---|---|
| `context` | Background facts about the project |
| `rules.<artifact>` | How to write or format one planning artifact |
| `operations.<operation>.guidance` | Ongoing advice while the agent applies or archives, like "run focused tests before the full suite" |
| `lifecycle` | One named job at one point in the workflow, like a requirements review before apply starts |

Guidance shapes how the agent works throughout an operation. A lifecycle action is one job done at one point.

## When config.yaml isn't enough

Config adds instructions on top of the standard workflow, but it can't change which artifacts exist or how they're structured. When you want that level of control, or rules aren't steering behavior consistently, [fork a schema](schemas.md).
