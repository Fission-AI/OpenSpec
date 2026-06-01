## Context

O perfil `dixi` do pscode instala convenções arquiteturais via `pscode init --profile dixi`. Até o Batch F, essas convenções existem apenas como documentação (markdown em `pastelsdd/context/`). O agente de IA pode simplesmente ignorá-las.

Os **hooks do Claude Code** executam como processos externos no runtime do Claude Code, fora do controle do agente. O hook `PreToolUse` intercepta chamadas a `Edit`/`Write` antes que o arquivo seja modificado; o `UserPromptSubmit` intercepta o prompt antes do processamento. Ambos comunicam-se via stdin/stdout e controlam o fluxo via exit code.

**Estado atual**: `installDixiExtras` (Batch B) copia arquivos de conteúdo e gera `.claude/settings.json` do zero. Hooks ainda não existem.

## Goals / Non-Goals

**Goals:**
- Criar `arch-guard.mjs` que bloqueia (`exit 2`) violações arquiteturais em tempo de escrita para Java (hexagonal) e React/Next (feature-sliced)
- Criar `jira-context.mjs` que enriquece prompts com contexto JIRA quando um ticket é mencionado
- Registrar ambos os hooks em `.claude/settings.json` via merge (não sobrescrita) durante `pscode init --profile dixi`
- Cobertura de testes para os dois hooks

**Non-Goals:**
- Suporte a outras stacks além de Java e React/Next neste batch
- Hook de `PostToolUse` ou qualquer outro evento além de `PreToolUse` e `UserPromptSubmit`
- Integração real com API JIRA (apenas leitura de `jira.yaml` para injetar contexto pré-existente)
- Substituição do ESLint ou ArchUnit (hooks são complementares, não substitutos)

## Decisions

### D1 — ESM puro sem dependências externas

**Decisão**: Os hooks são implementados como `.mjs` usando apenas `node:fs` e `node:path`.

**Rationale**: Hooks executam no ambiente do usuário, que pode não ter as dependências do pscode instaladas. Dependência zero elimina qualquer problema de resolução de módulo ou versão.

**Alternativa considerada**: Compilar hooks como parte do bundle do pscode — descartado porque mudaria a localização dos arquivos e dificultaria edição manual pelo usuário.

---

### D2 — Localização dos hooks em `.claude/hooks/` no repo do cliente

**Decisão**: Os hooks são copiados para `.claude/hooks/arch-guard.mjs` e `.claude/hooks/jira-context.mjs` no repo do cliente durante `pscode init`.

**Rationale**: O Claude Code carrega hooks a partir de caminhos absolutos ou relativos ao workspace. Manter os arquivos no repo permite versionamento e edição pelo time.

**Alternativa considerada**: Referenciar os hooks a partir do diretório de instalação global do pscode — descartado porque dependeria de um caminho absoluto específico da máquina.

---

### D3 — Merge de `.claude/settings.json`, nunca sobrescrita

**Decisão**: Ao instalar, ler o `settings.json` existente (se houver), fazer merge na seção `hooks`, e gravar de volta.

**Rationale**: O usuário pode ter outros hooks ou configurações manuais. Sobrescrever destruiria trabalho existente (brownfield-safe).

**Algoritmo de merge**:
1. Ler `.claude/settings.json` (ou `{}` se não existir)
2. Para cada hook a adicionar: verificar se já existe entrada com mesmo `matcher` e `hooks[].command` — se sim, não duplicar
3. Gravar o JSON atualizado

---

### D4 — `.pscode-dixi.yaml` como gate do arch-guard

**Decisão**: Se `.pscode-dixi.yaml` não existir no diretório raiz do workspace → `exit 0` sem log.

**Rationale**: Garante que projetos não-Dixi nunca sejam afetados. O hook é instalado globalmente no Claude Code, mas só ativa onde a configuração Dixi existe.

---

### D5 — Exit codes semânticos do arch-guard

| Exit code | Significado | Comportamento Claude Code |
|-----------|-------------|--------------------------|
| `0` | OK — nenhuma violação | Continua normalmente |
| `1` | Warning — lógica inline em pages (React) | Claude Code exibe aviso, mas continua |
| `2` | Bloqueio — violação arquitetural | Claude Code rejeita a tool call |

---

### D6 — Detecção de violações por análise de texto simples

**Decisão**: Usar regex e análise de linhas de import/texto, sem parser AST.

**Rationale**: AST exigiria dependência externa (ex: `@babel/parser`, `tree-sitter`). Regex cobre os casos práticos (import statements Java e ES modules) com complexidade zero.

**Limitações aceitas**: Falsos negativos em imports dinâmicos incomuns; falsos positivos em comentários que contenham import. Aceitável para guardrails que o usuário pode revisar.

## Risks / Trade-offs

- **[Risk] Performance**: Cada `Edit`/`Write` dispara o hook → Mitigation: O hook é síncrono e leve (apenas fs.readFileSync + regex), latência esperada < 10ms
- **[Risk] Falso positivo bloqueia trabalho legítimo**: Regex pode ser muito agressivo → Mitigation: Usuário pode editar `.claude/hooks/arch-guard.mjs` diretamente; testes cobrem os edge cases principais
- **[Risk] `jira-context.mjs` retorna conteúdo inesperado**: Prompt injection via dados JIRA → Mitigation: Hook lê apenas `jira.yaml` local; sem chamada à API JIRA neste batch
- **[Risk] Merge de settings.json falha em JSON inválido**: Settings corrompido → Mitigation: Envolver em try/catch; em caso de parse error, logar e criar novo arquivo

## Migration Plan

1. `pscode init --profile dixi` em projetos novos: instalação limpa, sem estado anterior
2. Projetos que já rodaram `pscode init --profile dixi` (Batches anteriores):
   - Usuário pode re-rodar `pscode init --profile dixi` — o merge é idempotente
   - Ou copiar manualmente `.claude/hooks/` e atualizar `settings.json`

Rollback: remover entradas de hooks de `.claude/settings.json` e deletar `.claude/hooks/arch-guard.mjs` e `jira-context.mjs`.

## Open Questions

- **jira-context.mjs**: qual contexto exatamente injetar? O conteúdo de `pastelsdd/jira.yaml`? Um template formatado? → Deixar como placeholder para Batch J que define a integração JIRA completa; neste batch o hook apenas detecta o ticket e emite um stub
