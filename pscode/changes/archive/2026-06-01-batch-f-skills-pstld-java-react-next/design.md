## Context

O profile `dixi` do pscode instala um conjunto de artefatos no projeto do cliente via `pscode init --profile dixi`. O Batch E criou slash commands (`/pstld:*`) que requerem invocação explícita. Este Batch F cria as **skills auto-invocadas** — arquivos Markdown colocados em `.claude/skills/` que o Claude Code lê e aplica automaticamente baseado em triggers contextuais (edição de arquivo, texto no prompt, padrão de chave).

Três skills serão criadas como arquivos Markdown em `pscode/content/dixi/claude-runtime/skills/` e instaladas em `.claude/skills/pstld-*/` pelo `installDixiExtras` (Batch B). Cada skill detecta a stack do projeto em runtime via `.pscode-dixi.yaml` para adaptar seu comportamento.

## Goals / Non-Goals

**Goals:**
- Criar 3 arquivos de skill Markdown com triggers, lógica por stack e referências a `pastelsdd/context/`
- Garantir que as skills sejam agnósticas de stack no arquivo, mas adaptem o comportamento em runtime
- Manter compatibilidade com projetos que não usam o profile dixi (sem `.pscode-dixi.yaml` → sem ação)

**Non-Goals:**
- Implementar a lógica de instalação em `installDixiExtras` (responsabilidade do Batch B)
- Criar os arquivos de referência `pastelsdd/context/architecture.md` (Batch C)
- Criar `pastelsdd/jira.yaml` (Batch J)
- Alterar `profiles.ts` ou `ALL_WORKFLOWS`

## Decisions

### D1 — Skills como arquivos Markdown com seções de trigger e comportamento por stack

As skills são escritas como arquivos Markdown estruturados que o Claude Code interpreta. A detecção de stack via `.pscode-dixi.yaml` é feita dentro do corpo da skill (instrução para o modelo ler o arquivo), não em lógica de instalação — isso permite um único arquivo de skill que funciona em qualquer projeto Dixi.

**Alternativa considerada**: criar variantes separadas por stack (ex: `pstld-arch-guardian-java.md` e `pstld-arch-guardian-react.md`). Rejeitada porque duplicaria manutenção e a detecção em runtime é mais robusta.

### D2 — pstld-arch-guardian como verificação antes de editar (pré-ação)

A skill `pstld-arch-guardian` é descrita como verificação **antes** de aplicar a edição — ela instrui o Claude Code a checar a violação antes de escrever o arquivo. Se detectar violação em Java (import direto de `domain/` em `infrastructure/`), bloqueia com explicação. Se detectar violação em React (import cruzado entre features), bloqueia. Lógica de negócio em páginas React gera warning, não bloqueio.

**Alternativa considerada**: usar hook `PreToolUse` (Batch G) em vez de skill. A skill é a abordagem do Batch F; hooks são a camada de runtime do Batch G. Ambas coexistem com garantias diferentes (skill = instrução ao modelo; hook = execução de processo garantida).

### D3 — pstld-commit-crafter pergunta o ticket se não souber

Em vez de montar a mensagem sem ticket (perda de rastreabilidade) ou falhar silenciosamente, a skill DEVE perguntar o número do ticket ao usuário quando `project_key` está configurado mas o ticket não foi mencionado. Isso preserva o contrato de rastreabilidade sem bloquear o fluxo.

### D4 — pstld-jira-context avisa uma vez sobre configuração ausente

Para evitar spam de mensagens em projetos sem integração JIRA, a skill menciona a ausência de configuração apenas uma vez por sessão e prossegue. Isso equilibra visibilidade (desenvolvedor novo entende que há integração disponível) com ergonomia (não polui cada prompt).

## Risks / Trade-offs

- **[Risco] Skills dependem da interpretação do modelo** — diferente de hooks (Batch G), skills são instruções em linguagem natural. O modelo pode não seguir o trigger com 100% de fidelidade em todos os casos. → Mitigação: os hooks do Batch G fornecem a camada de garantia absoluta; as skills são a primeira linha de verificação.
- **[Risco] `.pscode-dixi.yaml` pode não existir em projetos brownfield** — a skill não sabe a stack e não age. → Mitigação: comportamento seguro (sem ação) quando o arquivo está ausente; documentar que o arquivo é pré-requisito.
- **[Trade-off] Skill única vs. variantes por stack** — uma skill detecta a stack em runtime (menor número de arquivos, mais complexidade no corpo); variantes por stack seriam mais simples de ler mas duplicariam conteúdo. Escolhida abordagem de skill única com detecção em runtime.

## Migration Plan

1. Criar os 3 arquivos em `pscode/content/dixi/claude-runtime/skills/`
2. Verificar manualmente que o conteúdo de cada skill está correto (trigger, lógica Java, lógica React, referências a `pastelsdd/`)
3. Confirmar que `installDixiExtras` (Batch B) já cobre a cópia para `.claude/skills/` — se não, registrar como dependência pendente do Batch B
4. Changeset: minor

## Open Questions

- O formato exato de `.claude/skills/` aceita subdiretórios (`pstld-arch-guardian/`) ou apenas arquivos planos (`pstld-arch-guardian.md`)? Verificar convenção do Claude Code.
- A skill `pstld-jira-context` deve reutilizar o mesmo MCP `mcp__atlassian__getJiraIssue` usado pelo slash command `/pstld:jira-sync` (Batch E) ou há um método preferencial diferente?
