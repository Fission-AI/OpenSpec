## Why

O profile `dixi` já tem infraestrutura JIRA (Batch J: `jira.yaml` + MCP Atlassian instalado no init), mas os desenvolvedores ainda dependem do Trello como ferramenta de board — o fluxo de criação de issues JIRA, vinculação de changes a issues e transição automática de status ainda não existem. O Batch K fecha esse ciclo: com `/pstld:jira-draft`, `/pstld:jira-setup`, `jiraIssueKey` no `.pscode.yaml` e transição automática no `complete`, o JIRA passa a ser o board nativo do profile dixi.

## What Changes

- Dois novos slash commands instalados pelo profile dixi:
  - `/pstld:jira-draft` — cria rascunho de issue JIRA a partir do contexto da change atual, usando `pastelsdd/jira.yaml` para determinar projeto e tipo de issue
  - `/pstld:jira-setup` — configura interativamente `pastelsdd/jira.yaml` (project key, default issue type, status transitions), equivalente ao setup de Trello existente
- Campo `jiraIssueKey` adicionado ao `.pscode.yaml` (metadados da change): vincula uma change a uma issue JIRA existente
- `pscode complete` detecta `jiraIssueKey` em changes dixi e transita automaticamente o status da issue JIRA para o estado configurado como "done" em `jira.yaml`
- `installDixiExtras` expandido para instalar os 2 novos arquivos de slash command

## Capabilities

### New Capabilities

- `pstld-jira-draft`: slash command `/pstld:jira-draft` instalado em `.claude/commands/pstld/`; cria issue JIRA a partir do contexto da change, usando `pastelsdd/jira.yaml` e MCP Atlassian
- `pstld-jira-setup`: slash command `/pstld:jira-setup` instalado em `.claude/commands/pstld/`; configura `pastelsdd/jira.yaml` interativamente via MCP Atlassian (lista projetos, tipos de issue e transições disponíveis)
- `change-jira-link`: campo `jiraIssueKey` no `.pscode.yaml` que vincula uma change a uma issue JIRA; lido por `pscode complete` para disparar a transição de status

### Modified Capabilities

- `dixi-init-extras`: `installDixiExtras` passa a instalar `jira-draft.md` e `jira-setup.md` além dos 5 comandos existentes (Batch E)
- `ps-complete`: o comando `pscode complete` lê `jiraIssueKey` do `.pscode.yaml`; se presente e o profile for `dixi`, transita a issue JIRA para o status "done" configurado em `pastelsdd/jira.yaml` via MCP Atlassian

## Impact

- `pscode/content/dixi/claude-runtime/commands/` — 2 novos arquivos: `jira-draft.md`, `jira-setup.md`
- `src/core/presets/dixi.ts` — expansão de `installDixiExtras` para copiar os 2 novos comandos
- `schemas/` ou `src/core/change-metadata/` — adicionar campo opcional `jiraIssueKey: string` ao schema do `.pscode.yaml`
- `src/commands/complete.ts` (ou `archive.ts`) — lógica de transição JIRA pós-complete para changes dixi
- `pastelsdd/jira.yaml` (runtime, gerado por init) — adicionar campo `doneTransitionId` ou `transitions.done`
- `test/core/presets/dixi.test.ts` — verificar instalação dos 2 novos comandos
- `test/commands/complete.test.ts` — smoke test da transição JIRA no complete
- Changeset: `minor` (adição de campo opcional e novos comandos; nenhuma API removida)
