## Why

O profile `dixi` precisa de guardrails arquiteturais e utilitários de fluxo que atuam **autonomamente** dentro do Claude Code — sem depender do desenvolvedor invocar comandos manualmente. As 3 skills auto-invocadas pstld-* fecham o ciclo iniciado pelo Batch E (slash commands) ao transformar regras passivas em comportamento ativo disparado por contexto: edição em camadas arquiteturais, pedido de commit ou menção a um ticket JIRA.

## What Changes

- Criação de 3 arquivos de skill em `pscode/content/dixi/claude-runtime/skills/`:
  - `pstld-arch-guardian.md` — auto-invocada ao editar arquivos em camadas arquiteturais (infraestrutura Java ou features/pages/app React); verifica violações hexagonais ou de feature-sliced antes de aplicar a edição
  - `pstld-commit-crafter.md` — auto-invocada quando o usuário pede commit; monta mensagem Conventional Commits com escopo correto por stack e ticket JIRA obrigatório
  - `pstld-jira-context.md` — auto-invocada quando o prompt contém chave no formato `[A-Z]+-\d+`; injeta contexto do ticket via MCP Atlassian se `pastelsdd/jira.yaml` estiver configurado
- Instalação das 3 skills em `.claude/skills/pstld-*/` por `installDixiExtras` (Batch B), independente de stack
- Cada skill detecta a stack em runtime via `.pscode-dixi.yaml` para adaptar o comportamento

## Capabilities

### New Capabilities

- `pstld-arch-guardian-skill`: Skill auto-invocada que monitora edições em camadas arquiteturais e bloqueia violações hexagonais (Java) ou de feature-sliced (React/Next), com referência a `pastelsdd/context/architecture.md`
- `pstld-commit-crafter-skill`: Skill auto-invocada para montar mensagem de commit Conventional Commits com escopo por stack (bounded context para Java, nome da feature para React) e ticket JIRA
- `pstld-jira-context-skill`: Skill auto-invocada que injeta contexto de tickets JIRA no prompt quando uma chave `[A-Z]+-\d+` é detectada, usando MCP Atlassian

### Modified Capabilities

*(nenhuma — sem alterações em specs existentes)*

## Impact

- **Arquivos criados**: `pscode/content/dixi/claude-runtime/skills/pstld-arch-guardian.md`, `pstld-commit-crafter.md`, `pstld-jira-context.md`
- **Batch B** (`installDixiExtras`): instalação das 3 skills em `.claude/skills/` — depende da implementação do Batch B para a lógica de cópia
- **Sem breaking changes** — as skills só são instaladas via `pscode init --profile dixi`
- **Dependência**: `pastelsdd/jira.yaml` (Batch J) para `pstld-jira-context` e `pstld-commit-crafter`; `pastelsdd/context/architecture.md` (Batch C) para `pstld-arch-guardian`
- **Changeset**: minor
