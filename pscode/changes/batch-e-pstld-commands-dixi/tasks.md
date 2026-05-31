## 1. Arquivos de conteúdo — slash commands

- [ ] 1.1 Criar diretório `pscode/content/dixi/claude-runtime/commands/`
- [ ] 1.2 Criar `rfc.md` com prompt estruturado para `/pstld:rfc` (fluxo RFC referenciando `pastelsdd/context/dev-flow.md`; instrui leitura de `.pscode-dixi.yaml` para adaptar escopo)
- [ ] 1.3 Criar `arch-check.md` com prompt para `/pstld:arch-check` (lê `pastelsdd/context/architecture.md` e `.pscode-dixi.yaml`; aplica regras hexagonais para Java ou feature-sliced para React)
- [ ] 1.4 Criar `adr.md` com prompt para `/pstld:adr` (gera ADR estruturado a partir de decisão descrita pelo usuário; agnóstico de stack)
- [ ] 1.5 Criar `jira-sync.md` com prompt para `/pstld:jira-sync` (lê `pastelsdd/jira.yaml`, verifica `configured`, usa `mcp__atlassian__*` para testar conexão; output amigável se não configurado)
- [ ] 1.6 Criar `dod.md` com prompt para `/pstld:dod` (verifica DoD do item corrente lendo `pastelsdd/context/dod.md`; lista critérios com status ✅/❌)

## 2. Expansão de installDixiExtras

- [ ] 2.1 Em `src/core/presets/dixi.ts`, adicionar constante `PSTLD_COMMANDS_SRC` resolvida via `import.meta.url` + `fileURLToPath` apontando para `pscode/content/dixi/claude-runtime/commands/`
- [ ] 2.2 Em `installDixiExtras`, criar `.claude/commands/pstld/` na raiz de `projectDir` (se não existir)
- [ ] 2.3 Em `installDixiExtras`, copiar os 5 arquivos de `PSTLD_COMMANDS_SRC` para `.claude/commands/pstld/` (idempotente — sobrescreve se já existir)
- [ ] 2.4 Garantir que a cópia ocorre independente do valor de `stack` (incluindo `null`)

## 3. Testes

- [ ] 3.1 Em `test/core/presets/dixi.test.ts`, adicionar caso verificando que `.claude/commands/pstld/` existe após `installDixiExtras`
- [ ] 3.2 Adicionar caso verificando que os 5 arquivos (rfc.md, arch-check.md, adr.md, jira-sync.md, dod.md) existem em `.claude/commands/pstld/` após instalação
- [ ] 3.3 Adicionar caso verificando idempotência: segunda chamada a `installDixiExtras` não corrompe nem duplica arquivos
- [ ] 3.4 Adicionar caso verificando que a instalação ocorre para `stack === null` (projeto sem stack detectada)

## 4. Changeset e validação

- [ ] 4.1 Criar changeset `minor` descrevendo adição dos 5 slash commands `/pstld:*`
- [ ] 4.2 Executar `pnpm test` e confirmar todos os testes passando
- [ ] 4.3 Executar `pnpm build` e confirmar compilação sem erros
