# 1 — Adicionar comando nos comentários

## Resumo

Quando uma tarefa é capturada no Trello (hoje via `/pstl:draft`), o comando que
leva essa tarefa para a **próxima etapa** deve ser publicado como **comentário**
no card — e não apenas embutido na descrição.

O comentário deve usar **markdown corretamente** (bloco de código para o comando,
deixando-o fácil de copiar e colar).

## Como é hoje

O `/pstl:draft` cria o card e coloca o próximo passo dentro da **descrição**:

```
Ideia original: "<texto bruto>"

Proximo passo: /pstl:propose para refinar e gerar os artefatos da change.
```

Referência: `src/core/templates/workflows/trello-draft.ts` (Step 5 e Step 6).

## Como deve ficar

Além de criar o card, o fluxo deve **adicionar um comentário** com o comando da
próxima etapa, em markdown:

````markdown
**Próximo passo:** levar esta tarefa para a próxima etapa.

```
/pstl:propose
```
````

Detalhes:

- O comando vai num bloco de código (crase tripla) para facilitar o copiar/colar.
- O comentário é criado via `mcp__claude_ai_Trello_Custom__add_comment`
  (`card_id`, `text`).
- A descrição pode deixar de carregar o "Proximo passo" (ou manter, a definir),
  já que agora ele vive no comentário.

## Critérios de aceitação

- [x] Ao rodar `/pstl:draft`, é criado um comentário no card com o comando da
      próxima etapa.
- [x] O comando aparece em bloco de código markdown, copiável.
- [x] Funciona para cada tarefa criada (não só a primeira).
- [x] Se o MCP do Trello falhar ao comentar, o fluxo não quebra (comentário é
      auxiliar, igual ao label).

## Implementação

Feito em `src/core/templates/workflows/trello-draft.ts`:
- Novo **Step 7 — Add next-step comment** usando
  `mcp__claude_ai_Trello_Custom__add_comment` com o comando `/pstl:propose` em
  bloco de código markdown (não bloqueante em caso de falha do MCP).
- "Próximo passo" mantido também na descrição (Step 5).
- Steps de label e summary renumerados (8 e 9); summary e guardrails atualizados.

## Observações

Esta é a primeira demanda da pasta `demandas/`. Cada nova demanda entra como uma
subpasta numerada: `demandas/<n>-<slug>/`.
