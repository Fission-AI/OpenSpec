## Context

O pscode suporta schemas plugáveis em `schemas/<name>/schema.yaml`. Cada schema define um DAG de artefatos com `id`, `generates`, `template`, `instruction` e `requires`. O schema `spec-driven` serve como referência de implementação.

O profile `dixi` precisa de um schema próprio (`pstld-workflow`) cujo fluxo é RFC → Design → Tasks — diferente do `spec-driven` (proposal → specs → design → tasks). Como schemas são puramente declarativos (YAML + templates markdown), nenhuma mudança em TypeScript é necessária.

## Goals / Non-Goals

**Goals:**
- Criar `schemas/pstld-workflow/schema.yaml` com DAG `rfc → design → tasks`
- Criar três templates markdown com seções adequadas ao contexto Dixi
- O schema deve funcionar com `pscode new change --schema pstld-workflow`

**Non-Goals:**
- Não alterar TypeScript, testes ou schemas existentes
- Não registrar o schema como default global (o profile `dixi` fará isso via `defaultSchema`)
- Não criar skills ou hooks (outros batches)

## Decisions

**DAG: rfc sem dependências, design requer rfc, tasks requer rfc e design**

Alternativa considerada: tasks requer apenas design (como `spec-driven`). Rejeitada porque em projetos Dixi o tasks gerador consulta tanto o RFC (para critérios de aceitação) quanto o design (para decomposição técnica); exigir ambos garante que nenhum artefato seja gerado prematuramente.

**Nomes de artefatos sem prefixo (`rfc`, não `pstld-rfc`)**

O schema é o namespace. Artefatos com nome curto (`rfc`) são mais legíveis nos outputs de `pscode status` e nos caminhos de arquivo (`rfc.md`), e não criam conflito porque cada change tem seu próprio diretório.

**Templates com seções em inglês**

Segue a convenção dos templates existentes (`spec-driven`). O conteúdo preenchido pelo usuário pode ser em qualquer língua.

## Risks / Trade-offs

- [Risco] O profile `dixi` ainda não referencia `pstld-workflow` como `defaultSchema` → Mitigação: esse vínculo é responsabilidade do Batch J; este schema apenas precisa existir no diretório correto
- [Trade-off] Templates deliberadamente simples (sem instruções inline) para não duplicar a `instruction` do schema.yaml — trade-off de DRY vs legibilidade do template

## Open Questions

_(nenhuma — escopo totalmente definido)_
