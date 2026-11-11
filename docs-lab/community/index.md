# Community

> Explore custom schemas and projects built by the OpenSpec community.

- [Custom schema examples](#custom-schema-examples): workflows you can adapt to your project.
- [Community projects](#community-projects): open-source tools and extensions.

These projects are maintained independently. A listing does not imply OpenSpec support or endorsement. Use each project's documentation and issue tracker for setup and help.

## Custom schema examples

These schemas live in their maintainers' repositories and are released separately from OpenSpec. Follow the repository's installation and compatibility notes. For how schema folders work, see [Schemas](../customize/schemas.md).

| Schema | What it adds | Maintainer |
|---|---|---|
| [intent-driven](https://github.com/intent-driven-dev/openspec-schemas/tree/main/openspec/schemas/intent-driven) | Records change intent and architectural decisions before implementation. | @harikrishnan83 |
| [nanopm](https://github.com/nmrtn/nanopm/tree/main/openspec-schema) | Uses product audits, strategy, and PRDs to guide implementation. | @nmrtn |
| [epic-driven](https://github.com/IvanFeric/openspec-epic-driven/tree/main/openspec/schemas/epic-driven) | Splits epics into stories and tracks their progress. | @ivanferic |
| [superpowers-bridge](https://github.com/JiangWay/openspec-schemas/tree/main/superpowers-bridge) | Connects OpenSpec planning to Superpowers execution skills. | @JiangWay |
| [anvil](https://github.com/jikkujoyce/openspec-schemas/tree/main/schemas/anvil) | Adds adversarial review, test planning, and verification. | @jikkujoyce |
| [egm](https://github.com/lutfi-zain/openspec-schema-egm) | Adds independent review rounds before implementation. | @lutfi-zain |
| [e2e-runbooks](https://github.com/Lukk17/openspec-schemas/tree/master/openspec/schemas/e2e-runbooks) | Defines repeatable end-to-end tests and records each run. | @Lukk17 |
| [ml-research](https://github.com/idealo/openspec-schemas/tree/main/openspec/schemas/ml-research) | Structures experiments around evaluation criteria and recorded findings. | @tsenst |

**Review gates:** anvil and egm give the agent review instructions. OpenSpec checks that artifacts exist, not that a reviewer approved them. Use your own CI or hook if approval must be enforced.

## Community projects

| Project | What it adds | License |
|---|---|---|
| [OpenSpec Workbench](https://github.com/VeryComplexAndLongName/OpenSpec-UI) | A UI for running and supervising agents on OpenSpec changes. | MIT |
| [openspec-guard](https://github.com/guillaume-flambard/spec-guard) | Links spec scenarios to Vitest or Jest tests without running them. | MIT |
| [rightcommit](https://github.com/rightcommit/rightcommit) | Runs OpenSpec workflows across coding agents, with optional human review. | Apache-2.0 |

**rightcommit setup:** requires a local account and your own agent API keys or authorized provider access. See its [OpenSpec guide](https://github.com/rightcommit/rightcommit/blob/main/ADD-OPENSPEC.md).

## Add a schema or project

[Open an issue](https://github.com/Fission-AI/OpenSpec/issues/new/choose) with the name, a public source repository link, and a short description of how it supports OpenSpec. For a schema, include its maintainer and what the workflow changes. Maintainers review and add entries here.

- Describe what people can use. Leave out promotional claims, referral links, and tracking links.
- Include an open-source license and a documented OpenSpec integration or example.
- The OpenSpec functionality must work without requiring the project's proprietary hosted service.
- Disclose any required coding-agent accounts or credentials.

Use the same issue process to correct or update a listing.
