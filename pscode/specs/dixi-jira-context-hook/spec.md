## Purpose

Defines the `jira-context.mjs` hook for Claude Code. The hook runs as `UserPromptSubmit`, reads the prompt from stdin, and injects JIRA project context when the prompt references a ticket matching the pattern `[A-Z]+-\d+` and `pastelsdd/jira.yaml` is configured.

## Requirements

### Requirement: Hook jira-context detecta tickets no prompt
O hook `jira-context.mjs` SHALL interceptar o evento `UserPromptSubmit`, ler o prompt via stdin e verificar se contém um padrão de ticket JIRA (`[A-Z]+-\d+`).

#### Scenario: Prompt sem ticket JIRA
- **WHEN** o hook recebe um prompt que não contém padrão `[A-Z]+-\d+`
- **THEN** o hook encerra com `exit 0` sem output no stdout

#### Scenario: Prompt com ticket JIRA e jira.yaml ausente
- **WHEN** o hook recebe um prompt contendo um ticket como `PROJ-123`
- **AND** `pastelsdd/jira.yaml` não existe no workspace
- **THEN** o hook encerra com `exit 0` sem output

#### Scenario: Prompt com ticket JIRA e jira.yaml presente
- **WHEN** o hook recebe um prompt contendo um ticket como `PROJ-123`
- **AND** `pastelsdd/jira.yaml` existe com `project_key` e `board_url` configurados
- **THEN** o hook emite via stdout um bloco de contexto informando o projeto e URL do board e encerra com `exit 0`

---

### Requirement: Hook agnóstico de stack
O `jira-context.mjs` SHALL funcionar independentemente do valor de `family` em `.pscode-dixi.yaml` ou da ausência desse arquivo.

#### Scenario: Execução sem .pscode-dixi.yaml
- **WHEN** o hook é invocado em um workspace sem `.pscode-dixi.yaml`
- **AND** o prompt contém um ticket JIRA
- **AND** `pastelsdd/jira.yaml` está configurado
- **THEN** o hook injeta o contexto normalmente (family não é relevante para este hook)

---

### Requirement: Hook implementado em ESM puro sem dependências externas
O arquivo `jira-context.mjs` SHALL usar apenas APIs nativas do Node.js (`node:fs`, `node:path`, `node:process`). Nenhuma chamada à API JIRA é feita neste batch — o hook apenas lê `jira.yaml` local.

#### Scenario: Execução sem node_modules disponível
- **WHEN** o hook é executado em um workspace sem `node_modules`
- **THEN** o hook funciona normalmente sem erros de resolução de módulo
