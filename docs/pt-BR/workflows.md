# Fluxos de Trabalho

Este guia aborda os padrões de workflow mais comuns do OpenSpec e quando usar cada um. Para configuração básica, consulte [Primeiros Passos](getting-started.md). Para referência de comandos, consulte [Comandos](commands.md).

## Filosofia: Ações, Não Fases

Workflows tradicionais forçam você a percorrer fases: planejamento, depois implementação, depois conclusão. Mas o trabalho real não se encaixa perfeitamente em caixas.

O OPSX adota uma abordagem diferente:

```text
Tradicional (fases fixas):

  PLANEJAMENTO ────────► IMPLEMENTAÇÃO ────────► CONCLUÍDO
       │                       │
       │   "Não dá pra voltar" │
       └───────────────────────┘

OPSX (ações fluidas):

  proposta ──► specs ──► design ──► tarefas ──► implementação
```

**Princípios fundamentais:**

- **Ações, não fases** — Os comandos são coisas que você pode fazer, não etapas em que você fica preso
- **Dependências são habilitadoras** — Elas mostram o que é possível, não o que é obrigatório em seguida

> **Personalização:** Os workflows do OPSX são orientados por schemas que definem sequências de artefatos. Consulte [Personalização](customization.md) para detalhes sobre como criar schemas personalizados.

## Dois Modos

### Caminho Rápido Padrão (perfil `core`)

Novas instalações usam `core` por padrão, que fornece:
- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`

Fluxo típico:

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

### Workflow Expandido/Completo (seleção personalizada)

Se você quiser comandos explícitos de scaffold e construção (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`), habilite-os com:

```bash
openspec config profile
openspec update
```

## Padrões de Workflow (Modo Expandido)

### Recurso Rápido

Quando você sabe o que quer construir e só precisa executar:

```text
/opsx:new ──► /opsx:ff ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

**Exemplo de conversa:**

```text
Você: /opsx:new add-logout-button

IA:   Criado openspec/changes/add-logout-button/
      Pronto para criar: proposta

Você: /opsx:ff

IA:   Criando todos os artefatos de planejamento...
      ✓ proposal.md
      ✓ specs/
      ✓ design.md
      ✓ tasks.md
      Pronto para implementação!

Você: /opsx:apply

IA:   Executando as tarefas...
      ✓ Botão de logout adicionado ao cabeçalho
      ✓ Limpeza de sessão implementada
      ✓ Diálogo de confirmação adicionado
      Todas as tarefas concluídas!

Você: /opsx:archive

IA:   ✓ Specs mescladas
      ✓ Mudança arquivada
```

**Ideal para:** Recursos pequenos a médios, correções de bugs, mudanças diretas.

### Exploratório

Quando os requisitos não estão claros ou você precisa investigar primeiro:

```text
/opsx:explore ──► /opsx:new ──► /opsx:continue ──► ... ──► /opsx:apply
```

**Exemplo de conversa:**

```text
Você: /opsx:explore

IA:   O que você gostaria de explorar?

Você: Quero melhorar o desempenho de carregamento das páginas, mas não tenho
      certeza de onde estão os gargalos.

IA:   Deixe-me ajudar a investigar...
      [Analisa tamanhos de bundles, identifica consultas lentas, revisa
      padrões de renderização de componentes]

      Encontrei três gargalos principais:
      1. Imagens grandes não otimizadas
      2. Busca de dados síncrona no ProductList
      3. Re-renderizações causadas por mudanças de contexto

      Qual você gostaria de resolver primeiro?

Você: Vamos atacar o problema de busca de dados.

Você: /opsx:new optimize-product-list-fetching

IA:   Mudança criada. Pronto para criar: proposta

Você: /opsx:continue

IA:   Criando proposta com base na nossa exploração...
      [Escreve a proposta incorporando os insights da investigação]

      Pronto para criar: specs, design
      Qual você gostaria a seguir?

Você: /opsx:continue

IA:   Criando specs...
```

**Ideal para:** Otimização de desempenho, depuração, decisões arquiteturais, requisitos pouco claros.

### Mudanças Paralelas

Trabalhe em múltiplas mudanças ao mesmo tempo:

```text
Mudança A: /opsx:new ──► /opsx:ff ──► /opsx:apply (em andamento)
                                          │
                                   troca de contexto
                                          │
Mudança B: /opsx:new ──► /opsx:ff ──────► /opsx:apply
```

**Exemplo de conversa:**

```text
Você: Estou trabalhando no add-dark-mode, mas fui chamado para corrigir um bug

Você: /opsx:new fix-login-redirect

IA:   Criado openspec/changes/fix-login-redirect/

Você: /opsx:ff

IA:   ✓ Artefatos de planejamento criados

Você: /opsx:apply

IA:   Trabalhando no fix-login-redirect...
      [Implementa a correção]
      Todas as tarefas concluídas!

