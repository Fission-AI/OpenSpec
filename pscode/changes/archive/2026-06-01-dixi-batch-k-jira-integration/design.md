## Context

O profile `dixi` já possui infraestrutura JIRA parcial após o Batch J: `pscode init --profile dixi` gera `pastelsdd/jira.yaml` e faz merge do servidor MCP Atlassian em `.mcp.json`. Porém, não há comando para criar issues, configurar o YAML interativamente, vincular changes a issues ou transitar status automaticamente no complete.

O `installDixiExtras` (Batch B) já instala arquivos de slash command em `.claude/commands/pstld/` — o Batch E adicionou 5 comandos e o Batch K adiciona mais 2. O campo `jiraIssueKey` no `.pscode.yaml` requer extensão do schema Zod de change-metadata. A transição de status no `pscode complete` (anteriormente `archive`) depende da rename implementada pelo Draft 2.

## Goals / Non-Goals

**Goals:**
- Adicionar `/pstld:jira-draft` e `/pstld:jira-setup` ao conjunto de slash commands do profile dixi
- Introduzir `jiraIssueKey` como campo opcional no `.pscode.yaml`
- Transitar automaticamente a issue JIRA vinculada ao executar `pscode complete` em changes dixi
- Expandir `installDixiExtras` para incluir os 2 novos arquivos de comando

**Non-Goals:**
- Substituir completamente o Trello como opção de board (Trello continua disponível para outros profiles)
- Sincronizar bidirecional entre JIRA e pscode (apenas transição de status no complete)
- Suportar múltiplas issues JIRA por change (1:1 change ↔ issue)
- Modificar o schema `pastelsdd/jira.yaml` gerado pelo init (apenas adicionar `transitions.done` ao que já existe)

## Decisions

### 1. Slash commands como arquivos markdown em pscode/content/

**Decisão:** `jira-draft.md` e `jira-setup.md` seguem o mesmo padrão dos 5 comandos existentes — arquivos markdown em `pscode/content/dixi/claude-runtime/commands/` copiados por `installDixiExtras`.

**Rationale:** Consistência com o padrão estabelecido no Batch E. Evita criar um mecanismo diferente de distribuição de comandos. Alternativa considerada: gerar os arquivos dinamicamente no init — rejeitada por introduzir acoplamento desnecessário.

### 2. jiraIssueKey no .pscode.yaml como campo opcional Zod

**Decisão:** Adicionar `jiraIssueKey: z.string().optional()` ao schema Zod de change-metadata (`src/core/change-metadata/`). O campo é gravado manualmente pelo dev ou pelo `/pstld:jira-draft`.

**Rationale:** O `.pscode.yaml` já é o locus natural de metadados de change. Usar um arquivo separado (ex: `.jira-link`) fragmentaria o estado. Campo opcional garante retrocompatibilidade com changes existentes sem `jiraIssueKey`.

### 3. Transição JIRA via MCP Atlassian no comando complete

**Decisão:** `pscode complete` lê `jiraIssueKey` do `.pscode.yaml` e `transitions.done` do `pastelsdd/jira.yaml` do projeto atual, depois chama o MCP Atlassian (`transitionJiraIssue`). Falhas são non-fatal: emitem aviso mas não interrompem o complete.

**Rationale:** O complete não deve falhar por causa de JIRA — o artefato local (change movida para archive/) é a fonte da verdade. A transição JIRA é efeito colateral desejável, não requisito bloqueante. Alternativa: bloquear o complete em caso de falha — rejeitada por criar dependency frágil em serviço externo.

### 4. transitions.done como ID de transição no jira.yaml

**Decisão:** `pastelsdd/jira.yaml` receberá o campo `transitions.done` contendo o ID numérico da transição JIRA (ex: `"31"`), preenchido pelo `/pstld:jira-setup`.

**Rationale:** IDs são estáveis; nomes de transição podem variar por configuração de workflow JIRA. O MCP Atlassian (`transitionJiraIssue`) aceita tanto ID quanto nome — usar ID evita ambiguidade.

## Risks / Trade-offs

- **MCP Atlassian não disponível em runtime** → Mitigation: os comandos `/pstld:jira-draft` e `/pstld:jira-setup` verificam a disponibilidade e exibem mensagem orientativa; a transição no complete é non-fatal
- **jiraIssueKey preenchido com issue do projeto errado** → Mitigation: validação de formato (`[A-Z]+-[0-9]+`) emite aviso, mas não bloqueia; responsabilidade do dev garantir a chave correta
- **transitions.done ausente em jira.yaml** → Mitigation: complete verifica a presença do campo antes de tentar transitar; emite aviso se ausente e prossegue

## Open Questions

- O `/pstld:jira-draft` deve gravar `jiraIssueKey` automaticamente no `.pscode.yaml` da change ativa, ou apenas exibir o valor para o dev copiar manualmente?
  - Preferência inicial: gravar automaticamente se a change for identificável pelo diretório atual
- O campo `transitions.done` deve aceitar nome de transição além de ID para facilitar configuração manual do jira.yaml?
