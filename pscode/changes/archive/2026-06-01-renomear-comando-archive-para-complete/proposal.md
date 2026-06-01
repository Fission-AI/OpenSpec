## Why

O comando `pscode archive` usa um termo técnico ambíguo que não comunica intenção ao desenvolvedor — "archive" remete à operação de arquivar arquivos, enquanto o que o dev está fazendo é **completar uma change**. Além disso, gera confusão visual com a pasta interna `pscode/changes/archive/`, que é infraestrutura, não um comando. Renomear para `complete` alinha com a linguagem do dia a dia ("completei a tarefa") e torna o fluxo mais intuitivo.

## What Changes

- **BREAKING** O comando CLI `pscode archive` passa a se chamar `pscode complete`
- **BREAKING** O slash command `/ps:archive` passa a se chamar `/ps:complete`
- O arquivo `src/commands/archive.ts` é renomeado para `src/commands/complete.ts`
- O registro do comando no Commander (`src/cli/index.ts`) é atualizado
- As referências ao workflow `archive` em `src/core/profiles.ts` e `src/core/profile-sync-drift.ts` são atualizadas para `complete`
- Os arquivos de skill gerados para todos os adapters (claude, codex, cursor, gemini, github-copilot) são renomeados de `archive.md` para `complete.md` e têm seu conteúdo atualizado
- Testes, README e CLAUDE.md são atualizados para refletir o novo nome
- A pasta `pscode/changes/archive/` **não muda** — é detalhe de implementação interno

## Capabilities

### New Capabilities

_(nenhuma — apenas renomeação)_

### Modified Capabilities

- `ps-complete` (era `ps-archive`): o comando de completar uma change muda de nome público de `archive` para `complete`; comportamento interno inalterado

## Impact

- **Breaking change** no nome público do comando (major version bump necessário)
- `src/cli/index.ts` — registro do comando
- `src/commands/archive.ts` → `src/commands/complete.ts`
- `src/core/profiles.ts` — referências ao workflow `archive`
- `src/core/profile-sync-drift.ts` — referências ao workflow `archive`
- `src/core/command-generation/adapters/` — arquivos de skill para os 5 adapters
- `test/commands/archive.test.ts` → `test/commands/complete.test.ts`
- `test/core/profiles.test.ts` — assertions sobre o nome do workflow
- `README.md`, `CLAUDE.md` — documentação pública
