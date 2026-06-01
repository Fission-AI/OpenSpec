---
"pscode": minor
---

Add 5 `/pstld:*` slash commands installed by the `dixi` profile

The `dixi` profile now installs 5 Claude Code slash commands into `.claude/commands/pstld/` during `pscode init --profile dixi`:

- `/pstld:rfc` — structured RFC flow referencing `pastelsdd/context/dev-flow.md`
- `/pstld:arch-check` — architecture conformance check (hexagonal for Java, feature-sliced for React)
- `/pstld:adr` — generates a structured Architecture Decision Record
- `/pstld:jira-sync` — verifies JIRA integration via MCP Atlassian and `pastelsdd/jira.yaml`
- `/pstld:dod` — checks Definition of Done criteria from `pastelsdd/context/dod.md`

Commands are stack-agnostic at install time and adapt their output at runtime by reading `.pscode-dixi.yaml`.
