# pstld-commit-crafter

## Trigger

Esta skill é auto-invocada quando o usuário mencionar **commit** no prompt ou solicitar fazer commit:

- "commit", "fazer commit", "commitar", "cria um commit", "faz o commit", "git commit"

Ative **antes** de executar qualquer `git commit`.

---

## Comportamento

### 1. Detectar stack para inferência de escopo

Leia `.pscode-dixi.yaml` na raiz do projeto e extraia `family`.

**Se `family: java`:**
- Inspecione os arquivos modificados via `git status` / `git diff --name-only`.
- Identifique o bounded context pelo diretório após o base package.
  - Ex: `src/main/java/com/empresa/payment/` → escopo `payment`
  - Ex: `src/main/java/com/empresa/order/domain/` → escopo `order`

**Se `family: react`:**
- Identifique o nome da feature pelo diretório em `src/features/`.
  - Ex: `src/features/user-management/` → escopo `user-management`
  - Ex: `src/features/checkout/` → escopo `checkout`

**Se `.pscode-dixi.yaml` não existir ou `family` for `null`:**
- Infira o escopo pelo diretório principal dos arquivos modificados.
  - Ex: maioria em `src/services/billing/` → escopo `billing`
  - Ex: maioria em `src/` → escopo do módulo mais frequente nos caminhos

---

### 2. Verificar ticket JIRA

Leia `pastelsdd/jira.yaml` na raiz do projeto.

- Se o arquivo **não existir** ou tiver `configured: false`: mensagem sem ticket JIRA (vá para seção 3).
- Se tiver `project_key` configurado: o ticket **é obrigatório**.

**Ticket presente no prompt:** use diretamente (ex: usuário mencionou "PROJ-42").

**Ticket ausente no prompt:** pergunte ao usuário:

> Qual o número do ticket JIRA? (ex: 42)
> O project key configurado é `[PROJECT_KEY]`.

Aguarde a resposta antes de continuar. Monte o sufixo `[PROJECT_KEY-NNN]` com o número fornecido.

---

### 3. Montar a mensagem de commit

Identifique o tipo baseado nos arquivos modificados e no contexto:

| Tipo | Quando usar |
|------|-------------|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `refactor` | mudança sem alterar comportamento |
| `test` | adição/correção de testes |
| `docs` | documentação apenas |
| `chore` | configuração, build, dependências |

Gere a mensagem no formato:

```
tipo(escopo): descrição concisa em português ou inglês [PROJECT_KEY-NNN]
```

Sem ticket quando `pastelsdd/jira.yaml` não configurado:

```
tipo(escopo): descrição concisa
```

**Exemplos:**
- `feat(payment): adiciona validação de cartão de crédito [PROJ-99]`
- `fix(user-management): corrige redirect após logout [APP-12]`
- `refactor(order): extrai lógica de cálculo para OrderPricingService [PROJ-55]`
- `test(checkout): cobre cenário de pedido sem estoque [SHOP-7]`

---

### 4. Apresentar a mensagem ao usuário

Exiba a mensagem proposta e pergunte:

> Mensagem de commit proposta:
> ```
> tipo(escopo): descrição [PROJECT_KEY-NNN]
> ```
> Deseja usar esta mensagem ou ajustar?

Se o usuário aprovar, execute o commit. Se quiser ajustar, aplique a correção e confirme novamente.
