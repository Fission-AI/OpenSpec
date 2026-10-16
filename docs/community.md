# Community Showcase

A community-owned awesome list of projects and resources built with and for OpenSpec. Tools, integrations, workflows, and learning resources are welcome. Community members grow this showcase by opening issues; maintainers add the entries.

Listed projects are maintained independently. Inclusion does not imply official support or endorsement by OpenSpec. See each project's documentation and issue tracker for setup and support.

## Projects and resources

- **[OpenSpec Workbench](https://github.com/VeryComplexAndLongName/OpenSpec-UI)**: Running and supervising agents on OpenSpec changes.
- **[openspec-guard](https://github.com/guillaume-flambard/spec-guard)**: CLI and GitHub Action that reports which OpenSpec scenarios are covered by a Vitest or Jest test, without running the tests.

## Hosted services

Hosted products that add an OpenSpec capability the CLI does not provide. Each entry states its account, payment, and data-handling terms.

- **[MySpec](https://myspec.dev)**: Cloud beta (account required; free tier, no credit card) that conducts guided spec interviews and exports four-file bundles or OpenSpec-compatible changes. Its MCP server (`@myspec/mcp-server`) and [Claude Code plugins](https://github.com/myspecs/claude-plugins) let coding agents read those specs, write OpenSpec changes, and implement them task by task. The service sends submitted content to third-party AI providers and is not designed for sensitive data.
- **[Entalpa](https://entalpa.com/en/openspec)**: Imports a public GitHub repository's `openspec/specs/` (up to 300 requirements) into a browsable project, adds stakeholders, stories and open questions labeled as inferred, and exports the result as an `openspec/specs/` tree; it never writes to the repository. Importing and reading need no account; saving or editing needs one, and AI features use paid credits. Imported content is sent to third-party AI providers.
- **[OpenSpec Review](https://skillgild.dev/skills/openspec-review) and [OpenSpec Compact](https://skillgild.dev/skills/openspec-compact)**: Hosted skills from SkillGild for Claude Code, Codex, Cursor, Gemini CLI or any MCP client. Review publishes a change as a link where anyone holding it can approve, request changes or comment per requirement without an account, shows the main spec as `openspec archive` would write it, and flags requirements that other open changes also touch. Compact finds lexically similar requirements and repeated scenarios across main specs and writes the cleanup as an OpenSpec change. Requires the SkillGild CLI and a free account (25 runs a month per skill). Both send spec content to SkillGild's servers, which run closed-source code and make no AI model call; Review also sends the proposal, design and tasks, and keeps the change for 30 days.

## Add your project

Open an issue with the one line you would like added: your project's name, a direct link, and a short description of how it relates to OpenSpec. A maintainer adds it to this file — we don't accept unsolicited pull requests ([why](https://openspec.dev/blog/openspec-contribution-policy/)).

- Keep entries focused on something built with OpenSpec or supporting its use, rather than general product advertising.
- Describe what people can use. Avoid promotional claims, referral links, and tracking links.
- Disclose paid features or required accounts in the entry, if any.
- Hosted or paid services are listed under Hosted services only when they add an OpenSpec capability the CLI does not already provide and have a free way to try them. A service that repackages OpenSpec's own skills or commands is not listed.

Corrections and updates to existing entries are welcome too.