Você: /opsx:archive

IA:   ✓ fix-login-redirect arquivado

Você: Vamos voltar ao modo escuro

Você: /opsx:apply add-dark-mode

IA:   Retomando add-dark-mode...
      Continuando na tarefa 2.3: Atualizar o Header...
```

**Ideal para:** Fluxos de trabalho paralelos, interrupções urgentes, colaboração em equipe.

Quando você tiver múltiplas mudanças concluídas, use `/opsx:bulk-archive`:

```text
Você: /opsx:bulk-archive

IA:   Encontradas 3 mudanças concluídas:
      - add-dark-mode (todas as tarefas feitas)
      - fix-login-redirect (todas as tarefas feitas)
      - update-footer (todas as tarefas feitas)

      Verificando conflitos de specs...
      ⚠ add-dark-mode e update-footer tocam em specs/ui/

      Inspecionando a base de código para resolver...
      Ambas as mudanças estão implementadas. Serão aplicadas em ordem cronológica.

      Arquivar as 3 mudanças?

Você: Sim

IA:   ✓ add-dark-mode arquivado
      ✓ fix-login-redirect arquivado
      ✓ update-footer arquivado
      Specs mescladas na ordem: add-dark-mode → update-footer
```

O bulk archive detecta quando múltiplas mudanças tocam nas mesmas specs e resolve conflitos verificando o que está realmente implementado.

### Concluindo uma Mudança

O fluxo de conclusão recomendado:

```text
/opsx:apply ──► /opsx:verify ──► /opsx:archive
                    │                 │
              valida a          solicita sync
              implementação     se necessário
```

#### Verify: Verifique seu Trabalho

`/opsx:verify` valida a implementação em relação aos seus artefatos em três dimensões:

```text
Você: /opsx:verify

IA:   Verificando add-auth...

      COMPLETUDE
      ✓ Todas as 12 tarefas em tasks.md estão marcadas
      ✓ Todos os requisitos nas specs têm código correspondente
      ⚠ Cenário "Session timeout after inactivity" não está testado

      CORREÇÃO
      ✓ A implementação corresponde à intenção da spec
      ✓ Casos extremos dos cenários são tratados
      ✓ Estados de erro correspondem às definições da spec

      COERÊNCIA
      ✓ Decisões de design refletidas na estrutura do código
      ✓ Convenções de nomenclatura consistentes com design.md
      ⚠ O design menciona "orientado a eventos", mas a implementação usa polling

      RESUMO
      ─────────────────────────────
      Problemas críticos: 0
      Avisos: 2
      Pronto para arquivar: Sim (com avisos)

      Recomendações:
      1. Adicionar teste para o cenário de timeout de sessão
      2. Considerar refatorar para orientado a eventos conforme projetado, ou atualizar design.md
```

**O que o verify verifica:**

| Dimensão | O que valida |
|----------|--------------|
| Completude | Todas as tarefas feitas, todos os requisitos implementados, cenários cobertos |
| Correção | A implementação corresponde à intenção da spec, casos extremos tratados |
| Coerência | Decisões de design refletidas no código, padrões consistentes |

O verify não bloqueia o archive, mas evidencia problemas que você pode querer resolver antes.

#### Archive: Finalizar a Mudança

`/opsx:archive` conclui a mudança e a move para o histórico:

```text
Você: /opsx:archive

IA:   Arquivando add-auth...

      Status dos artefatos:
      ✓ proposal.md existe
      ✓ specs/ existe
      ✓ design.md existe
      ✓ tasks.md existe (12/12 tarefas concluídas)

      Delta specs: Ainda não sincronizadas com o principal
      → Você gostaria de sincronizar agora?

Você: Sim

IA:   ✓ Specs sincronizadas com openspec/specs/auth/spec.md
      ✓ Movido para openspec/changes/archive/2025-01-24-add-auth/

      Mudança arquivada com sucesso.
