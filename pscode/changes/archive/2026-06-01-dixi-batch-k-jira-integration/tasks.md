## 1. Conteúdo dos Slash Commands

- [x] 1.1 Criar `pscode/content/dixi/claude-runtime/commands/jira-draft.md` com o prompt estruturado do `/pstld:jira-draft`
- [x] 1.2 Criar `pscode/content/dixi/claude-runtime/commands/jira-setup.md` com o prompt estruturado do `/pstld:jira-setup`

## 2. Schema de Change Metadata

- [x] 2.1 Adicionar campo opcional `jiraIssueKey: z.string().optional()` ao schema Zod em `src/core/change-metadata/`
- [x] 2.2 Atualizar tipo TypeScript exportado (se houver) para incluir `jiraIssueKey?: string`

## 3. Expansão do installDixiExtras

- [x] 3.1 Expandir `installDixiExtras` em `src/core/presets/dixi.ts` para copiar `jira-draft.md` e `jira-setup.md` para `.claude/commands/pstld/`
- [x] 3.2 Atualizar testes em `test/core/presets/dixi.test.ts` para verificar que os 2 novos arquivos são instalados

## 4. Transição JIRA no pscode complete

- [x] 4.1 Ler `jiraIssueKey` do `.pscode.yaml` no fluxo de `pscode complete` em `src/commands/complete.ts`
- [x] 4.2 Ler `transitions.done` de `pastelsdd/jira.yaml` do projeto atual
- [x] 4.3 Chamar MCP Atlassian (`transitionJiraIssue`) com a issue key e o ID de transição; tratar falhas como non-fatal (aviso + continue)
- [x] 4.4 Adicionar smoke test em `test/commands/complete.test.ts` para o caminho com `jiraIssueKey` definido (mock do MCP)
- [x] 4.5 Adicionar smoke test para o caminho sem `jiraIssueKey` (sem chamada JIRA)

## 5. Configuração do jira.yaml

- [x] 5.1 Adicionar campo `transitions.done` ao template de `pastelsdd/jira.yaml` gerado pelo `pscode init --profile dixi`
- [x] 5.2 Atualizar testes de init (se existirem) para verificar que o campo `transitions.done` aparece no jira.yaml gerado

## 6. Changeset e Documentação

- [x] 6.1 Criar changeset `minor` descrevendo adição de `jiraIssueKey`, novos comandos e transição automática no complete
- [x] 6.2 Verificar se CLAUDE.md ou README precisam mencionar os novos comandos `/pstld:jira-draft` e `/pstld:jira-setup`
