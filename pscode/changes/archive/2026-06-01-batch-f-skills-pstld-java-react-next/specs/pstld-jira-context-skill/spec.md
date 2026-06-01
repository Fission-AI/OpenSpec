## ADDED Requirements

### Requirement: Skill é auto-invocada ao detectar chave JIRA no prompt
A skill `pstld-jira-context` SHALL ser ativada automaticamente quando o prompt do usuário contiver uma string no formato `[A-Z]+-\d+` (ex: `PROJ-123`, `MYAPP-42`). A ativação ocorre antes de a resposta ser gerada.

#### Scenario: Prompt com chave JIRA detectada
- **WHEN** o prompt contém "preciso implementar PROJ-123"
- **THEN** a skill é ativada para injetar contexto do ticket antes de responder

#### Scenario: Prompt sem chave JIRA
- **WHEN** o prompt não contém nenhuma string no formato `[A-Z]+-\d+`
- **THEN** a skill não é ativada

---

### Requirement: Injeção de contexto via MCP Atlassian quando configurado
Quando `pastelsdd/jira.yaml` tiver `configured: true`, a skill SHALL usar `mcp__atlassian__getJiraIssue` para buscar título, descrição e critérios de aceite do ticket. O contexto obtido MUST ser injetado no prompt antes de gerar a resposta.

#### Scenario: JIRA configurado — contexto injetado
- **WHEN** `pastelsdd/jira.yaml` tem `configured: true` e `board_url` preenchido, e o ticket `PROJ-123` existe
- **THEN** título, descrição e critérios de aceite do ticket são injetados como contexto adicional antes da resposta

#### Scenario: Ticket não encontrado via MCP
- **WHEN** `mcp__atlassian__getJiraIssue` retorna erro (ticket inexistente ou permissão negada)
- **THEN** a skill menciona o erro brevemente e prossegue sem bloquear a resposta

---

### Requirement: Comportamento quando JIRA não configurado
Se `pastelsdd/jira.yaml` não existir ou `configured: false`, a skill SHALL mencionar uma única vez que a integração JIRA não está configurada e prosseguir sem buscar contexto.

#### Scenario: Integração não configurada — aviso único
- **WHEN** `pastelsdd/jira.yaml` tem `configured: false` ou não existe
- **THEN** a skill exibe "Integração JIRA não configurada — edite pastelsdd/jira.yaml para habilitar" e prossegue normalmente

#### Scenario: Aviso não repetido dentro da mesma sessão
- **WHEN** a skill já exibiu o aviso de não configurado nesta sessão
- **THEN** a skill não exibe o aviso novamente em prompts subsequentes
