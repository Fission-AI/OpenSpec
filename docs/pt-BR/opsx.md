# Fluxo de Trabalho OPSX

> Feedback é bem-vindo no [Discord](https://discord.gg/YctCnvvshC).

## O Que É?

O OPSX é agora o fluxo de trabalho padrão do OpenSpec.

É um **fluxo de trabalho fluido e iterativo** para mudanças no OpenSpec. Sem mais fases rígidas — apenas ações que você pode executar a qualquer momento.

## Por Que Existe

O fluxo de trabalho legado do OpenSpec funciona, mas é **engessado**:

- **Instruções estão hardcoded** — enterradas no TypeScript, você não pode alterá-las
- **Tudo ou nada** — um grande comando cria tudo, não dá para testar partes individuais
- **Estrutura fixa** — mesmo fluxo de trabalho para todos, sem personalização
- **Caixa preta** — quando a saída da IA é ruim, você não pode ajustar os prompts

**O OPSX abre isso.** Agora qualquer pessoa pode:

1. **Experimentar com instruções** — editar um template, ver se a IA melhora
2. **Testar de forma granular** — validar as instruções de cada artefato de forma independente
3. **Personalizar fluxos de trabalho** — definir seus próprios artefatos e dependências
4. **Iterar rapidamente** — mudar um template, testar imediatamente, sem rebuild

```
Legacy workflow:                      OPSX:
┌────────────────────────┐           ┌────────────────────────┐
│  Hardcoded in package  │           │  schema.yaml           │◄── You edit this
│  (can't change)        │           │  templates/*.md        │◄── Or this
│        ↓               │           │        ↓               │
│  Wait for new release  │           │  Instant effect        │
│        ↓               │           │        ↓               │
│  Hope it's better      │           │  Test it yourself      │
└────────────────────────┘           └────────────────────────┘
```

**Isso é para todos:**
- **Equipes** — crie fluxos de trabalho que correspondam à forma como você realmente trabalha
- **Usuários avançados** — ajuste prompts para obter melhores saídas da IA para sua base de código
- **Contribuidores do OpenSpec** — experimente novas abordagens sem precisar de releases

Ainda estamos aprendendo o que funciona melhor. O OPSX nos permite aprender juntos.

## A Experiência do Usuário

**O problema com fluxos de trabalho lineares:**
Você está "na fase de planejamento", depois "na fase de implementação", depois "pronto". Mas o trabalho real não funciona assim. Você implementa algo, percebe que seu design estava errado, precisa atualizar as specs, continua implementando. Fases lineares lutam contra como o trabalho realmente acontece.

**Abordagem do OPSX:**
- **Ações, não fases** — criar, implementar, atualizar, arquivar — faça qualquer uma delas a qualquer momento
- **Dependências são facilitadores** — elas mostram o que é possível, não o que é obrigatório a seguir

```
  proposal ──→ specs ──→ design ──→ tasks ──→ implement
```

## Configuração

```bash
# Make sure you have openspec installed — skills are automatically generated
openspec init
```

Isso cria skills em `.claude/skills/` (ou equivalente) que assistentes de codificação com IA detectam automaticamente.

Por padrão, o OpenSpec usa o perfil de fluxo de trabalho `core` (`propose`, `explore`, `apply`, `archive`). Se você quiser os comandos de fluxo de trabalho expandido (`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`), configure-os com `openspec config profile` e aplique com `openspec update`.

Durante a configuração, você será solicitado a criar uma **configuração de projeto** (`openspec/config.yaml`). Isso é opcional, mas recomendado.

## Configuração do Projeto

A configuração do projeto permite definir padrões e injetar contexto específico do projeto em todos os artefatos.

### Criando a Configuração

A configuração é criada durante `openspec init`, ou manualmente:

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  API conventions: RESTful, JSON responses
  Testing: Vitest for unit tests, Playwright for e2e
  Style: ESLint with Prettier, strict TypeScript

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format for scenarios
  design:
    - Include sequence diagrams for complex flows
```

### Campos de Configuração

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `schema` | string | Schema padrão para novas mudanças (ex.: `spec-driven`) |
| `context` | string | Contexto do projeto injetado em todas as instruções de artefatos |
| `rules` | object | Regras por artefato, indexadas pelo ID do artefato |

### Como Funciona

**Precedência do schema** (maior para menor):
1. Flag CLI (`--schema <name>`)
2. Metadados da mudança (`.openspec.yaml` no diretório da mudança)
3. Configuração do projeto (`openspec/config.yaml`)
4. Padrão (`spec-driven`)

**Injeção de contexto:**
- O contexto é adicionado ao início das instruções de cada artefato
- Envolvido em tags `<context>...</context>`
- Ajuda a IA a entender as convenções do seu projeto

**Injeção de regras:**
- As regras são injetadas apenas para os artefatos correspondentes
- Envolvidas em tags `<rules>...</rules>`
- Aparecem após o contexto, antes do template

### IDs de Artefatos por Schema

**spec-driven** (padrão):
- `proposal` — Proposta de mudança
- `specs` — Especificações
- `design` — Design técnico
- `tasks` — Tarefas de implementação

### Validação da Configuração

- IDs de artefatos desconhecidos em `rules` geram avisos
- Nomes de schemas são validados contra os schemas disponíveis
- O contexto tem um limite de tamanho de 50KB
- YAML inválido é reportado com números de linha

### Resolução de Problemas

**"Unknown artifact ID in rules: X"**
- Verifique se os IDs dos artefatos correspondem ao seu schema (veja a lista acima)
- Execute `openspec schemas --json` para ver os IDs dos artefatos de cada schema

**Configuração não está sendo aplicada:**
- Certifique-se de que o arquivo está em `openspec/config.yaml` (não `.yml`)
- Verifique a sintaxe YAML com um validador
- As alterações na configuração têm efeito imediato (sem necessidade de reiniciar)

**Contexto muito grande:**
- O contexto é limitado a 50KB
- Resuma ou faça referência a documentos externos

## Comandos

| Comando | O que faz |
|---------|-----------|
| `/opsx:propose` | Cria uma mudança e gera artefatos de planejamento em uma etapa (caminho rápido padrão) |
| `/opsx:explore` | Pensa em ideias, investiga problemas, esclarece requisitos |
| `/opsx:new` | Inicia um novo scaffold de mudança (fluxo de trabalho expandido) |
| `/opsx:continue` | Cria o próximo artefato (fluxo de trabalho expandido) |
| `/opsx:ff` | Avança rapidamente os artefatos de planejamento (fluxo de trabalho expandido) |
| `/opsx:apply` | Implementa tarefas, atualizando artefatos conforme necessário |
| `/opsx:verify` | Valida a implementação contra os artefatos (fluxo de trabalho expandido) |
| `/opsx:sync` | Sincroniza specs delta com a principal (fluxo de trabalho expandido, opcional) |
| `/opsx:archive` | Arquiva quando concluído |
| `/opsx:bulk-archive` | Arquiva múltiplas mudanças concluídas (fluxo de trabalho expandido) |
| `/opsx:onboard` | Guia passo a passo por uma mudança completa (fluxo de trabalho expandido) |

## Uso

### Explorar uma ideia
```
/opsx:explore
```
Pense em ideias, investigue problemas, compare opções. Nenhuma estrutura necessária — apenas um parceiro de raciocínio. Quando os insights se cristalizarem, faça a transição para `/opsx:propose` (padrão) ou `/opsx:new`/`/opsx:ff` (expandido).

### Iniciar uma nova mudança
```
/opsx:propose
```
Cria a mudança e gera os artefatos de planejamento necessários antes da implementação.

Se você habilitou fluxos de trabalho expandidos, pode usar alternativamente:

```text
/opsx:new        # scaffold only
/opsx:continue   # create one artifact at a time
/opsx:ff         # create all planning artifacts at once
```

### Criar artefatos
```
/opsx:continue
```
Mostra o que está pronto para criar com base nas dependências, depois cria um artefato. Use repetidamente para construir sua mudança de forma incremental.

```
/opsx:ff add-dark-mode
```
Cria todos os artefatos de planejamento de uma vez. Use quando você tem uma visão clara do que está construindo.

### Implementar (a parte fluida)
```
/opsx:apply
```
Percorre as tarefas, marcando-as conforme avança. Se você está gerenciando múltiplas mudanças, pode executar `/opsx:apply <name>`; caso contrário, ele deve inferir pela conversa e solicitar que você escolha se não conseguir determinar.

### Finalizar
```
/opsx:archive   # Move to archive when done (prompts to sync specs if needed)
```

## Quando Atualizar vs. Começar do Zero

Você sempre pode editar sua proposta ou specs antes da implementação. Mas quando o refinamento se torna "este é um trabalho diferente"?

### O Que uma Proposta Captura

Uma proposta define três coisas:
1. **Intenção** — Qual problema você está resolvendo?
2. **Escopo** — O que está dentro/fora dos limites?
3. **Abordagem** — Como você vai resolver?

A questão é: o que mudou, e em que medida?

### Atualize a Mudança Existente Quando:

**Mesma intenção, execução refinada**
- Você descobre casos extremos que não considerou
- A abordagem precisa de ajustes, mas o objetivo não mudou
- A implementação revela que o design estava ligeiramente errado

**O escopo diminui**
- Você percebe que o escopo completo é muito grande, quer entregar o MVP primeiro
- "Adicionar modo escuro" → "Adicionar alternância de modo escuro (preferência do sistema na v2)"

**Correções baseadas em aprendizado**
- A base de código não está estruturada como você pensava
- Uma dependência não funciona como esperado
- "Usar variáveis CSS" → "Usar o prefixo dark: do Tailwind"

### Inicie uma Nova Mudança Quando:

**A intenção mudou fundamentalmente**
- O problema em si é diferente agora
- "Adicionar modo escuro" → "Adicionar sistema de temas abrangente com cores, fontes e espaçamento personalizados"

**O escopo explodiu**
- A mudança cresceu tanto que é essencialmente um trabalho diferente
- A proposta original ficaria irreconhecível após as atualizações
- "Corrigir bug de login" → "Reescrever sistema de autenticação"

**A original pode ser concluída**
- A mudança original pode ser marcada como "feita"
- O novo trabalho existe por conta própria, não é um refinamento
- Conclua "Adicionar MVP de modo escuro" → Arquivar → Nova mudança "Aprimorar modo escuro"

### As Heurísticas

```
                        ┌─────────────────────────────────────┐
                        │     Is this the same work?          │
                        └──────────────┬──────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
             Same intent?      >50% overlap?      Can original
             Same problem?     Same scope?        be "done" without
                    │                  │          these changes?
                    │                  │                  │
          ┌────────┴────────┐  ┌──────┴──────┐   ┌───────┴───────┐
          │                 │  │             │   │               │
         YES               NO YES           NO  NO              YES
          │                 │  │             │   │               │
          ▼                 ▼  ▼             ▼   ▼               ▼
       UPDATE            NEW  UPDATE       NEW  UPDATE          NEW
```

| Teste | Atualizar | Nova Mudança |
|-------|-----------|--------------|
| **Identidade** | "Mesma coisa, refinada" | "Trabalho diferente" |
| **Sobreposição de escopo** | >50% sobrepõe | <50% sobrepõe |
| **Conclusão** | Não pode ser "feita" sem as mudanças | Pode terminar a original, novo trabalho existe por conta própria |
| **Narrativa** | A cadeia de atualizações conta uma história coerente | Correções confundiriam mais do que esclareceriam |

### O Princípio

> **Atualizar preserva o contexto. Nova mudança proporciona clareza.**
>
> Escolha atualizar quando o histórico do seu raciocínio é valioso.
> Escolha novo quando começar do zero seria mais claro do que corrigir.

Pense como branches do git:
- Continue fazendo commits enquanto trabalha na mesma funcionalidade
- Inicie um novo branch quando for genuinamente um trabalho novo
- Às vezes faça merge de uma funcionalidade parcial e comece do zero para a fase 2

## O Que é Diferente?

| | Legado (`/openspec:proposal`) | OPSX (`/opsx:*`) |
|---|---|---|
| **Estrutura** | Um grande documento de proposta | Artefatos discretos com dependências |
| **Fluxo de trabalho** | Fases lineares: planejar → implementar → arquivar | Ações fluidas — faça qualquer coisa a qualquer momento |
| **Iteração** | Difícil voltar atrás | Atualizar artefatos conforme aprende |
| **Personalização** | Estrutura fixa | Baseado em schema (defina seus próprios artefatos) |

**O insight principal:** o trabalho não é linear. O OPSX para de fingir que é.

## Visão Detalhada da Arquitetura

Esta seção explica como o OPSX funciona internamente e como se compara ao fluxo de trabalho legado.
Os exemplos nesta seção usam o conjunto de comandos expandido (`new`, `continue`, etc.); usuários do `core` padrão podem mapear o mesmo fluxo para `propose → apply → archive`.

### Filosofia: Fases vs. Ações

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEGACY WORKFLOW                                      │
│                    (Phase-Locked, All-or-Nothing)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐             │
│   │   PLANNING   │ ───► │ IMPLEMENTING │ ───► │   ARCHIVING  │             │
│   │    PHASE     │      │    PHASE     │      │    PHASE     │             │
│   └──────────────┘      └──────────────┘      └──────────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│   /openspec:proposal   /openspec:apply      /openspec:archive              │
│                                                                             │
│   • Creates ALL artifacts at once                                          │
│   • Can't go back to update specs during implementation                    │
│   • Phase gates enforce linear progression                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                            OPSX WORKFLOW                                     │
│                      (Fluid Actions, Iterative)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              ┌────────────────────────────────────────────┐                 │
│              │           ACTIONS (not phases)             │                 │
│              │                                            │                 │
│              │   new ◄──► continue ◄──► apply ◄──► archive │                 │
│              │    │          │           │           │    │                 │
│              │    └──────────┴───────────┴───────────┘    │                 │
│              │              any order                     │                 │
│              └────────────────────────────────────────────┘                 │
│                                                                             │
│   • Create artifacts one at a time OR fast-forward                         │
│   • Update specs/design/tasks during implementation                        │
│   • Dependencies enable progress, phases don't exist                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Arquitetura de Componentes

**Fluxo de trabalho legado** usa templates hardcoded em TypeScript:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEGACY WORKFLOW COMPONENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Hardcoded Templates (TypeScript strings)                                  │
│                    │                                                        │
│                    ▼                                                        │
│   Tool-specific configurators/adapters                                      │
│                    │                                                        │
│                    ▼                                                        │
│   Generated Command Files (.claude/commands/openspec/*.md)                  │
│                                                                             │
│   • Fixed structure, no artifact awareness                                  │
│   • Change requires code modification + rebuild                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**OPSX** usa schemas externos e um motor de grafo de dependências:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPSX COMPONENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Schema Definitions (YAML)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  name: spec-driven                                                  │   │
│   │  artifacts:                                                         │   │
│   │    - id: proposal                                                   │   │
│   │      generates: proposal.md                                         │   │
│   │      requires: []              ◄── Dependencies                     │   │
│   │    - id: specs                                                      │   │
│   │      generates: specs/**/*.md  ◄── Glob patterns                    │   │
│   │      requires: [proposal]      ◄── Enables after proposal           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Artifact Graph Engine                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  • Topological sort (dependency ordering)                           │   │
│   │  • State detection (filesystem existence)                           │   │
│   │  • Rich instruction generation (templates + context)                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                    │                                                        │
│                    ▼                                                        │
│   Skill Files (.claude/skills/openspec-*/SKILL.md)                          │
│                                                                             │
│   • Cross-editor compatible (Claude Code, Cursor, Windsurf)                 │
│   • Skills query CLI for structured data                                    │
│   • Fully customizable via schema files                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Grafo de Dependências

Os artefatos formam um grafo acíclico dirigido (DAG). Dependências são **facilitadores**, não portões:

```
                              proposal
                             (root node)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
                 specs                       design
              (requires:                  (requires:
               proposal)                   proposal)
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                               tasks
                           (requires:
                           specs, design)
                                  │
                                  ▼
                          ┌──────────────┐
                          │ APPLY PHASE  │
                          │ (requires:   │
                          │  tasks)      │
                          └──────────────┘
```

**Transições de estado:**

```
   BLOCKED ────────────────► READY ────────────────► DONE
      │                        │                       │
   Missing                  All deps               File exists
   dependencies             are DONE               on filesystem
```

### Fluxo de Informações

**Fluxo de trabalho legado** — o agente recebe instruções estáticas:

```
  User: "/openspec:proposal"
           │
           ▼
  ┌─────────────────────────────────────────┐
  │  Static instructions:                   │
  │  • Create proposal.md                   │
  │  • Create tasks.md                      │
  │  • Create design.md                     │
  │  • Create specs/<capability>/spec.md    │
  │                                         │
  │  No awareness of what exists or         │
  │  dependencies between artifacts         │
  └─────────────────────────────────────────┘
           │
           ▼
  Agent creates ALL artifacts in one go
```

**OPSX** — o agente consulta por contexto rico:

```
  User: "/opsx:continue"
           │
           ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  Step 1: Query current state                                             │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec status --change "add-auth" --json                      │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "artifacts": [                                                  │  │
  │  │      {"id": "proposal", "status": "done"},                         │  │
  │  │      {"id": "specs", "status": "ready"},      ◄── First ready      │  │
  │  │      {"id": "design", "status": "ready"},                          │  │
  │  │      {"id": "tasks", "status": "blocked", "missingDeps": ["specs"]}│  │
  │  │    ]                                                               │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 2: Get rich instructions for ready artifact                        │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  $ openspec instructions specs --change "add-auth" --json          │  │
  │  │                                                                    │  │
  │  │  {                                                                 │  │
  │  │    "template": "# Specification\n\n## ADDED Requirements...",      │  │
  │  │    "dependencies": [{"id": "proposal", "path": "...", "done": true}│  │
  │  │    "unlocks": ["tasks"]                                            │  │
  │  │  }                                                                 │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  Step 3: Read dependencies → Create ONE artifact → Show what's unlocked  │
  └──────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Iteração

**Fluxo de trabalho legado** — difícil de iterar:

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐
  │/proposal│ ──► │ /apply  │ ──► │/archive │
  └─────────┘     └─────────┘     └─────────┘
       │               │
       │               ├── "Wait, the design is wrong"
       │               │
       │               ├── Options:
       │               │   • Edit files manually (breaks context)
       │               │   • Abandon and start over
       │               │   • Push through and fix later
       │               │
       │               └── No official "go back" mechanism
       │
       └── Creates ALL artifacts at once
```

**OPSX** — iteração natural:

```
  /opsx:new ───► /opsx:continue ───► /opsx:apply ───► /opsx:archive
      │                │                  │
      │                │                  ├── "The design is wrong"
      │                │                  │
      │                │                  ▼
      │                │            Just edit design.md
      │                │            and continue!
      │                │                  │
      │                │                  ▼
      │                │         /opsx:apply picks up
      │                │         where you left off
      │                │
      │                └── Creates ONE artifact, shows what's unlocked
      │
      └── Scaffolds change, waits for direction
```

### Schemas Personalizados

Crie fluxos de trabalho personalizados usando os comandos de gerenciamento de schema:

```bash
# Create a new schema from scratch (interactive)
openspec schema init my-workflow

# Or fork an existing schema as a starting point
openspec schema fork spec-driven my-workflow

# Validate your schema structure
openspec schema validate my-workflow

# See where a schema resolves from (useful for debugging)
openspec schema which my-workflow
```

Schemas são armazenados em `openspec/schemas/` (local do projeto, versionado) ou `~/.local/share/openspec/schemas/` (global do usuário).

**Estrutura do schema:**
```
openspec/schemas/research-first/
├── schema.yaml
└── templates/
    ├── research.md
    ├── proposal.md
    └── tasks.md
```

**Exemplo de schema.yaml:**
```yaml
name: research-first
artifacts:
  - id: research        # Added before proposal
    generates: research.md
    requires: []

  - id: proposal
    generates: proposal.md
    requires: [research]  # Now depends on research

  - id: tasks
    generates: tasks.md
    requires: [proposal]
```

**Grafo de Dependências:**
```
   research ──► proposal ──► tasks
```

### Resumo

| Aspecto | Legado | OPSX |
|---------|--------|------|
| **Templates** | TypeScript hardcoded | YAML + Markdown externos |
| **Dependências** | Nenhuma (tudo de uma vez) | DAG com ordenação topológica |
| **Estado** | Modelo mental baseado em fases | Existência no sistema de arquivos |
| **Personalização** | Editar código-fonte, rebuild | Criar schema.yaml |
| **Iteração** | Bloqueada por fases | Fluida, edite qualquer coisa |
| **Suporte a Editores** | Configurador/adaptadores específicos por ferramenta | Diretório único de skills |

## Schemas

Schemas definem quais artefatos existem e suas dependências. Atualmente disponíveis:

- **spec-driven** (padrão): proposal → specs → design → tasks

```bash
# List available schemas
openspec schemas

# See all schemas with their resolution sources
openspec schema which --all

# Create a new schema interactively
openspec schema init my-workflow

# Fork an existing schema for customization
openspec schema fork spec-driven my-workflow

# Validate schema structure before use
openspec schema validate my-workflow
```

## Dicas

- Use `/opsx:explore` para pensar em uma ideia antes de se comprometer com uma mudança
- `/opsx:ff` quando você sabe o que quer, `/opsx:continue` quando está explorando
- Durante `/opsx:apply`, se algo estiver errado — corrija o artefato, depois continue
- As tarefas rastreiam o progresso via checkboxes em `tasks.md`
- Verifique o status a qualquer momento: `openspec status --change "name"`

## Feedback

Isso ainda está em desenvolvimento. Isso é intencional — estamos aprendendo o que funciona.

Encontrou um bug? Tem ideias? Junte-se a nós no [Discord](https://discord.gg/YctCnvvshC) ou abra uma issue no [GitHub](https://github.com/Fission-AI/openspec/issues).
