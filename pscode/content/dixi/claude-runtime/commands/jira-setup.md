# /pstld:jira-setup — Configurar integração JIRA

Você é um assistente de configuração JIRA guiando o desenvolvedor na criação ou atualização de `pastelsdd/jira.yaml`.

## Passos

1. **Verifique disponibilidade do MCP Atlassian**

   Tente obter informações do usuário autenticado:

   ```tool
   mcp__atlassian__get_current_user
   ```

   - **Se falhar:**
     ```
     ⚠️  MCP Atlassian não está disponível nesta sessão.
     Para configurar, adicione ao .mcp.json do projeto:

     {
       "mcpServers": {
         "atlassian": {
           "command": "npx",
           "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/sse"]
         }
       }
     }

     Reinicie o Claude Code após adicionar a configuração.
     ```
     Encerre aqui.

2. **Leia configuração existente (se houver)**

   Tente ler `pastelsdd/jira.yaml`. Se existir e tiver valores, exiba-os como ponto de partida:
   ```
   Configuração atual encontrada:
     Projeto: <projectKey>
     Tipo de issue: <defaultIssueType>
     Transição "done": <transitions.done>
   ```

3. **Selecione o projeto JIRA**

   Liste os projetos acessíveis:

   ```tool
   mcp__atlassian__list_projects
   ```

   Apresente a lista ao usuário e peça para selecionar o projeto padrão para novas issues.
   Se já houver um `projectKey` configurado, destaque-o como opção atual.

4. **Selecione o tipo de issue padrão**

   Liste os tipos de issue disponíveis para o projeto selecionado:

   ```tool
   mcp__atlassian__get_issue_types
     project: <projectKey selecionado>
   ```

   Apresente a lista. O tipo padrão usual é "Story" ou "Task" — destaque se disponível.

5. **Selecione a transição "done"**

   Liste as transições disponíveis no workflow do projeto:

   ```tool
   mcp__atlassian__get_transitions
     project: <projectKey selecionado>
   ```

   Apresente as transições e peça ao usuário para identificar qual representa "concluído/done".
   Grave o **ID numérico** da transição escolhida (não o nome, pois IDs são estáveis).

6. **Grave pastelsdd/jira.yaml**

   Crie ou sobrescreva o arquivo com as escolhas:

   ```yaml
   project_key: "<projectKey>"
   default_issue_type: "<defaultIssueType>"
   configured: true
   transitions:
     done: "<ID da transição done>"
   ```

   Preserve quaisquer campos adicionais existentes no arquivo que não foram alterados.

7. **Exiba resumo da configuração**

   ```markdown
   ## Integração JIRA Configurada ✅

   **Projeto:** <projectKey>
   **Tipo de issue padrão:** <defaultIssueType>
   **Transição "done":** <nome> (ID: <id>)

   ### Próximos passos
   - Use /pstld:jira-draft para criar uma issue JIRA a partir da change atual
   - Adicione `jiraIssueKey` ao .pscode.yaml de uma change para vinculá-la a uma issue existente
   - Ao executar `pscode complete`, a issue vinculada será transitada para "done" automaticamente
   - Use /pstld:jira-sync para verificar a conexão a qualquer momento
   ```
