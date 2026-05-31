## Why

O perfil `dixi` do pscode precisa de guardrails de arquitetura que o agente de IA **não possa ignorar**. Regras documentadas em markdown são fáceis de contornar; hooks no runtime do Claude Code (`PreToolUse` e `UserPromptSubmit`) executam fora do controle do agente e bloqueiam ou avisam antes que o arquivo seja escrito.

## What Changes

- Criar `arch-guard.mjs` — hook `PreToolUse` (Edit|Write) que valida arquitetura para família `java` (hexagonal) e `react` (feature-sliced) lendo `.pscode-dixi.yaml`; bloqueia com `exit 2` em violação ou avisa com `exit 1` (React/pages)
- Criar `jira-context.mjs` — hook `UserPromptSubmit` agnóstico de stack; detecta tickets `[A-Z]+-\d+` no prompt e injeta contexto JIRA via stdout se `jira.yaml` estiver configurado
- Atualizar `installDixiExtras` (Batch B) para fazer **merge** de `.claude/settings.json` registrando ambos os hooks (não sobrescrever arquivo existente)
- Adicionar testes unitários para os dois hooks cobrindo os cenários de violação, permissão e ausência de `.pscode-dixi.yaml`

## Capabilities

### New Capabilities

- `dixi-arch-guard-hook`: Hook `PreToolUse` que bloqueia violações hexagonais (Java) e importações cruzadas entre features (React/Next), com warning para lógica de negócio inline em pages/app
- `dixi-jira-context-hook`: Hook `UserPromptSubmit` que enriquece prompts com contexto JIRA quando um ticket é mencionado e `jira.yaml` está configurado

### Modified Capabilities

- `dixi-init-extras`: Instalação dos hooks via `pscode init --profile dixi` passa a fazer merge em `.claude/settings.json` e gerar `.claude/hooks/arch-guard.mjs` + `.claude/hooks/jira-context.mjs`

## Impact

- **Arquivos novos**: `pscode/content/dixi/claude-runtime/hooks/arch-guard.mjs`, `jira-context.mjs`
- **Arquivos modificados**: `src/core/profiles/dixi/install-extras.ts` (ou equivalente do Batch B), testes em `test/`
- **Dependências**: Node.js nativo (`node:fs`, `node:path`) — sem dependências externas
- **Prerequisito**: `.pscode-dixi.yaml` com campo `family: java | react` no repo do cliente (ausência = hook silencioso, `exit 0`)
- **Changeset**: `minor`
