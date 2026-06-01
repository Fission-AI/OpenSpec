# /pstld:jira-draft — Criar rascunho de issue JIRA

Você é um assistente de integração JIRA criando uma issue a partir do contexto da change atual.

## Passos

1. **Leia a configuração JIRA local**

   Leia o arquivo `pastelsdd/jira.yaml` na raiz do projeto.

   - **Se o arquivo não existir ou `configured: false`:**
     ```
     ℹ️  Integração JIRA não configurada.
     Execute /pstld:jira-setup para configurar o projeto, tipo de issue e transição "done".
     ```
     Encerre aqui.

2. **Identifique a change ativa**

   Verifique se há uma change ativa em `pscode/changes/`. Se houver exatamente uma, use-a. Se houver várias, peça ao usuário para especificar. Se não houver nenhuma, solicite título e descrição manualmente.

   - **Se a change for identificada:** leia `proposal.md` e `.pscode.yaml` para extrair título e contexto.
   - **Se não houver change:** solicite título e descrição ao usuário antes de continuar.

3. **Verifique disponibilidade do MCP Atlassian**

   Tente obter informações do usuário autenticado:

   ```tool
   mcp__atlassian__get_current_user
   ```

   - **Se falhar:**
     ```
     ⚠️  MCP Atlassian não está disponível nesta sessão.
     Verifique se o servidor MCP está configurado em .mcp.json e reinicie o Claude Code.
     ```
     Encerre aqui.

4. **Crie a issue JIRA**

   Use os dados de `jira.yaml` (`projectKey`, `defaultIssueType`) e o contexto da change para criar a issue:

   ```tool
   mcp__atlassian__create_issue
     project: <projectKey de jira.yaml>
     summary: <título da change>
     description: <descrição derivada do proposal.md ou fornecida pelo usuário>
     issuetype: <defaultIssueType de jira.yaml>
   ```

5. **Vincule a issue à change**

   Se a issue for criada com sucesso e a change for identificada, grave o `jiraIssueKey` no `.pscode.yaml` da change:

   - Leia o `.pscode.yaml` atual
   - Adicione ou atualize o campo `jiraIssueKey` com a chave retornada (ex: `PROJ-123`)
   - Salve o arquivo

6. **Exiba o resultado**

   ```markdown
   ## Issue JIRA Criada ✅

   **Issue:** <jiraIssueKey>
   **Título:** <summary>
   **Projeto:** <projectKey>
   **Tipo:** <defaultIssueType>
   **Link:** <url da issue>

   O campo `jiraIssueKey` foi gravado em `.pscode.yaml`.
   Ao executar `pscode complete`, a issue será transitada para "done" automaticamente.
   ```

7. **Tratamento de erros**

   Para qualquer falha não coberta acima, exiba uma mensagem descritiva e sugira:
   - Verificar conectividade de rede
   - Confirmar permissões do token Atlassian
   - Verificar `projectKey` e `defaultIssueType` em `pastelsdd/jira.yaml`
