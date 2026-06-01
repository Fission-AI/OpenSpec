## Context

O método `createConfig` em `src/core/init.ts` (linha ~717) grava o `pscode/config.yaml` sempre com `schema: spec-driven` (via `DEFAULT_SCHEMA`). O profile já é resolvido mais cedo no fluxo de init, mas não é consultado na hora de gravar o config.

O schema `pstld-workflow` já existe e está disponível no pacote (`schemas/pstld-workflow/`).

## Goals / Non-Goals

**Goals:**
- `pscode init --profile dixi` gera `config.yaml` com `schema: pstld-workflow`
- Mensagem de log após o init reflete o schema real gravado
- Todos os outros profiles continuam usando `spec-driven`

**Non-Goals:**
- Não alterar como o profile é resolvido (já funciona corretamente)
- Não migrar projetos existentes com `config.yaml` já criado
- Não introduzir mapeamento genérico profile→schema configurável (YAGNI)

## Decisions

**Decisão: Mapear o schema dentro de `createConfig` via checagem direta do profile**

`createConfig` recebe `pscodePath` e `extendMode`. Para acessar o profile, a forma mais simples é seguir o mesmo padrão já usado em `handleDixiExtras` e `displaySuccessMessage`: chamar `this.resolveProfileOverride()` e `getGlobalConfig()` dentro do próprio método.

Alternativa considerada: passar o schema resolvido como parâmetro para `createConfig`. Mais explícito, mas aumenta a assinatura sem ganho real — o método já tem acesso ao contexto da instância.

**Decisão: `DEFAULT_SCHEMA` local em init.ts não é alterado**

O `DEFAULT_SCHEMA = 'spec-driven'` em `init.ts` é usado tanto para o log quanto para o valor padrão. A lógica correta é: gravar o schema apropriado ao profile e usar esse valor para o log, sem alterar o `DEFAULT_SCHEMA` (que serve como fallback para outros profiles).

## Risks / Trade-offs

- **[Risk] `config.yaml` existente não é afetado** → Sem mitigação necessária; o comportamento atual já respeita configs existentes (`return 'exists'` no método).
- **[Risk] Profile resolvido de forma inconsistente** → Baixo: a resolução já segue uma ordem canônica (`resolveProfileOverride()` → global config → `DEFAULT_PROFILE`) usada em múltiplos lugares da classe.

## Migration Plan

Sem necessidade de migração. Projetos com `config.yaml` existente não são afetados. Projetos novos criados com `--profile dixi` passam a receber o schema correto automaticamente.

## Open Questions

_(nenhuma)_
