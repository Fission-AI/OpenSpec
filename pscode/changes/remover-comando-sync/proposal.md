## Why

O comando `pscode sync` existia como um passo intermediário opcional para propagar delta specs para as specs principais, mas criava confusão — desenvolvedores esqueciam de rodá-lo ou não sabiam quando era necessário. O momento natural e inequívoco para essa propagação é o archive, que já marca o fim do ciclo de uma change. Manter os dois separados não agrega valor e aumenta a superfície de API da ferramenta.

## What Changes

- **BREAKING**: Remove o comando `pscode sync` e o workflow `/ps:sync` — não existirão mais.
- O comando `pscode archive` passa a executar o sync de delta specs para specs principais automaticamente e sempre, sem prompt, sem flag `--skip-specs`, sem opção de pular.
- Remove `sync` de `ALL_WORKFLOWS` e de todos os profiles (`standard`, `dixi`) em `src/core/profiles.ts`.
- Remove o arquivo `src/commands/sync.ts` e o registro do comando no CLI (`src/cli/index.ts`).
- Remove os arquivos de skill gerados `sync.md` de todos os adapters de command-generation (claude, cursor, codex, gemini, github-copilot).
- Remove a opção `--skip-specs` da interface Commander do archive, se existir.

## Capabilities

### New Capabilities
<!-- nenhuma — esta change remove funcionalidade, não adiciona -->

### Modified Capabilities
<!-- nenhuma mudança de spec; o comportamento de archive é implementação interna -->

## Impact

- `src/commands/sync.ts` — deletado
- `src/cli/index.ts` — remoção do registro do comando `sync`
- `src/core/profiles.ts` — remoção de `'sync'` de `ALL_WORKFLOWS` e de todos os PROFILES
- `src/core/archive.ts` — remoção de flag `--skip-specs` e lógica condicional; sync passa a ser sempre executado
- `src/commands/archive.ts` — remoção de opção `--skip-specs` no Commander
- `src/core/command-generation/adapters/*/` — remoção dos templates e arquivos gerados para `sync`
- `test/commands/sync.test.ts` — deletado
- `test/core/archive.test.ts` — atualizado para cobrir sync em todos os cenários
- `test/core/profiles.test.ts` — atualizado para garantir que `sync` não aparece em nenhum profile
- `CLAUDE.md`, `README.md` — remoção de referências ao comando sync