```

O archive solicitará que as specs sejam sincronizadas caso ainda não estejam. Ele não bloqueia em tarefas incompletas, mas irá alertá-lo.

## Quando Usar o Quê

### `/opsx:ff` vs `/opsx:continue`

| Situação | Use |
|----------|-----|
| Requisitos claros, pronto para construir | `/opsx:ff` |
| Explorando, quer revisar cada etapa | `/opsx:continue` |
| Quer iterar na proposta antes das specs | `/opsx:continue` |
| Pressão de tempo, precisa avançar rápido | `/opsx:ff` |
| Mudança complexa, quer controle | `/opsx:continue` |

**Regra geral:** Se você consegue descrever o escopo completo antecipadamente, use `/opsx:ff`. Se está descobrindo à medida que avança, use `/opsx:continue`.

### Quando Atualizar vs Começar do Zero

Uma pergunta comum: quando é adequado atualizar uma mudança existente e quando você deve iniciar uma nova?

**Atualize a mudança existente quando:**

- Mesma intenção, execução refinada
- Escopo reduzido (MVP primeiro, o resto depois)
- Correções orientadas pelo aprendizado (a base de código não era o que você esperava)
- Ajustes de design baseados em descobertas da implementação

**Inicie uma nova mudança quando:**

- A intenção mudou fundamentalmente
- O escopo explodiu para um trabalho completamente diferente
- A mudança original pode ser marcada como "concluída" de forma independente
- As correções confundiriam mais do que esclareceriam

```text
                     ┌─────────────────────────────────────┐
                     │     É o mesmo trabalho?             │
                     └──────────────┬──────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          Mesma intenção?   >50% de sobreposição?  O original pode
          Mesmo problema?   Mesmo escopo?          ser "concluído" sem
                 │                  │              essas mudanças?
                 │                  │                  │
       ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
       │                 │  │             │   │               │
      SIM              NÃO SIM          NÃO  NÃO            SIM
       │                 │  │             │   │               │
       ▼                 ▼  ▼             ▼   ▼               ▼
    ATUALIZAR          NOVA ATUALIZAR   NOVA ATUALIZAR       NOVA
```

**Exemplo: "Adicionar modo escuro"**

- "Preciso também suportar temas personalizados" → Nova mudança (escopo explodiu)
- "Detectar preferência do sistema é mais difícil do que esperado" → Atualizar (mesma intenção)
- "Vamos lançar o toggle primeiro, adicionar preferências depois" → Atualizar e arquivar, depois nova mudança

## Boas Práticas

### Mantenha as Mudanças Focadas

Uma unidade lógica de trabalho por mudança. Se você está fazendo "adicionar recurso X e também refatorar Y", considere duas mudanças separadas.

**Por que isso importa:**
- Mais fácil de revisar e entender
- Histórico de arquivo mais limpo
- Pode ser entregue de forma independente
- Rollback mais simples se necessário

### Use `/opsx:explore` para Requisitos Pouco Claros

Antes de se comprometer com uma mudança, explore o espaço do problema:

```text
Você: /opsx:explore

IA:   O que você gostaria de explorar?

Você: Como devemos lidar com rate limiting para nossa API?

IA:   Deixe-me investigar sua configuração atual e as opções...
      [Pesquisa a base de código, considera padrões]

      Vejo três abordagens que poderíamos adotar:
      1. Baseada em middleware (simples, por endpoint)
      2. Apoiada por Redis (escalável, estado compartilhado)
      3. Token bucket por usuário (justa, complexa)

      Sua stack atual sugere #1 ou #2. Qual é a sua escala?
```

A exploração clarifica o pensamento antes de você criar os artefatos.

### Verifique Antes de Arquivar

Use `/opsx:verify` para checar se a implementação corresponde aos artefatos:

```text
Você: /opsx:verify

IA:   Verificando add-dark-mode...

      ✓ Todas as tarefas em tasks.md estão marcadas
      ✓ Os requisitos nas specs têm código correspondente
      ✓ As decisões de design estão refletidas na implementação

      Pronto para arquivar!
```

Detecta inconsistências antes de você fechar a mudança.

### Nomeie as Mudanças de Forma Clara

Bons nomes tornam o `openspec list` útil:

```text
Bom:                           Evite:
add-dark-mode                  feature-1
fix-login-redirect             update
optimize-product-query         changes
implement-2fa                  wip
```

## Referência Rápida de Comandos

Para detalhes completos e opções dos comandos, consulte [Comandos](commands.md).

| Comando | Propósito | Quando Usar |
|---------|-----------|-------------|
| `/opsx:propose` | Criar mudança + artefatos de planejamento | Caminho rápido padrão (perfil `core`) |
| `/opsx:explore` | Pensar sobre ideias | Requisitos pouco claros, investigação |
| `/opsx:new` | Iniciar um scaffold de mudança | Modo expandido, controle explícito de artefatos |
| `/opsx:continue` | Criar o próximo artefato | Modo expandido, criação de artefatos passo a passo |
| `/opsx:ff` | Criar todos os artefatos de planejamento | Modo expandido, escopo claro |
| `/opsx:apply` | Implementar tarefas | Pronto para escrever código |
| `/opsx:verify` | Validar a implementação | Modo expandido, antes de arquivar |
| `/opsx:sync` | Mesclar delta specs | Modo expandido, opcional |
| `/opsx:archive` | Concluir a mudança | Todo o trabalho finalizado |
| `/opsx:bulk-archive` | Arquivar múltiplas mudanças | Modo expandido, trabalho paralelo |

## Próximos Passos

- [Comandos](commands.md) — Referência completa de comandos com opções
- [Conceitos](concepts.md) — Aprofundamento em specs, artefatos e schemas
- [Personalização](customization.md) — Crie workflows personalizados
