## MODIFIED Requirements

### Requirement: Executar lógica extra do profile dixi durante pscode init
O sistema SHALL, quando `profile === 'dixi'` e após a instalação de workflows padrão, chamar `detectDixiStack`, logar o resultado, chamar `installDixiExtras(projectDir, stack)`, gravar `.pscode-dixi.yaml` na raiz do `projectDir`, e gravar `pscode/config.yaml` com `schema: pstld-workflow`.

#### Scenario: Init com profile dixi em projeto Java/Maven
- **WHEN** `pscode init --profile dixi` é executado em um diretório contendo `pom.xml`
- **THEN** o sistema loga `"Dixi: stack detectada — Java/Maven"`, chama `installDixiExtras`, grava `.pscode-dixi.yaml` e grava `pscode/config.yaml` com `schema: pstld-workflow`

#### Scenario: Init com profile dixi em projeto Next.js
- **WHEN** `pscode init --profile dixi` é executado em um diretório contendo `next.config.js`
- **THEN** o sistema loga `"Dixi: stack detectada — Next.js"`, chama `installDixiExtras`, grava `.pscode-dixi.yaml` e grava `pscode/config.yaml` com `schema: pstld-workflow`

#### Scenario: Init com profile dixi sem stack detectada
- **WHEN** `pscode init --profile dixi` é executado em um diretório sem arquivos de configuração reconhecidos
- **THEN** o sistema loga `"Dixi: stack não detectada, usando configuração genérica"`, chama `installDixiExtras(projectDir, null)`, grava `.pscode-dixi.yaml` com `stack: null` e grava `pscode/config.yaml` com `schema: pstld-workflow`

#### Scenario: Init com profile diferente de dixi não aciona extras
- **WHEN** `pscode init --profile standard` é executado
- **THEN** `detectDixiStack` e `installDixiExtras` NÃO são chamados, `.pscode-dixi.yaml` NÃO é gerado, e `pscode/config.yaml` é gravado com `schema: spec-driven`

## ADDED Requirements

### Requirement: config.yaml gerado com schema correto para o profile dixi
O sistema SHALL gravar `schema: pstld-workflow` no `pscode/config.yaml` quando o profile ativo for `dixi`, em vez do valor padrão `spec-driven`.

#### Scenario: config.yaml contém pstld-workflow após init com dixi
- **WHEN** `pscode init --profile dixi` é executado e `pscode/config.yaml` ainda não existe
- **THEN** o arquivo `pscode/config.yaml` é criado com `schema: pstld-workflow`

#### Scenario: config.yaml contém spec-driven após init sem profile dixi
- **WHEN** `pscode init` é executado sem `--profile dixi` (ou com `--profile standard`) e `pscode/config.yaml` ainda não existe
- **THEN** o arquivo `pscode/config.yaml` é criado com `schema: spec-driven`

#### Scenario: config.yaml existente não é sobrescrito
- **WHEN** `pscode init --profile dixi` é executado e `pscode/config.yaml` já existe
- **THEN** o arquivo existente NÃO é modificado (comportamento idêntico ao atual)

#### Scenario: Log exibe schema real utilizado
- **WHEN** `pscode init --profile dixi` é executado e o `config.yaml` é criado
- **THEN** a mensagem de log exibe `schema: pstld-workflow` (e não `spec-driven`)
