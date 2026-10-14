# Community Showcase

A community-owned awesome list of projects and resources built with and for OpenSpec. Tools, integrations, workflows, and learning resources are welcome. Community members grow and maintain this showcase through pull requests.

Listed projects are maintained independently. Inclusion does not imply official support or endorsement by OpenSpec. See each project's documentation and issue tracker for setup and support.

## Projects and resources

- **[OpenSpec Workbench](https://github.com/VeryComplexAndLongName/OpenSpec-UI)**: Running and supervising agents on OpenSpec changes.
- **[MySpec](https://myspec.dev)**: Cloud beta (account required) that conducts guided spec interviews and exports four-file bundles or OpenSpec-compatible changes. Its MCP server (`@myspec/mcp-server`) and [Claude Code plugins](https://github.com/myspecs/claude-plugins) let coding agents read those specs, write OpenSpec changes, and implement them task by task. The service sends submitted content to third-party AI providers and is not designed for sensitive data.
- **[openspec-guard](https://github.com/guillaume-flambard/spec-guard)**: CLI and GitHub Action that reports which OpenSpec scenarios are covered by a Vitest or Jest test, without running the tests.
- **[OpenSpec Review](https://skillgild.dev/skills/openspec-review)**: Hosted skill (SkillGild account required; free tier includes 25 runs a month) that turns an open change into a private review link. Reviewers who don't use OpenSpec see each requirement merged into the main spec as `openspec archive` would, with a line diff, and approve or request changes per requirement without an account; the agent reads the decisions back before apply or archive. It also flags requirements other open changes touch and scenarios without WHEN/THEN. Change content is stored on SkillGild for 30 days and is not sent to an AI provider.

## Add your project

Open a pull request adding one line to this file with your project's name, a direct link, and a short description of how it relates to OpenSpec.

- Keep entries focused on something built with OpenSpec or supporting its use, rather than general product advertising.
- Describe what people can use. Avoid promotional claims, referral links, and tracking links.
- Disclose paid features or required accounts in the entry, if any.

Corrections and updates to existing entries are welcome too.
