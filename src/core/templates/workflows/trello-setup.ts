/**
 * Trello Setup Skill / Command Template
 *
 * Guides the user through configuring Trello integration for their
 * pscode workflow. Creates `pscode/trello.yaml` with the board
 * and list IDs derived from an existing board or a newly created one.
 * Also handles optional label/etiqueta creation on the board.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getTrelloSetupSkillTemplate(): SkillTemplate {
  return {
    name: 'pscode-trello-setup',
    description:
      'Configure Trello integration for your Pscode workflow. Checks MCP availability, reads or creates a Trello board, and writes pscode/trello.yaml with your stage-to-list mapping.',
    instructions: getTrelloSetupInstructions(),
    license: 'MIT',
    compatibility: 'Requires pscode CLI and the Trello MCP server.',
    metadata: { author: 'pscode', version: '1.0' },
  };
}

function getTrelloSetupInstructions(): string {
  return `Configure Trello integration for your Pscode workflow.

This skill writes \`pscode/trello.yaml\` — a small config file that all Trello-aware commands
(\`/ps:task\`, \`/ps:draft\`, \`/ps:propose\`, \`/ps:apply\`, \`/ps:archive\`) read at
runtime to know which Trello list corresponds to each workflow stage and which labels are available.

---

## Step 1 — Check MCP availability

Try to identify the current Trello user:

\`\`\`tool
mcp__claude_ai_Trello_Custom__get_me
\`\`\`

**If this call fails or returns an error:**
> ⚠️ The Trello MCP server is not available in this session.
>
> To enable it, add the Trello MCP server to your Claude Code configuration:
> \`\`\`
> claude mcp add trello <server-url>
> \`\`\`
> Then restart Claude Code and re-run \`/ps:trello-setup\`.

Stop here if MCP is unavailable.

---

## Step 2 — Read existing config

Use the **Read tool** (NOT a shell command) to read \`pscode/trello.yaml\` from the current working directory.
The Read tool is cross-platform and works on Windows, macOS, and Linux — never use \`cat\` or shell commands to read this file.
If the Read tool returns an error (file not found), treat it as state C (no config).

Parse the file content. Three possible states:

### A) \`configured: true\` — already fully configured
Display the current configuration and ask: "Reconfigurar a integração Trello?" (Sim / Não).
If "Não", stop here.

### B) \`configured: false\` — partial config saved by \`pscode init\`

This means the user already answered the preference questions in the CLI.
Extract the following fields:
- \`hasExistingBoard\` → bool
- \`boardId\` → string (only if hasExistingBoard = true)
- \`stages\` → array of selected stage keys
- \`stageNames\` → map of stage key → display name
- \`labels\` → \`{ enabled: bool, selected?: string[] }\`

Display:
\`\`\`
## Continuando configuração do Trello

Detectei preferências salvas durante o \`pscode init\`:

  Quadro existente: <Sim/Não>
  \${hasExistingBoard ? 'Board ID: <boardId>' : 'Criar novo quadro'}
  Estágios selecionados: <stage1>, <stage2>, ...
  Labels: \${labels?.enabled ? (labels.selected ?? ['bug','implementacao','melhoria','debito-tecnico']).join(', ') : 'desativadas'}

  ✓ Pulando perguntas já respondidas — indo direto para conexão das listas.
\`\`\`

Skip Steps 3A/3B and go directly to **Step 3C** (connect lists for existing board)
or **Step 3D** (create board for new board).
Then proceed to **Step 3E** (create labels) if \`labels.enabled = true\`.

### C) "NO_CONFIG" — fresh setup, no preferences saved yet

Proceed to Step 3 normally (full interactive flow).

---

## Step 3 — Select or create board

**(Skip this step if partial config was found in Step 2B)**

Use **AskUserQuestion** to ask:

> "Você já tem um quadro Trello configurado com as colunas do seu fluxo?"
> - Sim, já tenho um quadro
> - Não, quero criar um novo quadro

Then ask which columns the user wants using **AskUserQuestion** with \`multiSelect: true\`:

| Estágio    | Coluna sugerida        |
|------------|------------------------|
| backlog ✱  | 📋 Backlog              |
| refining   | 🔍 Em Refinamento       |
| ready      | ✅ Ready to Dev         |
| developing | 🚧 Em Desenvolvimento   |
| testing    | 🧪 Em Teste             |
| deploy     | 🚀 Ready to Deploy      |
| done ✱     | ✅ Concluído            |
| cancelled  | ❌ Cancelado            |

*(✱ = obrigatório)*

At minimum, require **backlog** and **done**.

Optionally ask for custom column names.

Then ask about labels using **AskUserQuestion**:
> "Deseja usar labels/etiquetas para categorizar os cards automaticamente?"
> - Sim — o agente analisa o contexto e aplica a label correta (BUG, IMPLEMENTAÇÃO, MELHORIA, DÉBITO TÉCNICO)
> - Não — sem labels

If "Sim", ask which labels to enable (multiSelect):
- 🐛 BUG — Erro ou comportamento incorreto
- ⚙️ IMPLEMENTAÇÃO — Nova funcionalidade desenvolvida do zero
- ✨ MELHORIA — Aperfeiçoamento ou otimização de algo existente
- 💳 DÉBITO TÉCNICO — Refatoração, limpeza de código ou resolução de dívida técnica

Save the chosen label keys as \`labelsToCreate\` (defaults: all four if none unchecked).

---

## Step 3C — Connect lists for existing board

**(Used when \`hasExistingBoard: true\`, whether from CLI init or this step)**

1. Fetch the lists of the board:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__get_lists  { board_id: "<boardId>" }
   \`\`\`

2. For each selected stage, use **AskUserQuestion** to let the user match a Trello list.
   Show the lists returned above. Group the questions:
   - Group 1 (discovery): backlog, refining
   - Group 2 (execution): ready, developing, testing
   - Group 3 (closure): deploy, done, cancelled

   For stages the user doesn't want to map, let them choose "Não usar este estágio".

---

## Step 3D — Create new board

**(Used when \`hasExistingBoard: false\`)**

1. Use **AskUserQuestion** to ask for a board name
   (default: "Pscode — <project-name inferred from directory>").

2. Create the Trello board:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__create_board  { name: "<boardName>" }
   \`\`\`
   Save \`board.id\` as \`boardId\`.

3. Fetch the auto-created lists and archive them:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__get_lists  { board_id: "<boardId>" }
   \`\`\`
   For each auto-created list:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__archive_list  { list_id: "<id>" }
   \`\`\`

4. Create the workflow lists in order (one \`create_list\` call per selected stage):
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__create_list  { board_id: "<boardId>", name: "<stageName>", pos: "bottom" }
   \`\`\`
   Save each returned \`id\` mapped to its stage key.

---

## Step 3E — Create labels on the board

**(Run after Step 3C or 3D, only if labels are enabled)**

The canonical label definitions are:

| Chave           | Nome            | Cor    |
|-----------------|-----------------|--------|
| bug             | BUG             | red    |
| implementacao   | IMPLEMENTAÇÃO   | blue   |
| melhoria        | MELHORIA        | green  |
| debito-tecnico  | DÉBITO TÉCNICO  | orange |

**For each label key in \`labelsToCreate\`:**

1. First, check existing labels on the board to avoid duplicates:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__get_board_labels  { board_id: "<boardId>" }
   \`\`\`

2. For each label key that does NOT already exist (match by name, case-insensitive):
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__create_label  { board_id: "<boardId>", name: "<name>", color: "<color>" }
   \`\`\`

3. Collect and save each label: \`{ id: "<returnedId>", name: "<name>", color: "<color>" }\`
   If the label already existed, use its existing \`id\` and \`color\`.

If any \`create_label\` call fails, log the error and continue — labels are auxiliary, never blocking.

---

## Step 4 — Write final configuration

Assemble and write \`pscode/trello.yaml\` with \`configured: true\`.

Use the **Write tool** (NOT a shell command) to write the file — it is cross-platform and works on Windows, macOS, and Linux.

**Full YAML structure when labels are enabled:**

\`\`\`yaml
configured: true
boardId: "<boardId>"
boardName: "<boardName>"
lists:
  backlog:
    id: "<id>"
    name: "<name>"
  # ... only the stages that were mapped
labels:
  enabled: true
  items:
    bug:
      id: "<labelId>"
      name: "BUG"
      color: "red"
    implementacao:
      id: "<labelId>"
      name: "IMPLEMENTAÇÃO"
      color: "blue"
    melhoria:
      id: "<labelId>"
      name: "MELHORIA"
      color: "green"
    debito-tecnico:
      id: "<labelId>"
      name: "DÉBITO TÉCNICO"
      color: "orange"
\`\`\`

**When labels are disabled:**

\`\`\`yaml
configured: true
boardId: "<boardId>"
boardName: "<boardName>"
lists:
  # ...
labels:
  enabled: false
\`\`\`

---

## Step 5 — Confirm and summarize

\`\`\`
## ✅ Trello configurado com sucesso!

**Board:** <boardName>
**Arquivo:** pscode/trello.yaml

**Estágios configurados:**
  📋 backlog     → <name>
  ...

**Labels configuradas:**          ← apenas se labels.enabled = true
  🐛 BUG
  ⚙️  IMPLEMENTAÇÃO
  ✨ MELHORIA
  💳 DÉBITO TÉCNICO

A partir de agora, todos os comandos Pscode irão sincronizar cards automaticamente.
O agente irá tentar categorizar cada card com a label adequada ao criá-lo.

**Próximos passos:**
  /ps:draft    → Registrar uma ideia no Backlog (frictionless)
  /ps:task     → Adicionar tarefa ao Backlog
  /ps:propose  → Propor uma change (cria card no Trello)
\`\`\`

---

## Guardrails

- **Nunca prosseguir sem MCP** — se o Trello MCP não estiver disponível, parar e orientar
- **Backlog e done são obrigatórios** — não permitir configuração sem esses dois estágios
- **Nunca deletar cards ou listas existentes** — ao criar board, apenas arquivar as listas padrão
- **Se partial config encontrada** (\`configured: false\`), pular as perguntas já respondidas e mencionar isso ao usuário
- **Todos os nomes em português** por padrão, respeitando o que o usuário escolheu no init
- **Se qualquer chamada MCP falhar**, exibir o erro e perguntar se deseja tentar novamente
- **Não sobrescrever config \`configured: true\` sem confirmação explícita**
- **Labels são opcionais** — se criação de label falhar, continuar normalmente sem labels
- **Não duplicar labels** — verificar labels existentes no board antes de criar novas
`;
}

export function getTrelloSetupCommandTemplate(): CommandTemplate {
  return {
    name: 'PS: Trello Setup',
    description: 'Configure Trello integration for your Pscode workflow — checks MCP, reads or creates a board, and writes pscode/trello.yaml',
    category: 'Setup',
    tags: ['trello', 'setup', 'integration', 'config'],
    content: getTrelloSetupInstructions(),
  };
}
