## 1. Remover o comando sync da CLI

- [x] 1.1 Deletar `src/commands/sync.ts`
- [x] 1.2 Remover o registro do comando `sync` em `src/cli/index.ts`

## 2. Remover sync dos profiles e workflows

- [x] 2.1 Remover `'sync'` de `ALL_WORKFLOWS` em `src/core/profiles.ts`
- [x] 2.2 Remover `'sync'` de todos os PROFILES (standard, dixi e quaisquer outros) em `src/core/profiles.ts`

## 3. Remover arquivos de skill gerados para sync

- [x] 3.1 Remover templates e arquivos `sync.md` do adapter `claude` em `src/core/command-generation/adapters/claude/`
- [x] 3.2 Remover templates e arquivos `sync.md` dos demais adapters (cursor, codex, gemini, github-copilot)

## 4. Atualizar o archive para sync automático

- [x] 4.1 Em `src/core/archive.ts`, remover qualquer flag `--skip-specs` ou lógica condicional de sync
- [x] 4.2 Garantir que o sync de delta specs é chamado sempre ao final do archive, sem prompt e sem opção de pular
- [x] 4.3 Manter log informativo ("Sincronizando specs...") durante o archive
- [x] 4.4 Em `src/commands/archive.ts`, remover a opção `--skip-specs` da interface Commander (se existir)

## 5. Atualizar testes

- [x] 5.1 Deletar `test/commands/sync.test.ts` (ou equivalente)
- [x] 5.2 Atualizar `test/core/archive.test.ts` — garantir que o sync de specs é chamado em todos os cenários de archive
- [x] 5.3 Atualizar `test/core/profiles.test.ts` — garantir que `'sync'` não aparece em nenhum profile

## 6. Atualizar documentação

- [x] 6.1 Remover referências ao comando `sync` em `CLAUDE.md` (se houver)
- [x] 6.2 Remover menções a `/ps:sync` e `pscode sync` em `README.md` (se houver)

## 7. Changeset

- [x] 7.1 Criar changeset `minor` documentando a remoção de `pscode sync` como breaking change e informando que `pscode archive` agora sincroniza specs automaticamente
