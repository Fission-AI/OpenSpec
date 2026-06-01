## Purpose

Defines the extra initialization logic executed when `pscode init` runs with `--profile dixi`. Covers triggering stack detection, calling extension hooks, and writing the `.pscode-dixi.yaml` marker file in the client project root.

## Requirements

### Requirement: Executar lógica extra do profile dixi durante pscode init
O sistema SHALL, quando `profile === 'dixi'` e após a instalação de workflows padrão, chamar `detectDixiStack`, logar o resultado, chamar `installDixiExtras(projectDir, stack)` e gravar `.pscode-dixi.yaml` na raiz do `projectDir`.

#### Scenario: Init com profile dixi em projeto Java/Maven
- **WHEN** `pscode init --profile dixi` é executado em um diretório contendo `pom.xml`
- **THEN** o sistema loga `"Dixi: stack detectada — Java/Maven"`, chama `installDixiExtras` e grava `.pscode-dixi.yaml`

#### Scenario: Init com profile dixi em projeto Next.js
- **WHEN** `pscode init --profile dixi` é executado em um diretório contendo `next.config.js`
- **THEN** o sistema loga `"Dixi: stack detectada — Next.js"`, chama `installDixiExtras` e grava `.pscode-dixi.yaml`

#### Scenario: Init com profile dixi sem stack detectada
- **WHEN** `pscode init --profile dixi` é executado em um diretório sem arquivos de configuração reconhecidos
- **THEN** o sistema loga `"Dixi: stack não detectada, usando configuração genérica"`, chama `installDixiExtras(projectDir, null)` e grava `.pscode-dixi.yaml` com `stack: null`

#### Scenario: Init com profile diferente de dixi não aciona extras
- **WHEN** `pscode init --profile standard` é executado
- **THEN** `detectDixiStack` e `installDixiExtras` NÃO são chamados e `.pscode-dixi.yaml` NÃO é gerado

### Requirement: Gravar arquivo .pscode-dixi.yaml na raiz do projeto
O sistema SHALL criar o arquivo `.pscode-dixi.yaml` na raiz do projeto cliente com os campos `stack`, `family` e `detectedAt` (ISO 8601), sobrescrevendo se já existir.

#### Scenario: Arquivo gravado com stack detectada
- **WHEN** `pscode init --profile dixi` é executado e stack é `'java-maven'`
- **THEN** `.pscode-dixi.yaml` é criado com `stack: java-maven`, `family: java` e `detectedAt` com timestamp atual

#### Scenario: Arquivo gravado com stack nula
- **WHEN** nenhuma stack é detectada
- **THEN** `.pscode-dixi.yaml` é criado com `stack: null`, `family: null` e `detectedAt` com timestamp atual

### Requirement: installDixiExtras copia slash commands para .claude/commands/pstld/
A função `installDixiExtras(projectDir, stack)` SHALL criar o diretório `.claude/commands/pstld/` na raiz do projeto cliente e copiar os 5 arquivos de comando (rfc.md, arch-check.md, adr.md, jira-sync.md, dod.md) de `pscode/content/dixi/claude-runtime/commands/` para esse diretório.

#### Scenario: Diretório .claude/commands/pstld/ criado após installDixiExtras
- **WHEN** `installDixiExtras` for chamado em qualquer projectDir
- **THEN** `.claude/commands/pstld/` SHALL existir na raiz de projectDir após a execução

#### Scenario: Os 5 arquivos de comando estão presentes após installDixiExtras
- **WHEN** `installDixiExtras` for chamado em qualquer projectDir
- **THEN** os arquivos rfc.md, arch-check.md, adr.md, jira-sync.md e dod.md SHALL existir em `.claude/commands/pstld/`

#### Scenario: Instalação é idempotente — reexecução não duplica nem corrompe arquivos
- **WHEN** `installDixiExtras` for chamado mais de uma vez no mesmo projectDir
- **THEN** `.claude/commands/pstld/` SHALL conter exatamente os 5 arquivos sem duplicatas ou arquivos corrompidos

