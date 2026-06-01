## Purpose

TBD — Slash command `/pstld:jira-draft` que cria um rascunho de issue JIRA a partir do contexto da change ativa, usando o MCP Atlassian e a configuração em `pastelsdd/jira.yaml`.

## Requirements

### Requirement: Criar rascunho de issue JIRA a partir do contexto da change
O sistema SHALL fornecer o slash command `/pstld:jira-draft` que, ao ser invocado, lê `pastelsdd/jira.yaml` para determinar o projeto e tipo de issue padrão, usa o MCP Atlassian para criar um rascunho de issue JIRA com título e descrição derivados do contexto da change atual, e exibe o link da issue criada.

#### Scenario: Execução com jira.yaml configurado e change ativa
- **WHEN** o desenvolvedor executa `/pstld:jira-draft` em um projeto dixi com `pastelsdd/jira.yaml` configurado e uma change ativa em `pscode/changes/`
- **THEN** o sistema cria um rascunho de issue JIRA no projeto definido em `jira.yaml`, preenchendo título e descrição com base no `proposal.md` da change atual, e exibe o `jiraIssueKey` da issue criada

#### Scenario: Execução sem jira.yaml presente
- **WHEN** o desenvolvedor executa `/pstld:jira-draft` e `pastelsdd/jira.yaml` não existe
- **THEN** o sistema exibe mensagem orientando a executar `/pstld:jira-setup` para configurar a integração JIRA antes de continuar

#### Scenario: Execução sem change ativa identificável
- **WHEN** o desenvolvedor executa `/pstld:jira-draft` sem change ativa no diretório corrente
- **THEN** o sistema solicita ao desenvolvedor que informe o título e a descrição da issue manualmente antes de criá-la

#### Scenario: Execução com MCP Atlassian indisponível
- **WHEN** o desenvolvedor executa `/pstld:jira-draft` e o MCP Atlassian não está configurado ou retorna erro
- **THEN** o sistema exibe mensagem de erro descritiva informando que o MCP Atlassian é necessário e orientando como configurá-lo
