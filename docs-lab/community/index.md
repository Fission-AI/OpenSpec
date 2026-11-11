# Community

> Explore custom schemas and projects built by the OpenSpec community.

- [Custom schema examples](#custom-schema-examples): workflows you can adapt to your project.
- [Community projects](#community-projects): open-source tools and extensions.

These projects are maintained independently. A listing does not imply OpenSpec support or endorsement. Use each project's documentation and issue tracker for setup and help.

## Custom schema examples

These schemas live in their maintainers' repositories and are released separately from OpenSpec. Follow the repository's installation and compatibility notes. For how schema folders work, see [Schemas](../customize/schemas.md).

### Planning and coordination

- **[intent-driven](https://github.com/intent-driven-dev/openspec-schemas/tree/main/openspec/schemas/intent-driven)** by @harikrishnan83: Records change intent, observable behavior, technical design, and architectural decisions. Includes a review manifest for decisions that should become durable ADRs.
- **[nanopm](https://github.com/nmrtn/nanopm/tree/main/openspec-schema)** by @nmrtn: Connects product planning to implementation. Uses nanopm's audit, strategy, roadmap, and PRD as inputs to OpenSpec artifacts.
- **[epic-driven](https://github.com/IvanFeric/openspec-epic-driven/tree/main/openspec/schemas/epic-driven)** by @ivanferic: Splits an epic into child stories. Plan, implement, and archive the stories individually, then sync their progress back to the epic. The epic has no apply phase.

### Review and execution

- **[superpowers-bridge](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge)** by @JiangWay: Connects OpenSpec artifacts to Superpowers execution skills, including planning, TDD, and code review. Adds a retrospective artifact for recording evidence from the work.
- **[anvil](https://github.com/jikkujoyce/openspec-schemas/tree/main/schemas/anvil)** by @jikkujoyce: Adds an adversarial review and a test plan before implementation. Maps spec scenarios to tests and tracks red/green results for verification.
- **[egm](https://github.com/lutfi-zain/openspec-schema-egm)** by @lutfi-zain: Adapts Google's Elephant-Goldfish Model. Instructs fresh-context reviewers to run five review stages and reach two clean rounds before the final review. Its flow is proposal → specs and design → review → tasks → apply.

**Review gates:** anvil and egm give the agent review instructions. OpenSpec checks that artifacts exist, not that a reviewer approved them. Use your own CI or hook if approval must be enforced.

### Testing and research

- **[e2e-runbooks](https://github.com/Lukk17/openspec-schemas/tree/master/openspec/schemas/e2e-runbooks)** by @Lukk17: Defines end-to-end test runbooks for each capability. Keeps a spec, a task template, and a timestamped record of each execution, with assertions about observable behavior.
- **[ml-research](https://github.com/idealo/openspec-schemas/tree/main/openspec/schemas/ml-research)** by @tsenst: Plans machine-learning experiments. Sets evaluation criteria before the run and records evidence-backed findings afterward, including refuted hypotheses.

## Community projects

### Tools and integrations

- **[OpenSpec Workbench](https://github.com/VeryComplexAndLongName/OpenSpec-UI)**: A UI for running and supervising agents working on OpenSpec changes.
- **[openspec-guard](https://github.com/guillaume-flambard/spec-guard)**: A CLI and GitHub Action that reports which spec scenarios have Vitest or Jest coverage. It does not run the tests.
- **[rightcommit](https://github.com/rightcommit/rightcommit/blob/main/ADD-OPENSPEC.md)**: A self-hosted, Apache-2.0 orchestrator with a guide to running OpenSpec's propose, apply, and archive skills through Claude Code, Codex, or Pi. An optional human review step sits before implementation. Requires a local account and your own agent API keys or authorized provider access.

## Add a schema or project

[Open an issue](https://github.com/Fission-AI/OpenSpec/issues/new/choose) with the name, a public source repository link, and a short description of how it supports OpenSpec. For a schema, include its maintainer and what the workflow changes. Maintainers review and add entries here.

- Describe what people can use. Leave out promotional claims, referral links, and tracking links.
- Include an open-source license and a documented OpenSpec integration or example.
- The OpenSpec functionality must work without requiring the project's proprietary hosted service.
- Disclose any required coding-agent accounts or credentials.

Use the same issue process to correct or update a listing.
