---
"pscode": minor
---

Adiciona dois hooks Claude Code ao perfil `dixi`:

- **`arch-guard.mjs`** (`PreToolUse`): bloqueia (`exit 2`) imports diretos de `domain/` em `infrastructure/` (Java/hexagonal) e importações cruzadas entre features (React/feature-sliced); emite warning (`exit 1`) para uso combinado de `useState`+`useEffect` em `pages/app`. Gate via `.pscode-dixi.yaml` — projetos não-Dixi nunca são afetados.

- **`jira-context.mjs`** (`UserPromptSubmit`): detecta tickets JIRA (`[A-Z]+-\d+`) no prompt e injeta contexto de `pastelsdd/jira.yaml` (project_key, board_url) quando configurado. Agnóstico de stack.

`installDixiExtras` atualizado para copiar ambos os hooks para `.claude/hooks/` (brownfield-safe: não sobrescreve arquivos existentes) e fazer merge em `.claude/settings.json` sem duplicar entradas.
