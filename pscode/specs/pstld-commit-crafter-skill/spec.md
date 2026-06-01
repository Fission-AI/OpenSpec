# Spec: pstld-commit-crafter-skill

## Purpose

Skill que monta automaticamente mensagens de commit no formato Conventional Commits ao detectar pedidos de commit, inferindo tipo, escopo (via stack detectada em `.pscode-dixi.yaml`) e incluindo referência ao ticket JIRA quando configurado.

## Requirements

### Requirement: Skill é auto-invocada ao pedido de commit
A skill `pstld-commit-crafter` SHALL ser ativada automaticamente quando o usuário mencionar "commit" no prompt ou pedir para fazer commit. A skill MUST montar uma mensagem de commit no formato Conventional Commits antes de executar o `git commit`.

#### Scenario: Usuário pede commit explicitamente
- **WHEN** o prompt do usuário contém "commit" ou variações ("fazer commit", "commitar", "cria um commit")
- **THEN** a skill é ativada antes de executar `git commit`

---

### Requirement: Detecção de stack para inferência de escopo
A skill SHALL ler `.pscode-dixi.yaml` para determinar `family` e inferir o escopo da mensagem de commit de acordo com a stack. Se o arquivo não existir, SHALL usar um escopo genérico baseado nos arquivos modificados.

#### Scenario: Escopo Java — bounded context
- **WHEN** `family === 'java'` e os arquivos modificados estão em `src/main/java/{basePackage}/payment/`
- **THEN** o escopo inferido é `payment`

#### Scenario: Escopo React — nome da feature
- **WHEN** `family === 'react'` e os arquivos modificados estão em `src/features/user-management/`
- **THEN** o escopo inferido é `user-management`

#### Scenario: Stack desconhecida — escopo pelo módulo/diretório
- **WHEN** `.pscode-dixi.yaml` não existe ou `family` é `null`
- **THEN** o escopo é inferido pelo diretório principal dos arquivos modificados

---

### Requirement: Mensagem de commit inclui ticket JIRA obrigatório
A skill SHALL verificar se `pastelsdd/jira.yaml` tem `project_key` configurado. Se sim, a mensagem de commit MUST terminar com `[PROJECT_KEY-???]`. Se o número do ticket não for conhecido, a skill MUST perguntar ao usuário antes de finalizar.

#### Scenario: project_key configurado e ticket conhecido
- **WHEN** `pastelsdd/jira.yaml` tem `project_key: PROJ` e o número do ticket é informado como `42`
- **THEN** a mensagem termina com `[PROJ-42]`

#### Scenario: project_key configurado mas ticket desconhecido
- **WHEN** `pastelsdd/jira.yaml` tem `project_key` configurado e o ticket não foi mencionado no prompt
- **THEN** a skill pergunta "Qual o número do ticket JIRA?" antes de finalizar a mensagem

#### Scenario: project_key não configurado
- **WHEN** `pastelsdd/jira.yaml` não existe ou `configured: false`
- **THEN** a mensagem de commit é montada sem referência a ticket JIRA

---

### Requirement: Formato final da mensagem de commit
A mensagem gerada pela skill SHALL seguir o formato: `tipo(escopo): descrição em português ou inglês [PROJECT_KEY-NNN]` (ticket opcional conforme cenário acima). Tipos válidos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

#### Scenario: Mensagem bem formada
- **WHEN** a skill detecta tipo `feat`, escopo `payment`, descrição "adiciona validação de cartão" e ticket `PROJ-99`
- **THEN** a mensagem gerada é `feat(payment): adiciona validação de cartão [PROJ-99]`
