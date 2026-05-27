/**
 * Trello Setup Skill / Command Template
 *
 * Guides the user through configuring Trello integration for their
 * pastelsdd workflow. Creates `pastelsdd/trello.yaml` with the board
 * and list IDs derived from an existing board or a newly created one.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getTrelloSetupSkillTemplate(): SkillTemplate {
  return {
    name: 'pastelsdd-trello-setup',
    description:
      'Configure Trello integration for your Pastelsdd workflow. Checks MCP availability, reads or creates a Trello board, and writes pastelsdd/trello.yaml with your stage-to-list mapping.',
    instructions: getTrelloSetupInstructions(),
    license: 'MIT',
    compatibility: 'Requires pastelsdd CLI and the Trello MCP server.',
    metadata: { author: 'pastelsdd', version: '1.0' },
  };
}

function getTrelloSetupInstructions(): string {
  return `Configure Trello integration for your Pastelsdd workflow.

This skill writes \`pastelsdd/trello.yaml\` — a small config file that all Trello-aware commands
(\`/pastel:task\`, \`/pastel:draft\`, \`/pastel:propose\`, \`/pastel:apply\`, \`/pastel:archive\`) read at
runtime to know which Trello list corresponds to each workflow stage.

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
> Then restart Claude Code and re-run \`/pastel:trello-setup\`.

Stop here if MCP is unavailable.

---

## Step 2 — Read existing config

Use the **Read tool** (NOT a shell command) to read \`pastelsdd/trello.yaml\` from the current working directory.
The Read tool is cross-platform and works on Windows, macOS, and Linux — never use \`cat\` or shell commands to read this file.
If the Read tool returns an error (file not found), treat it as state C (no config).

Parse the file content. Three possible states:

### A) \`configured: true\` — already fully configured
Display the current configuration and ask: "Reconfigurar a integração Trello?" (Sim / Não).
If "Não", stop here.

### B) \`configured: false\` — partial config saved by \`pastelsdd init\`

This means the user already answered the preference questions in the CLI.
Extract the following fields:
- \`hasExistingBoard\` → bool
- \`boardId\` → string (only if hasExistingBoard = true)
- \`stages\` → array of selected stage keys
- \`stageNames\` → map of stage key → display name

Display:
\`\`\`
## Continuando configuração do Trello

Detectei preferências salvas durante o \`pastelsdd init\`:

  Quadro existente: <Sim/Não>
  \${hasExistingBoard ? 'Board ID: <boardId>' : 'Criar novo quadro'}
  Estágios selecionados: <stage1>, <stage2>, ...

  ✓ Pulando perguntas já respondidas — indo direto para conexão das listas.
\`\`\`

Skip Steps 3A/3B and go directly to **Step 3C** (connect lists for existing board)
or **Step 3D** (create board for new board).

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
| draft      | 🧠 Para Explorar        |
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

---

## Step 3C — Connect lists for existing board

**(Used when \`hasExistingBoard: true\`, whether from CLI init or this step)**

1. Fetch the lists of the board:
   \`\`\`tool
   mcp__claude_ai_Trello_Custom__get_lists  { board_id: "<boardId>" }
   \`\`\`

2. For each selected stage, use **AskUserQuestion** to let the user match a Trello list.
   Show the lists returned above. Group the questions:
   - Group 1 (discovery): draft, backlog, refining
   - Group 2 (execution): ready, developing, testing
   - Group 3 (closure): deploy, done, cancelled

   For stages the user doesn't want to map, let them choose "Não usar este estágio".

---

## Step 3D — Create new board

**(Used when \`hasExistingBoard: false\`)**

1. Use **AskUserQuestion** to ask for a board name
   (default: "Pastelsdd — <project-name inferred from directory>").

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

## Step 4 — Write final configuration

Assemble and write \`pastelsdd/trello.yaml\` with \`configured: true\`:

\`\`\`yaml
configured: true
boardId: "<boardId>"
boardName: "<boardName>"
lists:
  <stage>:
    id: "<id>"
    name: "<name>"
  # only the stages that were mapped
\`\`\`

Write it:

\`\`\`bash
cat > pastelsdd/trello.yaml << 'YAML'
configured: true
boardId: "<boardId>"
boardName: "<boardName>"
lists:
  backlog:
    id: "<id>"
    name: "<name>"
  done:
    id: "<id>"
    name: "<name>"
  # ...
YAML
\`\`\`

---

## Step 5 — Confirm and summarize

\`\`\`
## ✅ Trello configurado com sucesso!

**Board:** <boardName>
**Arquivo:** pastelsdd/trello.yaml

**Estágios configurados:**
  🧠 draft       → <name>
  📋 backlog     → <name>
  ...

A partir de agora, todos os comandos Pastelsdd irão sincronizar cards automaticamente.

**Próximos passos:**
  /pastel:task     → Adicionar tarefa ao Backlog
  /pastel:draft    → Registrar uma ideia em Para Explorar
  /pastel:propose  → Propor uma change (cria card no Trello)
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
`;
}

export function getTrelloSetupCommandTemplate(): CommandTemplate {
  return {
    name: 'Pastel: Trello Setup',
    description: 'Configure Trello integration for your Pastelsdd workflow — checks MCP, reads or creates a board, and writes pastelsdd/trello.yaml',
    category: 'Setup',
    tags: ['trello', 'setup', 'integration', 'config'],
    content: getTrelloSetupInstructions(),
  };
}
