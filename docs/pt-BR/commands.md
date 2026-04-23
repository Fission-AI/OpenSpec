# Comandos

Esta é a referência dos comandos slash do OpenSpec. Esses comandos são invocados na interface de chat do seu assistente de codificação com IA (ex.: Claude Code, Cursor, Windsurf).

Para padrões de fluxo de trabalho e quando usar cada comando, consulte [Workflows](workflows.md). Para comandos CLI, consulte [CLI](cli.md).

## Referência Rápida

### Caminho Rápido Padrão (perfil `core`)

| Comando | Finalidade |
|---------|---------|
| `/opsx:propose` | Criar uma mudança e gerar artefatos de planejamento em um único passo |
| `/opsx:explore` | Explorar ideias antes de se comprometer com uma mudança |
| `/opsx:apply` | Implementar tarefas da mudança |
| `/opsx:archive` | Arquivar uma mudança concluída |

### Comandos de Fluxo de Trabalho Expandido (seleção de workflow personalizado)

| Comando | Finalidade |
|---------|---------|
| `/opsx:new` | Iniciar uma estrutura inicial para uma nova mudança |
| `/opsx:continue` | Criar o próximo artefato com base nas dependências |
| `/opsx:ff` | Fast-forward: criar todos os artefatos de planejamento de uma vez |
| `/opsx:verify` | Validar se a implementação corresponde aos artefatos |
| `/opsx:sync` | Mesclar delta specs nas specs principais |
| `/opsx:bulk-archive` | Arquivar múltiplas mudanças de uma vez |
| `/opsx:onboard` | Tutorial guiado pelo fluxo de trabalho completo |

O perfil global padrão é `core`. Para habilitar os comandos de fluxo de trabalho expandido, execute `openspec config profile`, selecione os workflows e, em seguida, execute `openspec update` no seu projeto.

---

## Referência de Comandos

### `/opsx:propose`

Criar uma nova mudança e gerar artefatos de planejamento em um único passo. Este é o comando de início padrão no perfil `core`.

**Sintaxe:**
```text
/opsx:propose [change-name-or-description]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name-or-description` | Não | Nome em kebab-case ou descrição da mudança em linguagem natural |

**O que faz:**
- Cria `openspec/changes/<change-name>/`
- Gera os artefatos necessários antes da implementação (para `spec-driven`: proposal, specs, design, tasks)
- Para quando a mudança estiver pronta para `/opsx:apply`

**Exemplo:**
```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /opsx:apply.
```

**Dicas:**
- Use para o caminho mais rápido de ponta a ponta
- Se quiser controle passo a passo sobre os artefatos, habilite os workflows expandidos e use `/opsx:new` + `/opsx:continue`

---

### `/opsx:explore`

Explorar ideias, investigar problemas e esclarecer requisitos antes de se comprometer com uma mudança.

**Sintaxe:**
```
/opsx:explore [topic]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `topic` | Não | O que você deseja explorar ou investigar |

**O que faz:**
- Abre uma conversa exploratória sem estrutura necessária
- Investiga a base de código para responder perguntas
- Compara opções e abordagens
- Cria diagramas visuais para esclarecer o raciocínio
- Pode transicionar para `/opsx:propose` (padrão) ou `/opsx:new` (fluxo de trabalho expandido) quando as ideias se consolidam

**Exemplo:**
```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle authentication for the mobile app?

AI:  Let me investigate your current auth setup...
     [Analyzes codebase]

     I see you're using session-based auth for the web app.
     For mobile, we have three main options:

     1. JWT tokens (stateless, works offline)
     2. OAuth2 (if you need third-party login)
     3. Extend current sessions (simpler, but requires connectivity)

     Your API already has CORS configured. Which direction interests you?

You: Let's go with JWT. Can we start a change for that?

AI:  Ready when you are. Run /opsx:propose add-jwt-auth to begin.
```

**Dicas:**
- Use quando os requisitos não estão claros ou você precisa investigar
- Nenhum artefato é criado durante a exploração
- Bom para comparar múltiplas abordagens antes de decidir
- Pode ler arquivos e pesquisar na base de código

---

### `/opsx:new`

Iniciar uma estrutura inicial para uma nova mudança. Cria a pasta da mudança e aguarda que você gere os artefatos com `/opsx:continue` ou `/opsx:ff`.

Este comando faz parte do conjunto de fluxo de trabalho expandido (não incluído no perfil `core` padrão).

**Sintaxe:**
```
/opsx:new [change-name] [--schema <schema-name>]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Nome para a pasta da mudança (solicitado se não fornecido) |
| `--schema` | Não | Schema de fluxo de trabalho a usar (padrão: da configuração ou `spec-driven`) |

