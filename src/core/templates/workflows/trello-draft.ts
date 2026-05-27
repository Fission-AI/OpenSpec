/**
 * Trello Draft Skill / Command Template
 *
 * Quickly captures an idea, insight, or rough concept into the "Para Explorar"
 * Trello list. No refinement required — this is for raw thoughts.
 *
 * Requires `pastelsdd/trello.yaml` to be present (created by /pastel:trello-setup).
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getTrelloDraftSkillTemplate(): SkillTemplate {
  return {
    name: 'pastelsdd-trello-draft',
    description:
      'Capture a raw idea or concept into the "Para Explorar" Trello list. Use when the user wants to quickly record something without refining it into a backlog task yet.',
    instructions: getTrelloDraftInstructions(),
    license: 'MIT',
    compatibility: 'Requires pastelsdd CLI and Trello MCP server configured via /pastel:trello-setup.',
    metadata: { author: 'pastelsdd', version: '1.0' },
  };
}

function getTrelloDraftInstructions(): string {
  return `Capture a raw idea or concept into the "Para Explorar" Trello list.

**Input**: Text after \`/pastel:draft\` is the idea description (can be ultra-rough — single words, fragments, vague intuitions).
If omitted, prompt the user.

This command is intentionally frictionless. Unlike \`/pastel:task\`, it does minimal structuring — the goal is speed of capture, not clarity.

---

## Step 1 — Read Trello config

Use the **Read tool** (NOT a shell command) to read \`pastelsdd/trello.yaml\` from the current working directory.
The Read tool is cross-platform and works on Windows, macOS, and Linux — never use \`cat\` or shell commands to read this file.
If the Read tool returns an error (file not found), treat it as "NO_TRELLO_CONFIG".

**If file not found:**
> ⚠️ Trello não está configurado neste projeto.
> Execute \`/pastel:trello-setup\` para configurar a integração antes de usar este comando.

Stop here if no config.

Parse the YAML and extract:
- \`boardId\`
- \`lists.draft.id\` → the list where the card will be created
- \`lists.draft.name\` → for display purposes

**If \`lists.draft\` is not configured:**
> ⚠️ Estágio "draft" (Para Explorar) não está configurado em \`pastelsdd/trello.yaml\`.
>
> Alternativa: use \`/pastel:task\` para adicionar diretamente ao Backlog,
> ou execute \`/pastel:trello-setup\` para adicionar o estágio "Para Explorar".

Stop here if draft list is missing.

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

## Step 4 — Assemble the card description

**No emojis anywhere in the description.**

If context is present:
\`\`\`
<context>

---
Ideia original: "<raw input verbatim>"

Proximo passo: /pastel:propose para refinar e gerar os artefatos da change.
\`\`\`

If no context:
\`\`\`
Ideia original: "<raw input verbatim>"

Proximo passo: /pastel:propose para refinar e gerar os artefatos da change.
\`\`\`

---

## Step 5 — Create the card

\`\`\`tool
mcp__claude_ai_Trello_Custom__create_card
  list_id: "<lists.draft.id>"
  name: "<title>"
  desc: "<assembled description>"
\`\`\`

**Do NOT assign any member.**

Save the returned \`url\` as \`cardUrl\`.

---

## Step 6 — Show summary

\`\`\`
## Ideia registrada ✓

**Título:** <title>
**Lista:** <lists.draft.name>
**Card:** <cardUrl>

Sem responsável atribuído.
Quando quiser refinar: \`/pastel:explore\` ou \`/pastel:task\`
Quando quiser propor diretamente: \`/pastel:propose\`
\`\`\`

---

## Guardrails

- **Mínima intervenção** — o valor deste comando é a velocidade de captura; não refinar demais
- **Preservar o texto original** verbatim na descrição
- **Nunca atribuir membro** — cards de draft são sempre sem dono
- **Nunca criar change** (\`pastelsdd new change\`) — este comando é apenas Trello
- **Se MCP falhar**, exibir o conteúdo no chat para registro manual
- **Título em português** por padrão, mas se o usuário escreveu em inglês, manter em inglês
`;
}

export function getTrelloDraftCommandTemplate(): CommandTemplate {
  return {
    name: 'Pastel: Draft',
    description: 'Capture a raw idea or concept into the "Para Explorar" Trello list — frictionless, no refinement required',
    category: 'Workflow',
    tags: ['trello', 'draft', 'ideias', 'explorar', 'workflow'],
    content: getTrelloDraftInstructions(),
  };
}
