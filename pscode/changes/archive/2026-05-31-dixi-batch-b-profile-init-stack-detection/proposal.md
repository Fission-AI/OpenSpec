## Why

O profile `dixi` existe em `profiles.ts` mas não executa nenhuma lógica adicional durante `pscode init`. Os batches C–J dependem de um arquivo `.pscode-dixi.yaml` gravado na raiz do projeto cliente e de um ponto de extensão `installDixiExtras` para instalar conteúdo stack-específico — sem essa fundação, nenhum dos batches seguintes pode funcionar.

## What Changes

- Novo módulo `src/core/presets/dixi.ts` com:
  - Tipo `DixiStack`: `'java-maven' | 'java-gradle' | 'next' | 'react' | 'node' | 'python' | null`
  - Tipo `DixiStackFamily`: `'java' | 'react' | 'node' | 'python' | null`
  - `detectDixiStack(projectDir)`: inspeciona arquivos de projeto para determinar a stack (ordem de prioridade: `pom.xml` → `build.gradle` → `next.config.*` → `package.json` → `pyproject.toml`)
  - `getDixiStackFamily(stack)`: mapeia `DixiStack` para `DixiStackFamily` (`java-maven`/`java-gradle` → `'java'`; `next` → `'react'`)
  - `getDixiStackLabel(stack)`: retorna string legível (ex: `'Java/Maven'`, `'Next.js'`)
- `src/core/init.ts`: quando `profile === 'dixi'`, após instalação de workflows, chama `detectDixiStack`, loga resultado, chama `installDixiExtras` (placeholder) e grava `.pscode-dixi.yaml` com `{ stack, family, detectedAt }`
- Novos testes unitários em `test/core/presets/dixi.test.ts` cobrindo todos os cenários de detecção e um smoke test do `InitCommand` com `--profile dixi`

## Capabilities

### New Capabilities

- `dixi-stack-detection`: detecção automática da stack do projeto (Java Maven/Gradle, Next.js, React, Node, Python) durante `pscode init --profile dixi`, com tipos e funções auxiliares exportáveis pelos batches seguintes
- `dixi-init-extras`: ponto de extensão `installDixiExtras(projectDir, stack)` ativado quando `profile === 'dixi'`, responsável por gravar `.pscode-dixi.yaml` e servir como hook de instalação para os batches C–J

### Modified Capabilities

<!-- nenhuma capability existente tem seus requisitos alterados neste batch -->

## Impact

- `src/core/presets/dixi.ts` — arquivo novo
- `src/core/init.ts` — adição de branch condicional para `profile === 'dixi'`
- `test/core/presets/dixi.test.ts` — arquivo novo
- `.pscode-dixi.yaml` gerado na raiz do projeto cliente (não versionado pelo pscode, fica no `.gitignore` do cliente)
- Nenhuma mudança de API pública; `detectDixiStack` e tipos são exportados internamente
- Changeset: `minor`
