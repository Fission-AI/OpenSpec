<p align="center">
  <a href="https://github.com/<you>/clearspec">
    <picture>
      <source srcset="assets/clearspec_bg.png">
      <img src="assets/clearspec_bg.png" alt="ClearSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/<you>/clearspec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/<you>/clearspec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/clearspec"><img alt="npm version" src="https://img.shields.io/npm/v/clearspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>The most loved spec framework.</strong></summary>

[![Stars](https://img.shields.io/github/stars/<you>/clearspec?style=flat-square&label=Stars)](https://github.com/<you>/clearspec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/clearspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/clearspec)
[![Contributors](https://img.shields.io/github/contributors/<you>/clearspec?style=flat-square&label=Contributors)](https://github.com/<you>/clearspec/graphs/contributors)

</details>
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
> **New workflow now available!** We've rebuilt ClearSpec with a new artifact-guided workflow.
>
> Run `/clsx:propose "your idea"` to get started. → [Learn more here](docs/clsx.md)

<p align="center">
  Follow <a href="https://x.com/0xTab">@0xTab on X</a> for updates · Join the <a href="https://discord.gg/YctCnvvshC">ClearSpec Discord</a> for help and questions.
</p>

<!-- TODO: Add GIF demo of /clsx:propose → /clsx:archive workflow -->

## See it in action

```text
You: /clsx:propose add-dark-mode
AI:  Created clearspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/       — requirements and scenarios
     ✓ design.md    — technical approach
     ✓ tasks.md     — implementation checklist
     Ready for implementation!

You: /clsx:apply
AI:  Implementing tasks...
     ✓ 1.1 Add theme context provider
     ✓ 1.2 Create toggle component
     ✓ 2.1 Add CSS variables
     ✓ 2.2 Wire up localStorage
     All tasks complete!

You: /clsx:archive
AI:  Archived to clearspec/changes/archive/2025-01-23-add-dark-mode/
     Specs updated. Ready for the next feature.
```

<details>
<summary><strong>ClearSpec Dashboard</strong></summary>

<p align="center">
  <img src="assets/clearspec_dashboard.png" alt="ClearSpec dashboard preview" width="90%">
</p>

</details>

## Quick Start

**Requires Node.js 20.19.0 or higher.**

Install ClearSpec globally:

```bash
npm install -g clearspec@latest
```

Then navigate to your project directory and initialize:

```bash
cd your-project
clearspec init
```

Now tell your AI: `/clsx:propose <what-you-want-to-build>`

If you want the expanded workflow (`/clsx:new`, `/clsx:continue`, `/clsx:ff`, `/clsx:verify`, `/clsx:bulk-archive`, `/clsx:onboard`), select it with `clearspec config profile` and apply with `clearspec update`.

> [!NOTE]
> Not sure if your tool is supported? [View the full list](docs/supported-tools.md) – we support 25+ tools and growing.
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


## Community schemas

Third-party schema bundles distributed via standalone repositories — these provide opinionated workflows that integrate ClearSpec with other tools, similar to how [github/spec-kit's community extension catalog](https://github.com/github/spec-kit/tree/main/extensions) handles tool integrations.

→ **[Browse the catalog](docs/customization.md#community-schemas)** in the customization docs.


## Why ClearSpec?

AI coding assistants are powerful but unpredictable when requirements live only in chat history. ClearSpec adds a lightweight spec layer so you agree on what to build before any code is written.

- **Agree before you build** — human and AI align on specs before code gets written
- **Stay organized** — each change gets its own folder with proposal, specs, design, and tasks
- **Work fluidly** — update any artifact anytime, no rigid phase gates
- **Use your tools** — works with 20+ AI assistants via slash commands

### How we compare

**vs. [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Thorough but heavyweight. Rigid phase gates, lots of Markdown, Python setup. ClearSpec is lighter and lets you iterate freely.

**vs. [Kiro](https://kiro.dev)** (AWS) — Powerful but you're locked into their IDE and limited to Claude models. ClearSpec works with the tools you already use.

**vs. nothing** — AI coding without specs means vague prompts and unpredictable results. ClearSpec brings predictability without the ceremony.

## Updating ClearSpec

**Upgrade the package**

```bash
npm install -g clearspec@latest
```

**Refresh agent instructions**

Run this inside each project to regenerate AI guidance and ensure the latest slash commands are active:

```bash
clearspec update
```

## Usage Notes

**Model selection**: ClearSpec works best with high-reasoning models. We recommend Codex 5.5 and Opus 4.7 for both planning and implementation.

**Context hygiene**: ClearSpec benefits from a clean context window. Clear your context before starting implementation and maintain good context hygiene throughout your session.

## Contributing

**Small fixes** — Bug fixes, typo corrections, and minor improvements can be submitted directly as PRs.

**Larger changes** — For new features, significant refactors, or architectural changes, please submit a ClearSpec change proposal first so we can align on intent and goals before implementation begins.

When writing proposals, keep the ClearSpec philosophy in mind: we serve a wide variety of users across different coding agents, models, and use cases. Changes should work well for everyone.

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

ClearSpec collects anonymous usage stats.

We collect only command names and version to understand usage patterns. No arguments, paths, content, or PII. Automatically disabled in CI.

**Opt-out:** `export CLEARSPEC_TELEMETRY=0` or `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>Maintainers & Advisors</strong></summary>

See [MAINTAINERS.md](MAINTAINERS.md) for the list of core maintainers and advisors who help guide the project.

</details>



## License

MIT
