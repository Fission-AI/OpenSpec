## 1. Skill pstld-arch-guardian

- [ ] 1.1 Criar `pscode/content/dixi/claude-runtime/skills/pstld-arch-guardian.md` com trigger para edição em `infrastructure/**` (Java) e `features/**`, `app/**`, `pages/**` (React)
- [ ] 1.2 Implementar seção de detecção de stack via `.pscode-dixi.yaml` (campo `family`)
- [ ] 1.3 Implementar lógica Java: verificar import direto de `domain/` em `infrastructure/` sem porta; bloquear com referência a `pastelsdd/context/architecture.md`
- [ ] 1.4 Implementar lógica React: verificar import cruzado entre features; bloquear com referência a `pastelsdd/context/architecture.md`
- [ ] 1.5 Implementar lógica React: emitir warning (não bloquear) para lógica de negócio inline em `app/**` ou `pages/**`
- [ ] 1.6 Garantir comportamento seguro quando `.pscode-dixi.yaml` não existe (sem ação, sem erro)

## 2. Skill pstld-commit-crafter

- [ ] 2.1 Criar `pscode/content/dixi/claude-runtime/skills/pstld-commit-crafter.md` com trigger para menção de "commit" no prompt
- [ ] 2.2 Implementar detecção de stack via `.pscode-dixi.yaml` para inferência de escopo (bounded context para Java, nome da feature para React)
- [ ] 2.3 Implementar fallback de escopo pelo diretório principal dos arquivos modificados quando stack desconhecida
- [ ] 2.4 Implementar verificação de `pastelsdd/jira.yaml`: se `project_key` configurado, exigir ticket JIRA na mensagem
- [ ] 2.5 Implementar pergunta ao usuário pelo número do ticket quando não informado no prompt
- [ ] 2.6 Garantir formato final: `tipo(escopo): descrição [PROJECT_KEY-NNN]`

## 3. Skill pstld-jira-context

- [ ] 3.1 Criar `pscode/content/dixi/claude-runtime/skills/pstld-jira-context.md` com trigger para padrão `[A-Z]+-\d+` no prompt
- [ ] 3.2 Implementar verificação de `pastelsdd/jira.yaml` (`configured: true`)
- [ ] 3.3 Implementar chamada a `mcp__atlassian__getJiraIssue` e injeção de título, descrição e critérios de aceite no contexto
- [ ] 3.4 Implementar tratamento de erro quando ticket não encontrado via MCP (aviso breve, sem bloquear)
- [ ] 3.5 Implementar aviso único por sessão quando integração não configurada

## 4. Verificação e changeset

- [ ] 4.1 Verificar manualmente que os 3 arquivos de skill estão no diretório correto (`pscode/content/dixi/claude-runtime/skills/`)
- [ ] 4.2 Confirmar com Batch B que `installDixiExtras` copia as skills para `.claude/skills/pstld-*/` no projeto do cliente
- [ ] 4.3 Testar em projeto Java simulado: `pscode init --profile dixi` → `.claude/skills/` contém `pstld-arch-guardian`, `pstld-commit-crafter`, `pstld-jira-context`
- [ ] 4.4 Testar em projeto React/Next simulado: mesma verificação
- [ ] 4.5 Criar changeset (`pnpm changeset`) com tipo `minor`
