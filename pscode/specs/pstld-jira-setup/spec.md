## Purpose

TBD — Slash command `/pstld:jira-setup` que guia o desenvolvedor interativamente na configuração de `pastelsdd/jira.yaml` usando o MCP Atlassian para listar projetos, tipos de issue e transições disponíveis.

## Requirements

### Requirement: Configurar integração JIRA interativamente via slash command
O sistema SHALL fornecer o slash command `/pstld:jira-setup` que, ao ser invocado, usa o MCP Atlassian para listar projetos, tipos de issue e transições disponíveis, e guia o desenvolvedor na configuração de `pastelsdd/jira.yaml` com as escolhas realizadas.

#### Scenario: Configuração inicial com MCP Atlassian disponível
- **WHEN** o desenvolvedor executa `/pstld:jira-setup` em um projeto dixi com MCP Atlassian configurado
- **THEN** o sistema lista os projetos JIRA acessíveis, solicita seleção do projeto padrão, lista os tipos de issue disponíveis, solicita seleção do tipo padrão, lista as transições de status, solicita qual transição representa "done", e grava `pastelsdd/jira.yaml` com as escolhas

#### Scenario: Reconfiguração com jira.yaml já existente
- **WHEN** o desenvolvedor executa `/pstld:jira-setup` e `pastelsdd/jira.yaml` já existe
- **THEN** o sistema exibe os valores atuais de cada configuração e permite sobrescrevê-los individualmente, preservando valores não alterados

#### Scenario: Execução com MCP Atlassian indisponível
- **WHEN** o desenvolvedor executa `/pstld:jira-setup` e o MCP Atlassian não está configurado
- **THEN** o sistema exibe mensagem de erro informando que o MCP Atlassian é necessário e fornece instruções para adicioná-lo ao `.mcp.json` do projeto

### Requirement: Gerar pastelsdd/jira.yaml com configuração completa
O sistema SHALL gravar `pastelsdd/jira.yaml` com os campos `projectKey`, `defaultIssueType` e `transitions.done` resultantes da execução de `/pstld:jira-setup`, criando o arquivo se não existir e sobrescrevendo-o se existir.

#### Scenario: Arquivo gerado com campos obrigatórios
- **WHEN** o desenvolvedor conclui o fluxo de `/pstld:jira-setup` selecionando projeto, tipo e transição
- **THEN** `pastelsdd/jira.yaml` é gravado com `projectKey`, `defaultIssueType` e `transitions.done` preenchidos

#### Scenario: Arquivo preserva campos customizados preexistentes
- **WHEN** `pastelsdd/jira.yaml` já contém campos adicionais não gerenciados pelo setup
- **THEN** os campos adicionais são preservados após a gravação
