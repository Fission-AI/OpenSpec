# Spec: pstld-workflow-schema

## Purpose

<!-- TBD: Describe the overall purpose of the pstld-workflow schema capability. -->
Define and ship the `pstld-workflow` Pscode schema — a DAG-based workflow schema tailored to the Dixi RFC → Design → Tasks engineering process.

## Requirements

### Requirement: Schema pstld-workflow disponível no pscode
O pscode SHALL reconhecer e carregar o schema `pstld-workflow` a partir de `schemas/pstld-workflow/schema.yaml`, tornando-o disponível para criação de changes via `--schema pstld-workflow`.

#### Scenario: Criar change com schema pstld-workflow
- **WHEN** o usuário executa `pscode new change "minha-feature" --schema pstld-workflow`
- **THEN** o sistema SHALL criar o diretório `pscode/changes/minha-feature/` com `.openspec.yaml` registrando `schema: pstld-workflow`

#### Scenario: Status mostra artefatos do schema correto
- **WHEN** o usuário executa `pscode status --change "minha-feature"` em uma change com `schema: pstld-workflow`
- **THEN** o sistema SHALL listar os artefatos `rfc`, `design` e `tasks` (nessa ordem topológica)

### Requirement: DAG rfc → design → tasks com dependências corretas
O schema SHALL definir um DAG onde `rfc` não tem dependências, `design` requer `rfc`, e `tasks` requer tanto `rfc` quanto `design`.

#### Scenario: rfc está pronto para criação imediata
- **WHEN** uma change `pstld-workflow` é recém-criada (nenhum artefato existente)
- **THEN** `pscode status --json` SHALL retornar `rfc` com `status: "ready"` e `design` e `tasks` com `status: "blocked"`

#### Scenario: design desbloqueia após rfc
- **WHEN** o artefato `rfc.md` existe na change
- **THEN** `pscode status --json` SHALL retornar `design` com `status: "ready"`

#### Scenario: tasks desbloqueia apenas após rfc e design
- **WHEN** `rfc.md` existe mas `design.md` ainda não existe
- **THEN** `pscode status --json` SHALL retornar `tasks` com `status: "blocked"` e `missingDeps: ["design"]`

#### Scenario: tasks pronto quando ambos existem
- **WHEN** tanto `rfc.md` quanto `design.md` existem na change
- **THEN** `pscode status --json` SHALL retornar `tasks` com `status: "ready"`

### Requirement: Templates de artefatos com seções adequadas ao fluxo Dixi
O schema SHALL fornecer templates para `rfc.md`, `design.md` e `tasks.md` com seções que guiam o fluxo RFC → Design → Tasks da Dixi.

#### Scenario: Template rfc contém seções de RFC
- **WHEN** o usuário consulta `pscode instructions rfc --change "<name>" --json`
- **THEN** o campo `template` SHALL conter seções: `Context`, `Problem`, `Proposed Solution`, `Alternatives Considered`, `Architectural Impact`, `Acceptance Criteria`

#### Scenario: Template design contém seções técnicas
- **WHEN** o usuário consulta `pscode instructions design --change "<name>" --json`
- **THEN** o campo `template` SHALL conter seções: `Affected Components`, `Interface Contracts`, `Test Plan`, `Security Considerations`

#### Scenario: Template tasks contém checklist numerado e DoD
- **WHEN** o usuário consulta `pscode instructions tasks --change "<name>" --json`
- **THEN** o campo `template` SHALL conter seções de tasks numeradas com checkboxes `- [ ]` e uma seção `Definition of Done`
