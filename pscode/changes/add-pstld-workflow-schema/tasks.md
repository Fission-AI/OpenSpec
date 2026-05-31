## 1. Schema YAML

- [x] 1.1 Criar diretório `schemas/pstld-workflow/`
- [x] 1.2 Criar `schemas/pstld-workflow/schema.yaml` com `name: pstld-workflow`, `version: 1`, `description` e DAG de 3 artefatos (`rfc`, `design`, `tasks`) com dependências corretas
- [x] 1.3 Verificar que `rfc` tem `requires: []`, `design` tem `requires: [rfc]` e `tasks` tem `requires: [rfc, design]`
- [x] 1.4 Verificar que `apply.requires: [tasks]` e `apply.tracks: tasks.md` estão definidos no schema

## 2. Templates Markdown

- [x] 2.1 Criar `schemas/pstld-workflow/templates/rfc.md` com seções: `Context`, `Problem`, `Proposed Solution`, `Alternatives Considered`, `Architectural Impact`, `Acceptance Criteria`
- [x] 2.2 Criar `schemas/pstld-workflow/templates/design.md` com seções: `Affected Components`, `Interface Contracts`, `Test Plan`, `Security Considerations`
- [x] 2.3 Criar `schemas/pstld-workflow/templates/tasks.md` com grupos numerados de tasks (`- [ ] X.Y`) e seção `Definition of Done` no final

## 3. Verificação do Schema

- [x] 3.1 Executar `pscode new change "test-pstld" --schema pstld-workflow` e confirmar que a change é criada com `schema: pstld-workflow` no `.openspec.yaml`
- [x] 3.2 Executar `pscode status --change "test-pstld" --json` e confirmar que `rfc` aparece como `ready` e `design`/`tasks` como `blocked`
- [x] 3.3 Executar `pscode instructions rfc --change "test-pstld" --json` e confirmar que o template contém as seções corretas
- [x] 3.4 Remover a change de teste (`pscode/changes/test-pstld/`)

## 4. Changeset

- [x] 4.1 Executar `pnpm changeset` e criar entrada `patch` descrevendo a adição do schema `pstld-workflow`
