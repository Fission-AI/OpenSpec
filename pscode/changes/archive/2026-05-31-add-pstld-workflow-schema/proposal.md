## Why

O perfil `dixi` do pscode usa um fluxo RFC → Design → Tasks diferente do `spec-driven` padrão. Hoje não existe um schema que modele esse fluxo, então projetos Dixi não conseguem usar `pscode new change` com o workflow correto. Criar o schema `pstld-workflow` resolve isso sem nenhuma mudança em TypeScript — apenas YAML e markdown.

## What Changes

- Novo schema `pstld-workflow` em `schemas/pstld-workflow/schema.yaml` com DAG de 3 artefatos: `rfc` → `design` → `tasks`
- Template `schemas/pstld-workflow/templates/rfc.md` com seções de RFC (contexto, problema, solução, alternativas, impacto, critérios)
- Template `schemas/pstld-workflow/templates/design.md` com seções de design técnico (componentes, contratos, testes, segurança)
- Template `schemas/pstld-workflow/templates/tasks.md` com tasks numeradas e checklist DoD

## Capabilities

### New Capabilities

- `pstld-workflow-schema`: Schema de workflow `rfc → design → tasks` para projetos Dixi; resolve artefatos em DAG, agnóstico de stack

### Modified Capabilities

_(nenhuma — nenhum spec existente é alterado)_

## Impact

- Apenas arquivos em `schemas/pstld-workflow/` (novos)
- Nenhuma mudança em TypeScript ou testes existentes
- O schema fica disponível via `pscode new change --schema pstld-workflow` e como `defaultSchema` do profile `dixi`
- Changeset: patch
