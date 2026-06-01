## Why

O profile `dixi` instala context docs (Batch C) e possui workflows próprios, mas o desenvolvedor ainda não tem comandos rápidos no Claude Code para executar o fluxo RFC → Design → Tasks nem para verificações de arquitetura e JIRA. Criar os 5 slash commands `/pstld:*` cobre esse gap — cada comando usa os context docs já instalados para produzir output adequado à stack sem precisar de instrução manual.

## What Changes

- 5 arquivos markdown em `pscode/content/dixi/claude-runtime/commands/`:
  - `rfc.md` → `/pstld:rfc` — abre fluxo RFC estruturado usando `pastelsdd/context/dev-flow.md`
  - `arch-check.md` → `/pstld:arch-check` — verifica conformidade arquitetural lendo `pastelsdd/context/architecture.md`
  - `adr.md` → `/pstld:adr` — cria Architecture Decision Record baseado em decisão descrita pelo usuário
  - `jira-sync.md` → `/pstld:jira-sync` — testa conexão JIRA via MCP Atlassian e exibe status de `pastelsdd/jira.yaml`
  - `dod.md` → `/pstld:dod` — verifica Definition of Done do item corrente contra `pastelsdd/context/dod.md`
- Expansão de `installDixiExtras` (já existente do Batch B) para criar `.claude/commands/pstld/` e copiar os 5 arquivos
- Os comandos são agnósticos de stack — adaptam o output em runtime lendo `.pscode-dixi.yaml` para determinar `family`

## Capabilities

### New Capabilities

- `pstld-slash-commands`: conjunto de 5 arquivos de slash command instalados em `.claude/commands/pstld/` pelo profile `dixi`; cada arquivo é um prompt estruturado que usa os context docs da Dixi para produzir output correto sem instrução adicional do dev

### Modified Capabilities

- `dixi-init-extras`: `installDixiExtras` passa a copiar os 5 arquivos de comando além do que já instalava; o contrato da função não muda (mesma assinatura), apenas o corpo é expandido

## Impact

- `pscode/content/dixi/claude-runtime/commands/` — diretório novo com 5 arquivos markdown (conteúdo dos slash commands)
- `src/core/presets/dixi.ts` — expansão de `installDixiExtras` para criar `.claude/commands/pstld/` e copiar os arquivos
- `test/core/presets/dixi.test.ts` — novos casos de teste para verificar que os 5 arquivos são copiados após `installDixiExtras`
- Nenhuma mudança de API pública ou schema; changeset: `minor`
