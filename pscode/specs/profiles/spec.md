## Purpose

Defines the workflow profiles supported by pscode. Covers the `ALL_WORKFLOWS` union type, built-in profile definitions (`standard`, `dixi`), and the contract for profile-based initialization.

## Requirements

### Requirement: ALL_WORKFLOWS contém todos os IDs de workflow válidos
`ALL_WORKFLOWS` SHALL conter os seguintes IDs (lista completa):
`propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`, `trello-setup`, `draft`, `rfc`, `design`, `tasks`, `arch-check`, `adr`, `jira-sync`, `dod`.

#### Scenario: Novos IDs são aceitos como WorkflowId
- **WHEN** o código referencia qualquer um dos novos IDs (`rfc`, `design`, `tasks`, `arch-check`, `adr`, `jira-sync`, `dod`) como `WorkflowId`
- **THEN** o TypeScript compila sem erros de tipo

#### Scenario: IDs inválidos continuam rejeitados pelo tipo
- **WHEN** um ID não presente em `ALL_WORKFLOWS` é atribuído a `WorkflowId`
- **THEN** o compilador TypeScript emite erro de tipo

### Requirement: Profile dixi tem description e workflows corretos
`PROFILES.dixi` SHALL ter:
- `description`: `'Dixi — RFC→Design→Tasks→Apply com guardrails para Java/Spring e React/Next.js'`
- `workflows`: `['rfc', 'design', 'tasks', 'apply', 'arch-check', 'adr', 'jira-sync', 'dod']` (8 workflows)

#### Scenario: pscode config profile dixi exibe description correta
- **WHEN** o usuário executa `pscode config profile` em um projeto com profile dixi
- **THEN** a description exibida é `'Dixi — RFC→Design→Tasks→Apply com guardrails para Java/Spring e React/Next.js'`

#### Scenario: Profile dixi instala exatamente 8 workflows
- **WHEN** `pscode init --profile dixi` é executado
- **THEN** os 8 skill dirs correspondentes são gerados: `rfc`, `design`, `tasks`, `apply`, `arch-check`, `adr`, `jira-sync`, `dod`

#### Scenario: Profile standard permanece inalterado
- **WHEN** o usuário executa `pscode init --profile standard`
- **THEN** os workflows instalados são apenas `['propose', 'explore', 'apply', 'sync', 'archive']`
