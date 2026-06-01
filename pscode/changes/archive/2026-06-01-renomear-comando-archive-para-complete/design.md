## Context

O `pscode archive` é o comando que finaliza uma change, movendo os artefatos para `pscode/changes/archive/` e executando cleanup. O nome "archive" foi escolhido originalmente por descrever a operação de armazenamento interno, mas do ponto de vista do dev o que acontece é a **conclusão** de uma change. Atualmente o comando está registrado em `src/cli/index.ts`, implementado em `src/commands/archive.ts`, referenciado no sistema de profiles (`src/core/profiles.ts`) como workflow `archive`, e gera arquivos de skill nomeados `archive.md` nos adapters de command generation.

## Goals / Non-Goals

**Goals:**
- Renomear o comando público `pscode archive` → `pscode complete`
- Renomear o slash command `/ps:archive` → `/ps:complete`
- Atualizar todos os pontos de referência internos: CLI, profiles, adapters, testes, documentação
- Garantir que o comportamento do comando não mude

**Non-Goals:**
- Mudar o comportamento da operação de completar uma change
- Renomear a pasta interna `pscode/changes/archive/` (é detalhe de implementação, não visível como comando)
- Adicionar alias de retrocompatibilidade para `pscode archive` (não vale a complexidade para um projeto em fase inicial)

## Decisions

### Renomear o arquivo `archive.ts` → `complete.ts`

O arquivo de implementação acompanha o nome do comando para manter consistência. Alternativa considerada: manter `archive.ts` e só mudar o registro no Commander. Rejeitado porque cria divergência entre nome do arquivo e nome do comando, dificultando busca por código.

### Sem alias de retrocompatibilidade

Não será adicionado `pscode archive` como alias do `pscode complete`. O projeto é em fase inicial, o breaking change é comunicado via changeset e nota de migração no CHANGELOG. Alternativa: manter ambos durante uma versão de transição. Rejeitado por adicionar complexidade desnecessária — o público atual é pequeno e o nome anterior nunca foi publicado em release final.

### Changeset de tipo `major`

A renomeação do comando é uma breaking change no contrato público da CLI. Um `major` bump é apropriado mesmo que o comportamento seja idêntico.

### Atualização dos adapters como parte do mesmo PR

Os arquivos de skill dos adapters (`.claude/commands/ps:archive.md`, etc.) precisam ser atualizados junto com o código para que `pscode update` produza os arquivos corretos. Alternativa: deixar a regeneração para um `pscode update` posterior. Rejeitado porque deixaria os adapters inconsistentes com o código até o dev rodar o update manualmente.

## Risks / Trade-offs

- **[Risco] Dev com instalação antiga usa `pscode archive`** → O comando não existirá mais após o upgrade; receberá erro de "unknown command". Mitigação: nota de migração clara no CHANGELOG e no changeset.
- **[Trade-off] Renomear arquivo de implementação** → Pequeno ruído no `git log` (rename), mas mantém consistência a longo prazo. Aceito.
- **[Risco] Referências ao workflow `archive` em configs persistidos** → Se algum usuário tiver um `.pscode.yaml` ou config que referencia o workflow pelo nome, pode quebrar. Mitigação: verificar se o nome do workflow é persistido em configs — se não for, risco é zero.

## Migration Plan

1. Renomear `src/commands/archive.ts` → `src/commands/complete.ts`
2. Atualizar `src/cli/index.ts`: registro do comando
3. Atualizar `src/core/profiles.ts`: nome do workflow em `ALL_WORKFLOWS` e nos profiles
4. Verificar e atualizar `src/core/profile-sync-drift.ts` se houver referências
5. Atualizar arquivos de skill nos adapters (todos os 5)
6. Renomear e atualizar testes
7. Atualizar README, CLAUDE.md
8. Criar changeset `major` com nota de migração

Rollback: reverter os commits — não há mudança de dados persistidos.

## Open Questions

- O nome do workflow em `profiles.ts` (`archive`) é persistido em algum arquivo de configuração do usuário? Se sim, é necessário uma migração de dados. Verificar antes de implementar o passo 3.
