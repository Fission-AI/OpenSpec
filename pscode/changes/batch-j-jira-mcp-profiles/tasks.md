## 1. Atualizar profiles.ts

- [ ] 1.1 Adicionar `'rfc', 'design', 'tasks', 'arch-check', 'adr', 'jira-sync', 'dod'` ao array `ALL_WORKFLOWS` em `src/core/profiles.ts`
- [ ] 1.2 Atualizar `PROFILES.dixi.description` para `'Dixi — RFC→Design→Tasks→Apply com guardrails para Java/Spring e React/Next.js'`
- [ ] 1.3 Atualizar `PROFILES.dixi.workflows` para `['rfc', 'design', 'tasks', 'apply', 'arch-check', 'adr', 'jira-sync', 'dod']`
- [ ] 1.4 Verificar que `profiles.ts` compila sem erros de tipo (`pnpm build`)

## 2. Atualizar WORKFLOW_TO_SKILL_DIR em init.ts

- [ ] 2.1 Adicionar entradas para os 7 novos IDs em `WORKFLOW_TO_SKILL_DIR` em `src/core/init.ts`:
  - `'rfc': 'pscode-dixi-rfc'`
  - `'design': 'pscode-dixi-design'`
  - `'tasks': 'pscode-dixi-tasks'`
  - `'arch-check': 'pscode-dixi-arch-check'`
  - `'adr': 'pscode-dixi-adr'`
  - `'jira-sync': 'pscode-dixi-jira-sync'`
  - `'dod': 'pscode-dixi-dod'`

## 3. Implementar geração de arquivos JIRA no init

- [ ] 3.1 Criar função `generateJiraFiles(projectPath: string): Promise<void>` em `src/core/init.ts` (ou arquivo helper dedicado) que gera `pastelsdd/jira.yaml`
- [ ] 3.2 Implementar template de `pastelsdd/jira.yaml` com `project_key: ""`, `board_url: ""`, `configured: false`
- [ ] 3.3 Implementar lógica de merge de `.mcp.json`: ler existente (try/catch para JSON inválido), adicionar `mcpServers.atlassian`, reescrever
- [ ] 3.4 Adicionar entrada do servidor Atlassian: `{ "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"] }`
- [ ] 3.5 Tornar geração idempotente: não sobrescrever `jira.yaml` se já existe; não duplicar entrada atlassian no `.mcp.json`
- [ ] 3.6 Chamar `generateJiraFiles` em `InitCommand.execute()` condicionalmente quando o profile resolvido for `dixi`
- [ ] 3.7 Exibir mensagem pós-init: `"JIRA: edite pastelsdd/jira.yaml com project_key e board_url, depois use /pstld:jira-sync para testar a conexão."`

## 4. Atualizar testes

- [ ] 4.1 Em `test/core/profiles.test.ts`: atualizar assertion de contagem de workflows do profile `dixi` de 5 para 8
- [ ] 4.2 Em `test/core/profiles.test.ts`: verificar que `ALL_WORKFLOWS` contém os 7 novos IDs
- [ ] 4.3 Em `test/core/init.test.ts`: adicionar smoke test que executa `init --profile dixi` e verifica existência de `pastelsdd/jira.yaml` e entrada `atlassian` em `.mcp.json`
- [ ] 4.4 Em `test/core/init.test.ts`: verificar idempotência — segunda execução de `init --profile dixi` não sobrescreve `jira.yaml` existente
- [ ] 4.5 Em `test/commands/workspace.test.ts`: remover ou corrigir assertions que assumiam `dixi.workflows === standard.workflows` (se existirem)
- [ ] 4.6 Rodar suite completa: `pnpm test` — todos os testes devem passar

## 5. Changeset e validação final

- [ ] 5.1 Criar changeset `minor`: `pnpm changeset` com descrição das mudanças em `profiles.ts` e nova funcionalidade JIRA init
- [ ] 5.2 Executar `pnpm lint` sem erros
- [ ] 5.3 Executar `pnpm build` sem erros de TypeScript
