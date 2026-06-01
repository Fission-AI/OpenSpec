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