**O que faz:**
- Cria o diretório `openspec/changes/<change-name>/`
- Cria o arquivo de metadados `.openspec.yaml` na pasta da mudança
- Exibe o primeiro template de artefato pronto para criação
- Solicita o nome da mudança e o schema se não fornecidos

**O que cria:**
```
openspec/changes/<change-name>/
└── .openspec.yaml    # Change metadata (schema, created date)
```

**Exemplo:**
```
You: /opsx:new add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: spec-driven

     Ready to create: proposal
     Use /opsx:continue to create it, or /opsx:ff to create all artifacts.
```

**Dicas:**
- Use nomes descritivos: `add-feature`, `fix-bug`, `refactor-module`
- Evite nomes genéricos como `update`, `changes`, `wip`
- O schema também pode ser definido na configuração do projeto (`openspec/config.yaml`)

---

### `/opsx:continue`

Criar o próximo artefato na cadeia de dependências. Cria um artefato de cada vez para progresso incremental.

**Sintaxe:**
```
/opsx:continue [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança continuar (inferida do contexto se não fornecida) |

**O que faz:**
- Consulta o grafo de dependência dos artefatos
- Mostra quais artefatos estão prontos versus bloqueados
- Cria o primeiro artefato disponível
- Lê os arquivos de dependência para contexto
- Mostra o que fica disponível após a criação

**Exemplo:**
```
You: /opsx:continue

AI:  Change: add-dark-mode

     Artifact status:
     ✓ proposal    (done)
     ◆ specs       (ready)
     ◆ design      (ready)
     ○ tasks       (blocked - needs: specs)

     Creating specs...

     [Reads proposal.md, creates specs based on requirements]

     ✓ Created openspec/changes/add-dark-mode/specs/ui/spec.md

     Now available: tasks
     Run /opsx:continue to create the next artifact.
