<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@enpal/enpalspec"><img alt="npm version" src="https://img.shields.io/npm/v/@enpal/enpalspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
</p>
<p></p>
Our philosophy:

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

> [!TIP]
> **New workflow now available!** We've rebuilt EnpalSpec with a new artifact-guided workflow.
>
> Start with `/enpalspec:explore "your idea"` to think it through, then `/enpalspec:propose` to generate all artifacts.


## See it in action

```text
You: /enpalspec:explore add-dark-mode
AI:  Let's think this through...
     What's the goal? Where does theming live today?
     Key decision: CSS variables vs. Tailwind dark mode?
     → Recommendation: CSS variables, stored in localStorage

You: /enpalspec:propose add-dark-mode
AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /enpalspec:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /enpalspec:archive
AI:  Archived to openspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```


## Quick Start

**Requires Node.js 20.19.0 or higher.**

Install EnpalSpec globally:

```bash
npm install -g @enpal/enpalspec@latest
```

Then navigate to your project directory and initialize:

```bash
cd your-project
enpalspec init
```

Now tell your AI: `/enpalspec:explore <what-you-want-to-build>` to think it through, then `/enpalspec:propose` to generate all artifacts.

> [!NOTE]
> Not sure if your tool is supported? [View the full list](docs/supported-tools.md) – we support 20+ tools and growing.
>
> Also works with pnpm, yarn, bun, and nix. [See installation options](docs/installation.md).

## Docs

→ **[Getting Started](docs/getting-started.md)**: first steps<br>
→ **[Workflows](docs/workflows.md)**: combos and patterns<br>
→ **[Commands](docs/commands.md)**: slash commands & skills<br>
→ **[CLI](docs/cli.md)**: terminal reference<br>
→ **[Supported Tools](docs/supported-tools.md)**: tool integrations & install paths<br>
→ **[Concepts](docs/concepts.md)**: how it all fits<br>
→ **[Multi-Language](docs/multi-language.md)**: multi-language support<br>
→ **[Customization](docs/customization.md)**: make it yours


## Why EnpalSpec?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. EnpalSpec adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Use your tools** — works with 20+ AI assistants via slash commands

### How we compare

**vs. [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Thorough but heavyweight. Rigid phase gates, lots of Markdown, Python setup. EnpalSpec is lighter and lets you iterate freely.

**vs. [Kiro](https://kiro.dev)** (AWS) — Powerful but you're locked into their IDE and limited to Claude models. EnpalSpec works with the tools you already use.

**vs. nothing** — AI coding without specs means vague prompts and unpredictable results. EnpalSpec brings predictability without the ceremony.

## Updating EnpalSpec

**Upgrade the package**

```bash
npm install -g @enpal/enpalspec@latest
```

**Refresh agent instructions**

Run this inside each project to regenerate AI guidance and ensure the latest slash commands are active:

```bash
enpalspec update
```

## Usage Notes

**Model selection**: EnpalSpec works best with high-reasoning models. We recommend Opus 4.5 and GPT 5.2 for both planning and implementation.

**Context hygiene**: EnpalSpec benefits from a clean context window. Clear your context before starting implementation and maintain good context hygiene throughout your session.

## Contributing

**Small fixes** — Bug fixes, typo corrections, and minor improvements can be submitted directly as PRs.

**Larger changes** — For new features, significant refactors, or architectural changes, please submit an EnpalSpec change proposal first so we can align on intent and goals before implementation begins.

When writing proposals, keep the EnpalSpec philosophy in mind: we serve a wide variety of users across different coding agents, models, and use cases. Changes should work well for everyone.

**AI-generated code is welcome** — as long as it's been tested and verified. PRs containing AI-generated code should mention the coding agent and model used (e.g., "Generated with Claude Code using claude-opus-4-5-20251101").

### Development

- Install dependencies: `pnpm install`
- Build: `pnpm run build`
- Test: `pnpm test`
- Develop CLI locally: `pnpm run dev` or `pnpm run dev:cli`
- Conventional commits (one-line): `type(scope): subject`

## Other

<details>
<summary><strong>Telemetry</strong></summary>

EnpalSpec collects anonymous usage stats.

We collect only command names and version to understand usage patterns. No arguments, paths, content, or PII. Automatically disabled in CI.

**Opt-out:** `export OPENSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>Maintainers & Advisors</strong></summary>

See [MAINTAINERS.md](MAINTAINERS.md) for the list of core maintainers and advisors who help guide the project.

</details>



## Built on OpenSpec

EnpalSpec is a fork of [OpenSpec](https://github.com/Fission-AI/OpenSpec) by Fission AI. Thanks to the OpenSpec team for the foundation.

## License

MIT
