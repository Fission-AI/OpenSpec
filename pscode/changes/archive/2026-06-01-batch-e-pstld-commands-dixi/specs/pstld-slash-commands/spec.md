## ADDED Requirements

### Requirement: Cinco slash commands /pstld:* existem como arquivos markdown em pscode/content
O sistema SHALL fornecer 5 arquivos markdown em `pscode/content/dixi/claude-runtime/commands/` (rfc.md, arch-check.md, adr.md, jira-sync.md, dod.md). Cada arquivo define o comportamento do respectivo slash command para o Claude Code.

#### Scenario: Arquivos existem no diretório correto do pscode
- **WHEN** o repositório pscode for inspecionado em `pscode/content/dixi/claude-runtime/commands/`
- **THEN** os 5 arquivos rfc.md, arch-check.md, adr.md, jira-sync.md e dod.md SHALL existir

### Requirement: Cada comando referencia os context docs instalados pelo Batch C
Os arquivos de comando SHALL referenciar `pastelsdd/context/` para obter documentação de arquitetura, DoD e fluxo de desenvolvimento sem embutir esse conteúdo inline.

#### Scenario: /pstld:rfc usa dev-flow.md como referência
- **WHEN** o arquivo rfc.md for lido
- **THEN** ele SHALL mencionar `pastelsdd/context/dev-flow.md` como fonte do fluxo RFC

#### Scenario: /pstld:arch-check usa architecture.md como referência
- **WHEN** o arquivo arch-check.md for lido
- **THEN** ele SHALL mencionar `pastelsdd/context/architecture.md` como fonte das regras arquiteturais

#### Scenario: /pstld:dod usa dod.md como referência
- **WHEN** o arquivo dod.md for lido
- **THEN** ele SHALL mencionar `pastelsdd/context/dod.md` como fonte dos critérios de DoD

### Requirement: Os comandos são agnósticos de stack na definição mas detectam family em runtime
Os arquivos de comando SHALL instruir o Claude Code a ler `.pscode-dixi.yaml` para determinar `family` (java | react | null) e adaptar o output correspondente.

#### Scenario: /pstld:arch-check instrui leitura de .pscode-dixi.yaml
- **WHEN** o arquivo arch-check.md for lido
- **THEN** ele SHALL conter instrução para ler `.pscode-dixi.yaml` e adaptar verificação à family detectada

#### Scenario: /pstld:rfc é executável independente de stack
- **WHEN** o usuário executar `/pstld:rfc` em um projeto sem .pscode-dixi.yaml
- **THEN** o comando SHALL funcionar produzindo RFC genérico sem falhar

### Requirement: /pstld:jira-sync instrui verificação via MCP Atlassian e pastelsdd/jira.yaml
O arquivo jira-sync.md SHALL instruir o Claude Code a ler `pastelsdd/jira.yaml`, verificar se `configured: true`, e usar `mcp__atlassian__*` para testar a conexão.

#### Scenario: jira-sync.md instrui leitura de pastelsdd/jira.yaml
- **WHEN** o arquivo jira-sync.md for lido
- **THEN** ele SHALL referenciar `pastelsdd/jira.yaml` e instruir verificação de `configured`

#### Scenario: jira-sync.md menciona fallback quando JIRA não configurado
- **WHEN** o arquivo jira-sync.md for lido
- **THEN** ele SHALL conter instrução de output amigável caso `configured: false` ou arquivo ausente