```

**Dicas:**
- Use quando quiser revisar cada artefato antes de prosseguir
- Bom para mudanças complexas onde você quer controle
- Múltiplos artefatos podem ficar prontos simultaneamente
- Você pode editar os artefatos criados antes de continuar

---

### `/opsx:ff`

Avançar rapidamente pela criação de artefatos. Cria todos os artefatos de planejamento de uma vez.

**Sintaxe:**
```
/opsx:ff [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança avançar rapidamente (inferida do contexto se não fornecida) |

**O que faz:**
- Cria todos os artefatos na ordem de dependência
- Acompanha o progresso por meio de uma lista de tarefas
- Para quando todos os artefatos `apply-required` estiverem completos
- Lê cada dependência antes de criar o próximo artefato

**Exemplo:**
```
You: /opsx:ff add-dark-mode

AI:  Fast-forwarding add-dark-mode...

     ✓ Creating proposal.md
     ✓ Creating specs/ui/spec.md
     ✓ Creating design.md
     ✓ Creating tasks.md

     All planning artifacts complete!
     Ready for implementation. Run /opsx:apply to begin.
```

**Dicas:**
- Use quando você tem uma ideia clara do que está construindo
- Mais rápido que `/opsx:continue` para mudanças diretas
- Você ainda pode editar os artefatos depois
- Bom para funcionalidades pequenas a médias

---

### `/opsx:apply`

Implementar tarefas da mudança. Percorre a lista de tarefas, escrevendo código e marcando os itens como concluídos.

**Sintaxe:**
```
/opsx:apply [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança implementar (inferida do contexto se não fornecida) |

**O que faz:**
- Lê `tasks.md` e identifica tarefas incompletas
- Percorre as tarefas uma a uma
- Escreve código, cria arquivos, executa testes conforme necessário
- Marca as tarefas como concluídas com checkboxes `[x]`

**Exemplo:**
```
You: /opsx:apply

AI:  Implementing add-dark-mode...

     Reading tasks.md:
     - [ ] 1.1 Create ThemeContext
     - [ ] 1.2 Add CSS custom properties
     - [ ] 1.3 Implement localStorage persistence

     Working on 1.1: Create ThemeContext...
     [Creates src/context/ThemeContext.tsx]

     ✓ 1.1 Complete

     Working on 1.2: Add CSS custom properties...
     [Updates src/styles/globals.css]

     ✓ 1.2 Complete
     ...
```

**Dicas:**
- Pode retomar de onde parou se interrompido
- Use para mudanças paralelas especificando o nome da mudança
- O estado de conclusão é rastreado nos checkboxes do `tasks.md`

---

### `/opsx:verify`

Validar que a implementação corresponde aos artefatos da mudança. Verifica completude, correção e coerência.

**Sintaxe:**
```
/opsx:verify [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança verificar (inferida do contexto se não fornecida) |

**O que faz:**
- Verifica três dimensões da qualidade da implementação
- Pesquisa na base de código por evidências de implementação
- Relata problemas categorizados como CRITICAL, WARNING ou SUGGESTION
- Não bloqueia o arquivamento, mas expõe problemas

**Dimensões de verificação:**

| Dimensão | O que valida |
|-----------|-------------------|
| **Completude** | Todas as tarefas concluídas, todos os requisitos implementados, cenários cobertos |
| **Correção** | Implementação corresponde à intenção da spec, casos extremos tratados |
| **Coerência** | Decisões de design refletidas no código, padrões consistentes |

**Exemplo:**
```
You: /opsx:verify

AI:  Verifying add-dark-mode...

     COMPLETENESS
     ✓ All 8 tasks in tasks.md are checked
     ✓ All requirements in specs have corresponding code
     ⚠ Scenario "System preference detection" has no test coverage

     CORRECTNESS
     ✓ Implementation matches spec intent
     ✓ Edge cases from scenarios are handled
     ✓ Error states match spec definitions

     COHERENCE
     ✓ Design decisions reflected in code structure
     ✓ Naming conventions consistent with design.md
     ⚠ Design mentions "CSS variables" but implementation uses Tailwind classes

     SUMMARY
     ─────────────────────────────
     Critical issues: 0
     Warnings: 2
     Ready to archive: Yes (with warnings)

     Recommendations:
     1. Add test for system preference detection
     2. Update design.md to reflect Tailwind usage, or refactor to use CSS variables
```

**Dicas:**
- Execute antes de arquivar para detectar inconsistências cedo
- Avisos não bloqueiam o arquivamento, mas indicam possíveis problemas
- Bom para revisar o trabalho da IA antes de confirmar
- Pode revelar divergências entre os artefatos e a implementação

---

### `/opsx:sync`

**Comando opcional.** Mesclar delta specs de uma mudança nas specs principais. O arquivamento pedirá para sincronizar se necessário, portanto, normalmente você não precisa executar isso manualmente.

**Sintaxe:**
```
/opsx:sync [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança sincronizar (inferida do contexto se não fornecida) |

**O que faz:**
- Lê as delta specs da pasta da mudança
- Analisa as seções ADDED/MODIFIED/REMOVED/RENAMED
- Mescla as alterações no diretório principal `openspec/specs/`
- Preserva o conteúdo existente não mencionado no delta
- Não arquiva a mudança (permanece ativa)

**Exemplo:**
```text
You: /opsx:sync

AI:  Syncing add-dark-mode delta specs...

     Reading: openspec/changes/add-dark-mode/specs/ui/spec.md
     Target:  openspec/specs/ui/spec.md

     Changes to apply:
     ✓ ADDED: Theme Selection requirement (2 scenarios)
     ✓ ADDED: Accessibility requirement (1 scenario)

     Merging...
     ✓ openspec/specs/ui/spec.md updated

     Change remains active. Run /opsx:archive when ready to complete.
```

**Quando usar manualmente:**

| Cenário | Usar sync? |
|----------|-----------|
| Mudança de longa duração, quer specs no principal antes de arquivar | Sim |
| Múltiplas mudanças paralelas precisam das specs base atualizadas | Sim |
| Quer visualizar/revisar a mesclagem separadamente | Sim |
| Mudança rápida, indo direto para o arquivamento | Não (o archive cuida disso) |

**Dicas:**
- O sync é inteligente, não é cópia e cola
- Pode adicionar cenários a requisitos existentes sem duplicar
- A mudança permanece ativa após o sync (não arquivada)
- A maioria dos usuários nunca precisará chamar isso diretamente—o archive solicita se necessário

---

### `/opsx:archive`

Arquivar uma mudança concluída. Finaliza a mudança e a move para a pasta de histórico.

**Sintaxe:**
```
/opsx:archive [change-name]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-name` | Não | Qual mudança arquivar (inferida do contexto se não fornecida) |

**O que faz:**
- Verifica o status de conclusão dos artefatos
- Verifica a conclusão das tarefas (avisa se incompleta)
- Oferece sincronizar as delta specs se ainda não foram sincronizadas
- Move a pasta da mudança para `openspec/changes/archive/YYYY-MM-DD-<name>/`
- Preserva todos os artefatos para auditoria

**Exemplo:**
```text
You: /opsx:archive

AI:  Archiving add-dark-mode...

     Artifact status:
     ✓ proposal.md exists
     ✓ specs/ exists
     ✓ design.md exists
     ✓ tasks.md exists (8/8 tasks complete)

     Delta specs: Not yet synced
     → Sync now? (recommended)

You: Yes

AI:  ✓ Synced specs to openspec/specs/ui/spec.md
     ✓ Moved to openspec/changes/archive/2025-01-24-add-dark-mode/

     Change archived successfully.
```

**Dicas:**
- O archive não bloqueará em tarefas incompletas, mas avisará
- As delta specs podem ser sincronizadas durante o arquivamento ou antes
- As mudanças arquivadas são preservadas para o histórico
- Use `/opsx:verify` primeiro para detectar problemas

---

### `/opsx:bulk-archive`

Arquivar múltiplas mudanças concluídas de uma vez. Lida com conflitos de specs entre mudanças.

**Sintaxe:**
```
/opsx:bulk-archive [change-names...]
```

**Argumentos:**
| Argumento | Obrigatório | Descrição |
|----------|----------|-------------|
| `change-names` | Não | Mudanças específicas para arquivar (solicita seleção se não fornecidas) |

**O que faz:**
- Lista todas as mudanças concluídas
- Valida cada mudança antes de arquivar
- Detecta conflitos de specs entre mudanças
- Resolve conflitos verificando o que está realmente implementado
- Arquiva em ordem cronológica

**Exemplo:**
```
You: /opsx:bulk-archive

AI:  Found 3 completed changes:
     - add-dark-mode (8/8 tasks complete)
     - fix-login-bug (3/3 tasks complete)
     - update-footer (2/2 tasks complete)

     Checking for spec conflicts...
     ⚠ add-dark-mode and update-footer both touch specs/ui/

     Inspecting codebase to resolve...
     Both changes are implemented. Will merge in chronological order:
     1. add-dark-mode (created Jan 20)
     2. update-footer (created Jan 22)

     Archive all 3 changes?

You: Yes

AI:  ✓ Archived add-dark-mode
     ✓ Archived fix-login-bug
     ✓ Archived update-footer
     Specs merged: add-dark-mode → update-footer
```

**Dicas:**
- Bom para fluxos de trabalho paralelos
- A resolução de conflitos é agêntica (verifica a base de código)
- As mudanças são arquivadas na ordem de criação
- Solicita confirmação antes de sobrescrever conteúdo de spec

---

### `/opsx:onboard`

Integração guiada pelo fluxo de trabalho completo do OpenSpec. Um tutorial interativo usando sua base de código real.

**Sintaxe:**
```
/opsx:onboard
```

**O que faz:**
- Percorre um ciclo completo de fluxo de trabalho com narração
- Escaneia sua base de código em busca de oportunidades reais de melhoria
- Cria uma mudança real com artefatos reais
- Implementa trabalho real (mudanças pequenas e seguras)
- Arquiva a mudança concluída
- Explica cada passo conforme acontece

**Fases:**
1. Boas-vindas e análise da base de código
2. Encontrando uma oportunidade de melhoria
3. Criando uma mudança (`/opsx:new`)
4. Escrevendo a proposta
5. Criando specs
6. Escrevendo o design
7. Criando tarefas
8. Implementando tarefas (`/opsx:apply`)
9. Verificando a implementação
10. Arquivando a mudança
11. Resumo e próximos passos

**Exemplo:**
```
You: /opsx:onboard

AI:  Welcome to OpenSpec!

     I'll walk you through the complete workflow using your actual codebase.
     We'll find something small to improve, create a proper change for it,
     implement it, and archive it.

     Let me scan your codebase for opportunities...

     [Analyzes codebase]

     I found a few things we could work on:
     1. Add input validation to the contact form
     2. Improve error messages in the auth flow
     3. Add loading states to async buttons

     Which interests you? (or suggest something else)
```

**Dicas:**
- Melhor para novos usuários aprendendo o fluxo de trabalho
- Usa código real, não exemplos simplificados
- Cria uma mudança real que você pode manter ou descartar
- Leva de 15 a 30 minutos para concluir

---

## Sintaxe de Comando por Ferramenta de IA

Diferentes ferramentas de IA usam sintaxes de comando ligeiramente diferentes. Use o formato que corresponde à sua ferramenta:

| Ferramenta | Exemplo de Sintaxe |
|------|----------------|
| Claude Code | `/opsx:propose`, `/opsx:apply` |
| Cursor | `/opsx-propose`, `/opsx-apply` |
| Windsurf | `/opsx-propose`, `/opsx-apply` |
| Copilot (IDE) | `/opsx-propose`, `/opsx-apply` |
| Trae | Invocações baseadas em skills como `/openspec-propose`, `/openspec-apply-change` (sem arquivos de comando `opsx-*` gerados) |

A intenção é a mesma em todas as ferramentas, mas como os comandos são exibidos pode variar por integração.

> **Nota:** Os comandos do GitHub Copilot (`.github/prompts/*.prompt.md`) estão disponíveis apenas em extensões de IDE (VS Code, JetBrains, Visual Studio). O GitHub Copilot CLI atualmente não suporta arquivos de prompt personalizados — consulte [Ferramentas Suportadas](supported-tools.md) para detalhes e alternativas.

---

## Comandos Legados

Estes comandos usam o fluxo de trabalho mais antigo "tudo de uma vez". Eles ainda funcionam, mas os comandos OPSX são recomendados.

| Comando | O que faz |
|---------|--------------|
| `/openspec:proposal` | Criar todos os artefatos de uma vez (proposal, specs, design, tasks) |
| `/openspec:apply` | Implementar a mudança |
| `/openspec:archive` | Arquivar a mudança |

**Quando usar comandos legados:**
- Projetos existentes usando o fluxo de trabalho antigo
- Mudanças simples onde você não precisa de criação incremental de artefatos
- Preferência pela abordagem tudo ou nada

**Migrando para o OPSX:**
Mudanças legadas podem ser continuadas com comandos OPSX. A estrutura de artefatos é compatível.

---

## Solução de Problemas

### "Change not found"

O comando não conseguiu identificar em qual mudança trabalhar.

**Soluções:**
- Especifique o nome da mudança explicitamente: `/opsx:apply add-dark-mode`
- Verifique se a pasta da mudança existe: `openspec list`
- Verifique se você está no diretório correto do projeto

### "No artifacts ready"

Todos os artefatos estão completos ou bloqueados por dependências ausentes.

**Soluções:**
- Execute `openspec status --change <name>` para ver o que está bloqueando
- Verifique se os artefatos necessários existem
- Crie primeiro os artefatos de dependência ausentes

### "Schema not found"

O schema especificado não existe.

**Soluções:**
- Liste os schemas disponíveis: `openspec schemas`
- Verifique a ortografia do nome do schema
- Crie o schema se for personalizado: `openspec schema init <name>`

### Comandos não reconhecidos

A ferramenta de IA não reconhece os comandos do OpenSpec.

**Soluções:**
- Certifique-se de que o OpenSpec está inicializado: `openspec init`
- Regenere as skills: `openspec update`
- Verifique se o diretório `.claude/skills/` existe (para Claude Code)
- Reinicie sua ferramenta de IA para carregar as novas skills

### Artefatos não sendo gerados corretamente

A IA cria artefatos incompletos ou incorretos.

**Soluções:**
- Adicione contexto do projeto em `openspec/config.yaml`
- Adicione regras por artefato para orientações específicas
- Forneça mais detalhes na descrição da mudança
- Use `/opsx:continue` em vez de `/opsx:ff` para mais controle

---

## Próximos Passos

- [Workflows](workflows.md) - Padrões comuns e quando usar cada comando
- [CLI](cli.md) - Comandos de terminal para gerenciamento e validação
- [Customização](customization.md) - Criar schemas e workflows personalizados
