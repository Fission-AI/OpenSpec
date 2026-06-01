# pstld-jira-context

## Trigger

Esta skill é auto-invocada quando o prompt do usuário contém uma string no formato `[A-Z]+-\d+`:

- Exemplos: `PROJ-123`, `MYAPP-42`, `BE-7`, `PAYMENT-1001`
- A ativação ocorre **antes de gerar a resposta**, para enriquecer o contexto.

Se o prompt não contém nenhum padrão `[A-Z]+-\d+`, a skill não é ativada.

---

## Comportamento

### 1. Verificar configuração JIRA

Leia `pastelsdd/jira.yaml` na raiz do projeto.

**Se o arquivo não existir ou tiver `configured: false`:**

Exiba o seguinte aviso **uma única vez por sessão** (não repita em prompts subsequentes):

> ℹ️ Integração JIRA não configurada — edite `pastelsdd/jira.yaml` para habilitar.

Prossiga sem buscar contexto do ticket.

**Se tiver `configured: true`:** continue para a seção 2.

---

### 2. Buscar contexto do ticket via MCP

Use a ferramenta `mcp__atlassian__getJiraIssue` com a chave detectada no prompt (ex: `PROJ-123`).

**Se o ticket for encontrado**, injete as seguintes informações como contexto adicional **antes** de gerar a resposta:

> **Contexto JIRA — [CHAVE]**
>
> **Título:** [título do ticket]
>
> **Descrição:**
> [descrição do ticket]
>
> **Critérios de aceite:**
> [critérios de aceite, se disponíveis]

Em seguida, prossiga normalmente para responder ao prompt do usuário.

---

### 3. Tratamento de erro

**Se `mcp__atlassian__getJiraIssue` retornar erro** (ticket inexistente, permissão negada, MCP indisponível):

> ⚠️ Não foi possível obter contexto de `[CHAVE]`: [mensagem de erro resumida]. Prosseguindo sem contexto JIRA.

Não bloqueie a resposta — prossiga normalmente.

---

## Controle de sessão

O aviso "Integração JIRA não configurada" deve ser exibido **no máximo uma vez por sessão**. Se já foi exibido, omita-o em ativações subsequentes e prossiga em silêncio.
