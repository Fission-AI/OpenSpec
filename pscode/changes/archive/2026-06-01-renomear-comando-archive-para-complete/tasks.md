## 1. Verificação prévia

- [x] 1.1 Verificar se o nome do workflow `archive` em `profiles.ts` é persistido em algum arquivo de config do usuário (`.pscode.yaml` ou similar) — se sim, planejar migração de dados
- [x] 1.2 Mapear todas as ocorrências de `archive` no código que se referem ao *comando* (não à pasta) via grep

## 2. Renomeação do núcleo da CLI

- [x] 2.1 Renomear `src/commands/archive.ts` → `src/commands/complete.ts`
- [x] 2.2 Em `src/cli/index.ts`, atualizar o import de `archive.ts` para `complete.ts` e o registro `.command('archive')` para `.command('complete')`
- [x] 2.3 Em `src/core/profiles.ts`, renomear o identificador `archive` para `complete` em `ALL_WORKFLOWS` e em todos os profiles (standard, dixi, etc.)
- [x] 2.4 Verificar `src/core/profile-sync-drift.ts` e atualizar quaisquer referências hardcoded ao workflow `archive`

## 3. Atualização dos adapters (command generation)

- [x] 3.1 Em cada adapter em `src/core/command-generation/adapters/`, atualizar o nome do arquivo de skill de `archive` para `complete` (nome e path gerados)
- [x] 3.2 Atualizar o conteúdo dos templates de skill: substituir `/ps:archive` → `/ps:complete` e `pscode archive` → `pscode complete`
- [x] 3.3 Verificar que `pscode update` (ou `pscode init`) gera o arquivo correto com o novo nome e não gera arquivo com nome `archive`

## 4. Testes

- [x] 4.1 Renomear `test/commands/archive.test.ts` → `test/commands/complete.test.ts`
- [x] 4.2 Atualizar todas as strings e referências ao comando dentro do arquivo de teste renomeado
- [x] 4.3 Em `test/core/profiles.test.ts`, verificar que o workflow `complete` existe e o workflow `archive` não existe nos profiles
- [x] 4.4 Rodar `pnpm test` e garantir que todos os testes passam

## 5. Documentação

- [x] 5.1 Atualizar `README.md`: substituir todas as ocorrências de `pscode archive` e `/ps:archive`
- [x] 5.2 Atualizar `CLAUDE.md`: idem
- [x] 5.3 Verificar se há outros arquivos `.md` no repositório com referências ao comando `archive` e atualizá-los

## 6. Changeset e validação final

- [x] 6.1 Criar changeset `major` com descrição: "O comando `pscode archive` foi renomeado para `pscode complete`. O slash command `/ps:archive` foi renomeado para `/ps:complete`. Nenhuma mudança de comportamento."
- [x] 6.2 Rodar `pnpm build` e confirmar que compila sem erros
- [x] 6.3 Rodar `pnpm lint` e corrigir eventuais avisos
- [x] 6.4 Testar manualmente: executar `pscode complete` em um repositório de teste e confirmar que a change é arquivada corretamente
