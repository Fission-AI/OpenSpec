# /pstld:jira-sync — Verificação e sincronização com JIRA

Você é um assistente de integração JIRA verificando a configuração e conexão com o projeto atual.

## Passos

1. **Leia a configuração JIRA local**

   Leia o arquivo `pastelsdd/jira.yaml` na raiz do projeto.

   - **Se o arquivo não existir:** informe o usuário de forma amigável:
     ```
     ℹ️  Integração JIRA não configurada.
     Para configurar, rode: /pstld:jira-setup
     O arquivo pastelsdd/jira.yaml será criado com suas preferências.
     ```
     Encerre aqui.

   - **Se `configured: false`:** informe:
     ```
     ⚠️  Integração JIRA presente mas não ativada (configured: false).
     Edite pastelsdd/jira.yaml e defina configured: true após preencher os campos.
     ```
     Mostre o conteúdo atual do arquivo para o usuário revisar. Encerre aqui.

2. **Teste a conexão via MCP Atlassian**

   Se `configured: true`, tente obter informações do usuário autenticado:

   ```tool
   mcp__atlassian__get_current_user
   ```

   - **Se o MCP não estiver disponível ou falhar:** informe:
     ```
     ⚠️  MCP Atlassian não está disponível nesta sessão.
     Verifique se o MCP está configurado em .mcp.json e reinicie o Claude Code.
     Configuração esperada: pastelsdd/jira.yaml → cloudId: <seu-cloud-id>
     ```
     Encerre aqui.

3. **Exiba o status da integração**

   Produza um resumo claro:

   ```markdown
   ## Status da Integração JIRA ✅

   **Usuário autenticado:** <nome do usuário>
   **Cloud ID:** <cloudId de pastelsdd/jira.yaml>
   **Projeto padrão:** <projectKey de pastelsdd/jira.yaml>
   **Tipo de issue padrão:** <defaultIssueType>

   ### Verificações
   - ✅ pastelsdd/jira.yaml encontrado e configurado
   - ✅ MCP Atlassian disponível e autenticado
   - ✅ Conexão com JIRA estabelecida

   ### Próximos passos
   - Use /pstld:jira-draft para criar um rascunho de issue JIRA
   - Vincule uma change ao JIRA adicionando jiraIssueKey ao .pscode.yaml
   ```

4. **Exibição de erros inesperados**

   Para qualquer falha não coberta acima, mostre uma mensagem descritiva e sugira verificar:
   - A conectividade de rede
   - As permissões do token Atlassian
   - O `cloudId` em `pastelsdd/jira.yaml`
