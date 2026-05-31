## Context

`profiles.ts` define `ALL_WORKFLOWS` (union type TypeScript) e `PROFILES` (mapa de perfis). O profile `dixi` foi introduzido no Batch I mas nunca recebeu seus workflows reais — está idêntico ao `standard`. O `init.ts` usa `WORKFLOW_TO_SKILL_DIR` para mapear cada `WorkflowId` ao diretório de skill correspondente; qualquer ID em `PROFILES.dixi.workflows` que não esteja nesse mapa é silenciosamente ignorado na instalação.

A integração JIRA prevista usa o servidor MCP público da Atlassian (`mcp.atlassian.com`). O arquivo `pastelsdd/jira.yaml` é o mesmo padrão usado por `pscode` para outras integrações externas (ex: `trello.yaml`). O `.mcp.json` segue o padrão Claude Code para registrar servidores MCP locais.

## Goals / Non-Goals

**Goals:**
- Adicionar os 7 novos `WorkflowId`s em `ALL_WORKFLOWS` sem quebrar o tipo existente
- Atualizar `PROFILES.dixi` com description e 8 workflows corretos
- Adicionar entradas em `WORKFLOW_TO_SKILL_DIR` para os novos IDs
- Gerar `pastelsdd/jira.yaml` e fazer merge de `.mcp.json` durante `init --profile dixi`
- Atualizar testes para refletir dixi = 8 workflows

**Non-Goals:**
- Implementar os workflows Dixi em si (`rfc`, `arch-check`, etc.) — eles são skills externas ao repo
- Criar skill files para os novos workflows — apenas registrar os IDs
- Validar conectividade com o servidor Atlassian durante o init

## Decisions

### 1. Adicionar IDs a `ALL_WORKFLOWS` sem criar skill dirs de imediato

Os novos IDs (`rfc`, `design`, `tasks`, `arch-check`, `adr`, `jira-sync`, `dod`) existem como `WorkflowId` válidos desde agora, mas os skill dirs só são gerados quando o profile dixi é instalado. O `WORKFLOW_TO_SKILL_DIR` recebe entradas com nomes padrão `pscode-dixi-<id>`.

**Alternativa descartada:** criar um mecanismo de "lazy registration" onde IDs fora de `WORKFLOW_TO_SKILL_DIR` são ignorados silenciosamente — rejeitado porque permite bugs de typo em profile definitions sem feedback.

### 2. Merge de `.mcp.json` ao invés de sobrescrita

O `init` lê o `.mcp.json` existente, faz merge apenas de `mcpServers.atlassian`, e reescreve. Garante idempotência e não destrói configurações do usuário.

**Alternativa descartada:** sempre sobrescrever — inaceitável, perderia outras entradas MCP do usuário.

### 3. `pastelsdd/jira.yaml` só gerado no profile dixi

A geração é condicional ao profile, não ao init geral. A verificação é feita dentro de `InitCommand.execute()` após o profile ser resolvido.

**Alternativa descartada:** flag `--jira` separado — overhead desnecessário; o profile dixi já é o gatilho natural.

### 4. `configured: false` como sentinela

`jira.yaml` nasce com `configured: false`. O workflow `jira-sync` será responsável por setar `configured: true` após testar a conexão. Isso evita comportamento silencioso em projetos com JIRA não configurado.

## Risks / Trade-offs

- **[Risk] `tasks` como WorkflowId pode colidir semanticamente com o artifact `tasks.md`** → Mitigation: os dois vivem em contextos completamente diferentes (`WorkflowId` é para skills, `tasks` artifact é no schema de planning); não há conflito de código.
- **[Risk] `.mcp.json` corrompido (JSON inválido) quebra o merge** → Mitigation: envolver o parse em try/catch; se falhar, criar do zero com aviso ao usuário.
- **[Risk] Testes de `init` que verificam número de arquivos gerados podem quebrar** → Mitigation: atualizar assertions explicitamente nos testes afetados.

## Migration Plan

1. Atualizar `profiles.ts` (sem breaking change — só adição)
2. Atualizar `WORKFLOW_TO_SKILL_DIR` em `init.ts`
3. Adicionar lógica de geração JIRA em `InitCommand.execute()`
4. Atualizar testes
5. Criar changeset `minor`

Rollback: reverter `profiles.ts` e `init.ts` para versão anterior; os arquivos gerados em projetos do usuário (`jira.yaml`, `.mcp.json`) permanecem mas são inofensivos.

## Open Questions

- Os nomes dos skill dirs para os novos workflows Dixi (`pscode-dixi-rfc`, etc.) estão corretos, ou há uma convenção diferente definida no projeto Dixi?
- O `tasks` Dixi é o mesmo `pscode-apply-change` renomeado, ou um skill totalmente novo?
