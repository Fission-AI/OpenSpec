## ADDED Requirements

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

### Requirement: installDixiExtras como ponto de extensão placeholder
O sistema SHALL fornecer a função `installDixiExtras(projectDir, stack)` que, neste batch, apenas loga o que instalaria (ex: `"installDixiExtras: placeholder — instalaria conteúdo para stack java"`), sem copiar arquivos. Batches C–J implementarão o conteúdo real.

#### Scenario: Placeholder loga intenção sem erro
- **WHEN** `installDixiExtras(projectDir, 'java-maven')` é chamado
- **THEN** uma mensagem de log é emitida descrevendo o que seria instalado e nenhum arquivo é criado ou modificado além de `.pscode-dixi.yaml`
