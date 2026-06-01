## Context

O pscode suporta profiles (`standard`, `dixi`). O profile `dixi` diferencia-se por chamar `installDixiExtras` após a geração padrão de skills/comandos. Atualmente `installDixiExtras` apenas copia context docs para `pastelsdd/context/`.

O adapter Claude instala skills em `.claude/commands/ps/<id>.md`. A geração padrão (`generateSkillsAndCommands`) cria esses arquivos com conteúdo genérico. O objetivo desta change é que o profile `dixi` sobrescreva esses arquivos com versões stack-aware após a geração padrão.

O padrão de "sobrescrever após geração padrão" já existe no fluxo do `InitCommand` — `handleDixiExtras` já é chamado depois de `generateSkillsAndCommands` (linha ~171 em `init.ts`). A mudança é adicionar a cópia dos arquivos de comando dentro de `installDixiExtras`.

## Goals / Non-Goals

**Goals:**
- `installDixiExtras` copia arquivos Dixi-aware para `.claude/commands/ps/` (overrides) e `.claude/commands/pstld/` (exclusivos)
- Os arquivos de conteúdo Dixi são empacotados em `pscode/content/dixi/commands/`
- O dev Dixi usa `/ps:propose`, `/ps:apply`, etc. com comportamento Dixi sem aprender namespace novo
- Comandos exclusivos Dixi ficam em `/pstld:*`

**Non-Goals:**
- Suporte a outros adapters além de `claude` neste batch (Codex, Cursor, Gemini ficam para batch futuro)
- Personalização de conteúdo por stack (todos os stacks recebem o mesmo override Dixi-aware neste batch)
- Alteração do `generateSkillsAndCommands` ou da lógica de seleção de tools

## Decisions

### Decisão 1: Cópia direta de arquivos estáticos em vez de geração dinâmica

Os overrides Dixi são arquivos Markdown estáticos em `pscode/content/dixi/commands/`, copiados por `installDixiExtras` via `fs.copyFileSync`. Alternativa seria gerar o conteúdo programaticamente a partir dos templates dos workflows padrão com decoradores Dixi.

**Escolha**: arquivos estáticos. O conteúdo dos skills Dixi é substancialmente diferente do padrão (inclui instruções de ADR, DoD, referências Jira-specific) — gerar dinamicamente adicionaria complexidade sem benefício real neste batch. Os arquivos podem ser editados manualmente pelos engenheiros Dixi sem tocar em código.

### Decisão 2: Sobrescrever arquivos sempre (sem verificação de existência)

`installDixiExtras` sobrescreve arquivos em `.claude/commands/ps/` sem verificar se já existem, ao contrário de `copyContextDocs` que pula arquivos existentes.

**Escolha**: sobrescrever sempre. O invariante do profile `dixi` é que os comandos `/ps:*` sempre refletem o comportamento Dixi. Se o usuário roda `pscode init --profile dixi` novamente (upgrade), deve receber a versão mais recente dos overrides. Preservar a versão antiga seria inconsistente.

### Decisão 3: Namespace /pstld:* para comandos exclusivos Dixi

Comandos sem equivalente no standard (`arch-check`, `adr`, `dod`, `jira-draft`) ficam em `.claude/commands/pstld/`, não em `.claude/commands/ps/`.

**Escolha**: namespace separado. Misturar comandos sem equivalente standard em `/ps:` quebraria a semântica do namespace — `/ps:*` deveria ter um significado consistente entre profiles. Além disso, os comandos exclusivos Dixi têm terminologia específica que não faz sentido expor a usuários do profile standard.

## Risks / Trade-offs

- **Arquivos estáticos desatualizam com o tempo** → Mitigação: a change de conteúdo dos arquivos Dixi tem seu próprio lifecycle. Batch C (content/docs de referência) já trata o conteúdo de context docs — o conteúdo dos command files seguirá o mesmo padrão.
- **Adapter `claude` hardcoded** → Mitigação: a estrutura `pscode/content/dixi/commands/ps/` e `pstld/` é agnóstica ao adapter; adicionar suporte a Codex/Cursor num batch futuro será `copyDixiCommands(projectDir, adapterDir)` para cada adapter.
- **Usuário tem outros files em `.claude/commands/ps/`** → Mitigação: `installDixiExtras` sobrescreve apenas os arquivos que têm versão Dixi; arquivos sem versão Dixi não são tocados.

## Migration Plan

1. Não há migração necessária para projetos existentes — `pscode init --profile dixi` pode ser reexecutado para aplicar os overrides.
2. Rollback: remover os arquivos em `.claude/commands/ps/` que foram sobrescritos e reexecutar `pscode init` sem profile dixi (ou com `--force`).

## Open Questions

- O conteúdo dos arquivos Dixi-aware (`propose.md`, `explore.md`, etc.) deve ser definido neste batch ou delegado a um batch C+ de content? **Decisão provisória**: criar placeholders funcionais neste batch e iterar conteúdo em batch posterior.
