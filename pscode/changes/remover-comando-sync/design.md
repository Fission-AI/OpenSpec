## Context

O `pscode sync` era um comando CLI independente que percorria os artefatos de uma change e propagava o conteúdo dos delta specs (`pscode/changes/<name>/specs/`) para as specs principais (`pscode/specs/`). Ele existia separado do archive por razão histórica, mas na prática era sempre o último passo antes ou depois do archive. O resultado foi um fluxo confuso: usuários não sabiam se deveriam rodar sync antes ou depois do archive, e muitos simplesmente esqueciam.

O archive já marca o fim do ciclo de vida de uma change. É o momento inequívoco e obrigatório onde faz sentido propagar specs. Consolidar sync no archive elimina a ambiguidade sem perder funcionalidade.

## Goals / Non-Goals

**Goals:**
- Remover completamente o comando `pscode sync` da CLI e de todos os profiles/adapters
- Garantir que `pscode archive` sempre execute o sync de specs ao final, sem prompts ou flags opcionais
- Manter o log informativo ("Sincronizando specs...") para o usuário acompanhar o progresso
- Garantir cobertura de testes para o comportamento de sync-on-archive

**Non-Goals:**
- Mudar a lógica interna do sync (apenas mover onde é chamado)
- Adicionar qualquer nova funcionalidade ao archive além do sync automático
- Manter retrocompatibilidade com `pscode sync` (breaking change intencional)

## Decisions

### 1. Sync sempre ocorre no archive, sem opção de pular

O flag `--skip-specs` (se existir) e qualquer lógica condicional de sync são removidos do archive. O sync passa a ser parte invariável do ciclo de archive.

**Alternativa considerada:** manter `--skip-specs` como escape hatch para casos extremos. Rejeitado porque complica a interface e reintroduz a confusão que estamos eliminando. Se o usuário não quer sync, não deve usar archive.

### 2. Remoção total do comando sync (sem deprecation period)

O comando é removido diretamente, sem período de deprecação ou mensagem de aviso.

**Alternativa considerada:** manter `pscode sync` como alias com aviso de deprecação. Rejeitado porque aumenta o custo de manutenção e adia a simplificação. O fluxo é claro: archive faz tudo.

### 3. Skill files dos adapters são removidos manualmente

Os arquivos `sync.md` gerados nos adapters (`.claude/`, `.cursor/`, etc.) são removidos como parte desta change. A regeneração via `pscode update` não incluirá mais sync.

## Risks / Trade-offs

- **[Breaking change]** → Qualquer script ou workflow externo que chame `pscode sync` quebrará. Mitigação: documentar claramente no changeset e no CHANGELOG.
- **[Sync silencioso no archive]** → Usuários que preferiam controle explícito sobre quando propagar specs podem se surpreender. Mitigação: log informativo claro durante archive.
- **[Testes a atualizar]** → `test/commands/sync.test.ts` e `test/core/archive.test.ts` precisam de atenção para não deixar cobertura cega. Mitigação: parte das tasks explicitamente.

## Migration Plan

1. Remover `src/commands/sync.ts`
2. Remover registro de `sync` em `src/cli/index.ts`
3. Remover `sync` de `ALL_WORKFLOWS` e profiles em `src/core/profiles.ts`
4. Atualizar `src/core/archive.ts` para sempre chamar sync ao final
5. Remover `--skip-specs` de `src/commands/archive.ts` se existir
6. Remover templates/arquivos `sync.md` dos adapters de command-generation
7. Deletar `test/commands/sync.test.ts`
8. Atualizar `test/core/archive.test.ts` e `test/core/profiles.test.ts`
9. Atualizar `CLAUDE.md` e `README.md`
10. Criar changeset `minor` (remoção de feature pública)

Rollback: git revert do commit desta change.

## Open Questions

Nenhuma.
