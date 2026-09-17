# Glossary

> Every OpenSpec term, one line each.

OpenSpec reuses words that mean something else in git, CI, and agent tooling. Each row gives the OpenSpec meaning. The last column links to more detail where available.

| Term | Definition | More |
|---|---|---|
| **Apply** | Implement the tasks in a change proposal. Skill: `openspec-apply-change`. | [Apply a change](skills.md#openspec-apply-change) |
| **Archive** | Complete a change proposal: merge its deltas into the main specs and move its folder to `openspec/changes/archive/`. | [Quickstart](../start/quickstart.md) |
| **Artifact** | A planning document inside a change proposal: `proposal.md`, delta specs, `design.md`, `tasks.md`. Not a build output. | [Artifacts](schemas/spec-driven/index.md#artifacts) |
| **Capability** | One behavior area of your system. Each has one spec at `openspec/specs/<capability>/spec.md`. | [Capabilities](schemas/spec-driven/index.md#proposalmd) |
| **Change proposal** | One unit of work: a folder under `openspec/changes/<name>/` holding its planning artifacts. Often shortened to "change". Not a git commit. | [Propose](../start/quickstart.md#step-2-propose) |
| **Command** | A typed entry point for a workflow. Spelling varies per tool (`/opsx:propose`, `/opsx-propose`). The docs name workflows by skill instead. | [Supported tools](supported-tools.md) |
| **Continue** | Create the next planning artifact for an existing change proposal. Skill: `openspec-continue-change`. | [Skills](skills.md) |
| **Delivery** | How workflows are installed: as skills, commands, or both. | [Set up your project](../start/setup.md) |
| **Delta spec** | A spec inside a change proposal listing only what changes, under `ADDED`, `MODIFIED`, `REMOVED`, and `RENAMED` headers. | [Delta specs](schemas/spec-driven/index.md#delta-specs-specmd) |
| **Explore** | Think an idea through with the agent before proposing. Writes no code. Skill: `openspec-explore`. | [Explore an idea](skills.md#openspec-explore) |
| **Fast-forward** | Create a change proposal with every planning artifact in one pass, ready to implement. Skill: `openspec-ff-change`. Not a git fast-forward. | [Skills](skills.md) |
| **Legacy workflow** | The pre-OPSX `/openspec:*` commands. |  |
| **Loop** | The cycle a change proposal moves through: explore, propose, review, apply, archive. | [Quickstart](../start/quickstart.md) |
| **Main specs** | The `openspec/specs/` tree: the current, agreed behavior of your system. Archiving merges deltas into it. A capability with no spec yet gets one from its `ADDED` requirements. | [Archive](../start/quickstart.md#step-5-archive) |
| **OpenSpec root** | The `openspec/` tree a command resolves to and operates on: your repo's, or a store's. | [Stores](../multi-repo/stores.md#where-artifacts-get-created-when-using-stores) |
| **OPSX** | The current OpenSpec workflow system, and the command prefix it installs (`/opsx:`). |  |
| **Profile** | Which workflows init installs: `core` or `custom`. | [Profiles](../customize/profiles.md) |
| **Propose** | Create a change proposal and generate all its planning artifacts in one step. Skill: `openspec-propose`. | [Quickstart](../start/quickstart.md) |
| **Registry** | The machine-level list of registered stores, in `registry.yaml`. Not a package registry. | [CLI](cli.md#openspec-store) |
| **Requirement** | One behavior the system must have, written with SHALL: `### Requirement:` in a spec. | [Delta specs](schemas/spec-driven/index.md#delta-specs-specmd) |
| **Scenario** | A testable example under a requirement, in WHEN/THEN form. | [Delta specs](schemas/spec-driven/index.md#delta-specs-specmd) |
| **Schema** | The definition of which artifacts a change proposal produces, and in what order. Not JSON Schema. | [Schemas](schemas/index.md) |
| **Skill** | A workflow's instructions, installed where your AI tool reads them (`.agents/skills/`, ...). | [Skills](skills.md) |
| **Spec** | A file describing how one capability behaves today, at `openspec/specs/<capability>/spec.md`. | [Archive](../start/quickstart.md#step-5-archive) |
| **spec-driven** | The default schema: proposal, then delta specs, then design, then tasks. | [spec-driven](schemas/spec-driven/index.md) |
| **Store** | A standalone OpenSpec repo registered on your machine, for planning that spans repositories. Not a data store. | [Stores (beta)](../multi-repo/stores.md) |
| **Sync** | Merge implemented deltas into the main specs without archiving. Skill: `openspec-sync-specs`. | [Skills](skills.md) |
| **Template** | The starting content a schema gives each artifact. | [Schemas](../customize/schemas.md) |
| **Update** | As a skill (`openspec-update-change`): revise a change proposal's planning artifacts. As a CLI command (`openspec update`): refresh OpenSpec's installed files. | [Update a change](skills.md#openspec-update-change), [CLI](cli.md) |
| **Verify** | Check the implementation matches a change proposal's artifacts before archiving. Skill: `openspec-verify-change`. | [Skills](skills.md) |
| **Workflow** | A named OpenSpec action (propose, apply, archive, ...), installed into your AI tool as a skill or command. | [Set up your project](../start/setup.md) |
| **Workset** | A personal, local group of folders opened together in one tool. Not a store, and nothing is shared. | [Worksets (beta)](../multi-repo/worksets.md) |
