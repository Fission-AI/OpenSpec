/**
 * Trello Draft Skill / Command Template
 *
 * Quickly captures an idea, insight, or rough concept into the Backlog
 * Trello list. No refinement required — this is for raw thoughts.
 *
 * Requires `pastelsdd/trello.yaml` to be present (created by /pstl:trello-setup).
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getTrelloDraftSkillTemplate(): SkillTemplate {
  return {
    name: 'pastelsdd-trello-draft',
    description:
      'Capture a raw idea or concept into the Backlog Trello list. Use when the user wants to quickly record something without refining it into a task yet.',
    instructions: getTrelloDraftInstructions(),
    license: 'MIT',
    compatibility: 'Requires pastelsdd CLI and Trello MCP server configured via /pstl:trello-setup.',
    metadata: { author: 'pastelsdd', version: '1.0' },
  };
}

function getTrelloDraftInstructions(): string {
  return `Capture uma ideia ou conceito bruto diretamente no Backlog do Trello.

**Input**: Texto após \`/pstl:draft\` é a descrição da ideia (pode ser bem rascunho — palavras soltas, fragmentos, intuições vagas).
Se omitido, perguntar ao usuário.

Este comando é intencionalmente sem atrito. Diferente de \`/pstl:task\`, faz estruturação mínima — o objetivo é velocidade de captura, não clareza.

---

## Step 1 — Read Trello config

Use the **Read tool** (NOT a shell command) to read \`pastelsdd/trello.yaml\` from the current working directory.
The Read tool is cross-platform and works on Windows, macOS, and Linux — never use \`cat\` or shell commands to read this file.
If the Read tool returns an error (file not found), treat it as "NO_TRELLO_CONFIG".

**If file not found:**
> ⚠️ Trello não está configurado neste projeto.
> Execute \`/pstl:trello-setup\` para configurar a integração antes de usar este comando.

Stop here if no config.

Parse the YAML and extract:
- \`boardId\`
- \`lists.backlog.id\` → the list where the card will be created
- \`lists.backlog.name\` → for display purposes
- \`labels\` → \`{ enabled: bool, items?: { bug, implementacao, melhoria, debito-tecnico } }\`

**If \`lists.backlog\` is not configured:**
> ⚠️ Estágio "backlog" não está configurado em \`pastelsdd/trello.yaml\`.
>
> Execute \`/pstl:trello-setup\` para configurar a integração.

Stop here if backlog list is missing.

---

## Step 2 — Collect the idea

If the user provided text, use it as-is.

If nothing was provided, use **AskUserQuestion** to ask:
> "Qual ideia você quer registrar? (pode ser bem rascunho mesmo)"

---

## Step 3 — Minimal structuring

Apply only light formatting. Do NOT over-engineer — this is a draft.

Produce:

**a. \`title\`** — The idea in up to ~80 chars, starting with a noun or verb.
  - Keep the user's original wording as much as possible
  - **No emojis** in the title

**b. \`context\`** (optional, 1–2 sentences max) — Only add if there's obvious project context to attach.
  If the idea is self-contained or opaque, leave blank.

---

## Step 4 — Detect label (if labels enabled)

**Only run this step if \`labels.enabled = true\` and \`labels.items\` is present in config.**

Analyze the idea text and title to determine which label best fits.
Use these classification rules:

| Label           | Quando usar                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| 🐛 BUG          | Menciona erro, falha, bug, quebrado, não funciona, comportamento errado      |
| ⚙️ IMPLEMENTAÇÃO | Nova feature, adicionar, criar, implementar algo que não existe ainda        |
| ✨ MELHORIA      | Melhorar, otimizar, refinar, aprimorar algo que já existe                   |
| 💳 DÉBITO TÉCNICO | Refatorar, limpar, reorganizar, remover código legado, dívida técnica       |

**Decision logic:**

1. If the idea clearly matches one label with high confidence (>80%) → use it silently, without asking.
2. If the idea is ambiguous or could fit 2+ labels → use **AskUserQuestion** to ask:
   > "Que tipo de card é esse?"
   > - 🐛 BUG — Erro ou comportamento incorreto
   > - ⚙️ IMPLEMENTAÇÃO — Nova funcionalidade
   > - ✨ MELHORIA — Aperfeiçoamento de algo existente
   > - 💳 DÉBITO TÉCNICO — Refatoração e limpeza de código
   > - Sem label — Não categorizar

3. If the label key chosen is not in \`labels.items\` (user may have configured a subset), skip labeling.

Save the resolved label as \`chosenLabel\` (or \`null\` if no label applies or user chose "Sem label").

---

## Step 5 — Assemble the card description

**No emojis anywhere in the description.**

If context is present:
\`\`\`
<context>

---
Ideia original: "<raw input verbatim>"

Proximo passo: /pstl:propose para refinar e gerar os artefatos da change.
\`\`\`

If no context:
\`\`\`
Ideia original: "<raw input verbatim>"

Proximo passo: /pstl:propose para refinar e gerar os artefatos da change.
\`\`\`

---

## Step 6 — Create the card

\`\`\`tool
mcp__claude_ai_Trello_Custom__create_card
  list_id: "<lists.backlog.id>"
  name: "<title>"
  desc: "<assembled description>"
\`\`\`

**Do NOT assign any member.**

Save the returned card \`id\` as \`cardId\` and \`url\` as \`cardUrl\`.

---

## Step 7 — Apply label (if resolved)

**Only if \`chosenLabel\` is not null:**

\`\`\`tool
mcp__claude_ai_Trello_Custom__add_label_to_card
  card_id: "<cardId>"
  label_id: "<chosenLabel.id>"
\`\`\`

If this call fails, log the error and continue — label is auxiliary, never blocking.

---

## Step 8 — Show summary

\`\`\`
## Ideia registrada ✓

**Título:** <title>
**Lista:** <lists.backlog.name>
**Label:** <chosenLabel emoji + name> (ou "sem label" se não aplicada)
**Card:** <cardUrl>

Sem responsável atribuído.
Quando quiser refinar: \`/pstl:explore\` ou \`/pstl:task\`
Quando quiser propor diretamente: \`/pstl:propose\`
\`\`\`

---

## Guardrails

- **Mínima intervenção** — o valor deste comando é a velocidade de captura; não refinar demais
- **Preservar o texto original** verbatim na descrição
- **Nunca atribuir membro** — cards de draft são sempre sem dono
- **Nunca criar change** (\`pastelsdd new change\`) — este comando é apenas Trello
- **Se MCP falhar**, exibir o conteúdo no chat para registro manual
- **Título em português** por padrão, mas se o usuário escreveu em inglês, manter em inglês
- **Labels são opcionais** — se \`labels.enabled = false\` ou o call MCP falhar, continuar sem label
- **Perguntar sobre label apenas quando ambíguo** — para ideias claras, classificar silenciosamente
`;
}

export function getTrelloDraftCommandTemplate(): CommandTemplate {
  return {
    name: 'Pastel: Draft',
    description: 'Capture a raw idea or concept into the Backlog Trello list — frictionless, no refinement required',
    category: 'Workflow',
    tags: ['trello', 'draft', 'ideias', 'backlog', 'workflow'],
    content: getTrelloDraftInstructions(),
  };
}
