## ADDED Requirements

### Requirement: Geração de jira.yaml durante init com profile dixi
Quando `pscode init --profile dixi` é executado, o sistema SHALL criar o arquivo `pastelsdd/jira.yaml` no diretório alvo com campos `project_key`, `board_url` e `configured: false`.

#### Scenario: Arquivo criado na primeira execução
- **WHEN** o usuário executa `pscode init --profile dixi` em um projeto sem `pastelsdd/jira.yaml`
- **THEN** o sistema cria `pastelsdd/jira.yaml` com `project_key: ""`, `board_url: ""` e `configured: false`

#### Scenario: Arquivo não sobrescrito se já existe
- **WHEN** o usuário executa `pscode init --profile dixi` e `pastelsdd/jira.yaml` já existe
- **THEN** o sistema preserva o arquivo existente sem modificação

### Requirement: Merge de .mcp.json com entrada Atlassian durante init com profile dixi
Quando `pscode init --profile dixi` é executado, o sistema SHALL adicionar a entrada `atlassian` em `.mcp.json` (no campo `mcpServers`) sem remover entradas existentes.

#### Scenario: .mcp.json não existe — criado do zero
- **WHEN** o projeto não possui `.mcp.json`
- **THEN** o sistema cria `.mcp.json` com `{ "mcpServers": { "atlassian": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"] } } }`

#### Scenario: .mcp.json existe com outras entradas — merge preserva entradas
- **WHEN** o projeto possui `.mcp.json` com outras entradas em `mcpServers`
- **THEN** o sistema adiciona apenas a chave `atlassian` sem remover as demais

#### Scenario: .mcp.json já contém entrada atlassian — sem duplicação
- **WHEN** o projeto possui `.mcp.json` com `mcpServers.atlassian` já definido
- **THEN** o sistema não modifica o arquivo

### Requirement: Mensagem de orientação pós-instalação JIRA
Após gerar os arquivos JIRA, o sistema SHALL exibir uma mensagem orientando o usuário a editar `pastelsdd/jira.yaml`.

#### Scenario: Mensagem exibida após init com profile dixi
- **WHEN** `pscode init --profile dixi` conclui com sucesso
- **THEN** o sistema exibe: "JIRA: edite pastelsdd/jira.yaml com project_key e board_url, depois use /pstld:jira-sync para testar a conexão."
