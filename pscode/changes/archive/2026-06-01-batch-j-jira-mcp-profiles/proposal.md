## Why

O profile `dixi` existe em `profiles.ts` mas está idêntico ao `standard`, sem refletir os workflows reais do ciclo Dixi (RFC → Design → Tasks → Apply + guardrails). Além disso, a integração JIRA via MCP Atlassian — prevista desde o Batch I — ainda não é instalada pelo `pscode init --profile dixi`, deixando projetos Dixi sem acesso ao Atlassian MCP.

## What Changes

- **`ALL_WORKFLOWS`** ganha seis novos IDs: `rfc`, `design`, `tasks`, `arch-check`, `adr`, `jira-sync`, `dod`
- **`PROFILES.dixi`** atualizado: description correta + 8 workflows (`rfc`, `design`, `tasks`, `apply`, `arch-check`, `adr`, `jira-sync`, `dod`)
- **`WORKFLOW_TO_SKILL_DIR`** em `init.ts` recebe mapeamentos para os 7 novos IDs (os 6 acima + `tasks`)
- **`pscode init --profile dixi`** passa a gerar `pastelsdd/jira.yaml` e faz merge de `.mcp.json` com a entrada do servidor MCP Atlassian
- Testes atualizados para refletir que `dixi` tem 8 workflows

## Capabilities

### New Capabilities

- `jira-init`: Geração dos arquivos de configuração JIRA (`pastelsdd/jira.yaml` + merge `.mcp.json`) durante `pscode init --profile dixi`

### Modified Capabilities

- `profiles`: Contrato de `ALL_WORKFLOWS` e `PROFILES.dixi` muda — novos WorkflowIds adicionados, dixi passa de 5 para 8 workflows

## Impact

- `src/core/profiles.ts` — adicionar IDs e atualizar PROFILES.dixi
- `src/core/init.ts` — `WORKFLOW_TO_SKILL_DIR` + lógica de geração de arquivos JIRA para profile dixi
- `test/core/profiles.test.ts` — dixi agora tem 8 workflows
- `test/core/init.test.ts` — smoke test verifica geração de jira.yaml e .mcp.json
- `test/commands/workspace.test.ts` — remover assertions que assumiam dixi == standard (se existirem)
- Changeset: `minor` (novos IDs são adição; nenhuma API pública removida)