#### Scenario: Instalação funciona independentemente da stack detectada
- **WHEN** `installDixiExtras` for chamado com qualquer valor de stack (java-maven, next, react, node, null)
- **THEN** os 5 arquivos de comando SHALL ser copiados — a instalação dos commands não depende de family

### Requirement: Instalação dos hooks durante pscode init --profile dixi
O comando `pscode init --profile dixi` SHALL copiar `arch-guard.mjs` e `jira-context.mjs` para `.claude/hooks/` no repo do cliente.

#### Scenario: Hooks copiados em novo projeto
- **WHEN** `pscode init --profile dixi` é executado em um projeto sem `.claude/hooks/`
- **THEN** o diretório `.claude/hooks/` é criado
- **AND** `arch-guard.mjs` e `jira-context.mjs` são copiados para `.claude/hooks/`

#### Scenario: Hooks já existentes não são sobrescritos
- **WHEN** `pscode init --profile dixi` é executado em um projeto que já possui `.claude/hooks/arch-guard.mjs`
- **THEN** o arquivo existente é mantido sem modificação (brownfield-safe)

---

### Requirement: Merge de .claude/settings.json ao registrar hooks
O comando `pscode init --profile dixi` SHALL fazer merge das entradas de hooks em `.claude/settings.json` sem sobrescrever configurações existentes.

#### Scenario: settings.json inexistente — criado com hooks
- **WHEN** `pscode init --profile dixi` é executado e `.claude/settings.json` não existe
- **THEN** um novo `settings.json` é criado com as entradas de hook `PreToolUse` (arch-guard) e `UserPromptSubmit` (jira-context)

#### Scenario: settings.json existente — merge não duplica entradas
- **WHEN** `.claude/settings.json` já existe com configurações de hooks do usuário
- **THEN** as entradas de arch-guard e jira-context são adicionadas apenas se ainda não existirem
- **AND** as configurações pré-existentes são preservadas integralmente

#### Scenario: settings.json com JSON inválido — log de erro e novo arquivo
- **WHEN** `.claude/settings.json` existe mas contém JSON inválido
- **THEN** o erro é logado no console
- **AND** um novo `settings.json` é criado com apenas as entradas dos hooks Dixi

---

### Requirement: Estrutura de hooks no settings.json
O `settings.json` gerado SHALL registrar `arch-guard.mjs` como hook `PreToolUse` com matcher para `Edit` e `Write`, e `jira-context.mjs` como hook `UserPromptSubmit`.

#### Scenario: Estrutura correta do settings.json após instalação
- **WHEN** `pscode init --profile dixi` completa a instalação
- **THEN** `.claude/settings.json` contém uma entrada `hooks` com:
  - `PreToolUse` matcher `Edit|Write` apontando para `.claude/hooks/arch-guard.mjs`
  - `UserPromptSubmit` apontando para `.claude/hooks/jira-context.mjs`

### Requirement: installDixiExtras copies SDLC kit by detected stack
The `installDixiExtras` function SHALL copy the shared SDLC kit files unconditionally and the stack-specific kit files based on the `family` field in `.pscode-dixi.yaml`. If `family` is absent or unknown, only shared files are installed.

#### Scenario: Java family triggers java kit installation
- **WHEN** `.pscode-dixi.yaml` contains `family: java`
- **THEN** `pscode/content/dixi/kit/shared/` and `pscode/content/dixi/kit/java/` files are copied to the project root

#### Scenario: React family triggers react kit installation
- **WHEN** `.pscode-dixi.yaml` contains `family: react`
- **THEN** `pscode/content/dixi/kit/shared/` and `pscode/content/dixi/kit/react/` files are copied to the project root

#### Scenario: Missing family installs only shared kit
- **WHEN** `.pscode-dixi.yaml` does not contain a `family` field or the file is absent
- **THEN** only `pscode/content/dixi/kit/shared/` files are installed; no error is thrown

#### Scenario: Installation order is respected
- **WHEN** `pscode init --profile dixi` runs
- **THEN** SDLC kit installation runs after hook installation (Batch G) in the same `installDixiExtras` call
