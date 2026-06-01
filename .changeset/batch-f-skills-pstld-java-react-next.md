---
"pscode": minor
---

Adiciona 3 skills auto-invocadas pstld-* para o profile dixi com suporte a Java e React/Next.

- `pstld-arch-guardian`: monitora edições em camadas arquiteturais, bloqueia violações hexagonais (Java) e de feature-sliced (React/Next)
- `pstld-commit-crafter`: monta mensagem Conventional Commits com escopo por stack e ticket JIRA obrigatório
- `pstld-jira-context`: injeta contexto de tickets JIRA no prompt via MCP Atlassian quando chave `[A-Z]+-\d+` é detectada
- `installDixiExtras` atualizado para copiar as skills para `.claude/skills/pstld-*/SKILL.md` no projeto do cliente
