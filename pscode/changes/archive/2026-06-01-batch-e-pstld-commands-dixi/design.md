## Context

O pscode instala artefatos de runtime do Claude Code (CLAUDE.md, context docs) via `installDixiExtras` no módulo `src/core/presets/dixi.ts`, estabelecido no Batch B. Os slash commands do Claude Code são arquivos markdown em `.claude/commands/<namespace>/` — o Claude Code os lê e os expõe como `/namespace:comando`. Neste batch criamos o conteúdo dos 5 comandos `/pstld:*` e expandimos `installDixiExtras` para copiá-los.

Os comandos são agnósticos de stack na definição mas instruem o Claude Code a ler `.pscode-dixi.yaml` em runtime para adaptar o output. Isso segue o mesmo padrão dos context docs (Batch C): o conteúdo é fixo, a adaptação é dinâmica.

## Goals / Non-Goals

**Goals:**
- Criar 5 arquivos markdown em `pscode/content/dixi/claude-runtime/commands/` com prompts estruturados para cada comando `/pstld:*`
- Expandir `installDixiExtras` para copiar esses arquivos para `.claude/commands/pstld/` no projeto cliente
- Garantir que a cópia seja idempotente e funcione em qualquer stack
- Adicionar testes verificando que os 5 arquivos são copiados

**Non-Goals:**
- Implementar lógica TypeScript dentro dos comandos — são prompts markdown, não código
- Adaptar o conteúdo dos comandos por stack na instalação — a adaptação é runtime via `.pscode-dixi.yaml`
- Criar skills ou hooks (Batches F e G)
- Instalar o MCP Atlassian (Batch J)

## Decisions

### 1. Localização dos arquivos fonte em `pscode/content/dixi/claude-runtime/commands/`
**Decisão**: os arquivos markdown de comando ficam em `pscode/content/dixi/claude-runtime/commands/` dentro do repositório do pscode, seguindo a convenção já adotada pelo Batch C para context docs (`pscode/content/dixi/context/`).
**Rationale**: `content/dixi/` agrupa todo o conteúdo instalável pelo profile dixi. A subpasta `claude-runtime/commands/` é paralela a `claude-runtime/skills/` (Batch F) e `claude-runtime/hooks/` (Batch G), criando uma hierarquia previsível.
**Alternativa descartada**: `pscode/content/dixi/commands/` (sem `claude-runtime/`) — não deixa claro que são artefatos específicos do runtime do Claude Code, dificultando navegação futura.

### 2. Namespace `.claude/commands/pstld/` no projeto cliente
**Decisão**: os comandos são instalados em `.claude/commands/pstld/`, expondo-os como `/pstld:rfc`, `/pstld:arch-check`, etc.
**Rationale**: o namespace `pstld` é o identificador visual da Dixi no Claude Code — coerente com o schema `pstld-workflow` (Batch A) e os nomes das skills (Batch F). Isolar em subpasta evita colisão com comandos locais do projeto.
**Alternativa descartada**: `.claude/commands/dixi/` — menos coerente com a convenção `/pstld:*` já estabelecida nos outros batches.

### 3. Conteúdo dos comandos: prompts estruturados sem lógica condicional inline
**Decisão**: cada arquivo markdown instrui o Claude Code com uma sequência de passos clara, referenciando `pastelsdd/context/` para detalhes. A adaptação por stack é delegada ao Claude em runtime via leitura de `.pscode-dixi.yaml`.
**Rationale**: manter os arquivos simples e legíveis facilita manutenção futura. O Claude Code lê o arquivo inteiro como instrução — lógica condicional complexa inline seria frágil. Referenciar os context docs já instalados (Batch C) evita duplicação.
**Alternativa descartada**: gerar dois arquivos por comando (um para Java, um para React) — duplica manutenção e não reflete que os comandos são conceitualmente únicos.

### 4. Cópia agnóstica de stack em installDixiExtras
**Decisão**: a cópia dos 5 arquivos de comando ocorre para qualquer valor de `stack`, incluindo `null`.
**Rationale**: os comandos referenciam `pastelsdd/context/architecture.md` e adaptam o output em runtime — não há conteúdo a suprimir para nenhuma stack. Instalar sempre garante experiência consistente e evita lógica condicional desnecessária no instalador.
**Alternativa descartada**: instalar apenas quando `family !== null` — desnecessário; `/pstld:rfc` e `/pstld:adr` são úteis mesmo sem stack detectada.

### 5. Resolução do caminho dos arquivos fonte
**Decisão**: usar `import.meta.url` + `fileURLToPath` para resolver o caminho de `pscode/content/dixi/claude-runtime/commands/` relativo ao módulo `src/core/presets/dixi.ts`.
**Rationale**: o pscode é instalado como pacote npm; paths relativos ao módulo (`new URL('../../..', import.meta.url)`) funcionam tanto no repositório local quanto pós-publicação. É o mesmo padrão já usado para resolver `schemas/` em `artifact-graph/`.
**Alternativa descartada**: `process.cwd()` — resolveria para o diretório do projeto cliente, não do pacote pscode.

## Risks / Trade-offs

- [Risco] Se o Batch C não estiver instalado, os comandos `/pstld:arch-check` e `/pstld:dod` referenciarão context docs ausentes → Mitigação: cada arquivo de comando SHALL verificar a existência de `pastelsdd/context/` antes de usá-lo e exibir mensagem orientativa se ausente; a ordem de instalação dos batches (B→C→E) garante presença em condições normais
- [Risco] `.claude/commands/pstld/` pode já existir em projetos que usam o namespace manualmente → Mitigação: a instalação é idempotente (sobrescreve arquivos), sem apagar outros arquivos do diretório além dos 5 gerenciados pelo pscode
- [Trade-off] Prompts estáticos vs geração dinâmica: os arquivos de comando são fixos por versão do pscode. Mudanças de comportamento exigem nova versão do pacote e `pscode update --profile dixi` — previsível e auditável, mas sem customização por projeto

## Open Questions

_(nenhuma — escopo totalmente definido pelos batches anteriores)_
