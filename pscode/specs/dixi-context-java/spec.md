# Spec: dixi-context-java

## Purpose

Define os arquivos de contexto específicos para projetos Java que o Dixi instala em `pastelsdd/context/`. Esses arquivos documentam as convenções de arquitetura, testes e nomenclatura do stack Java hexagonal adotado pelo workflow Dixi.

## Requirements

### Requirement: Arquivo architecture.md Java instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/java/architecture.md` descrevendo a arquitetura hexagonal obrigatória: pacotes `domain/model`, `domain/port/in`, `domain/port/out`, `application/usecase`, `infrastructure/adapter/in`, `infrastructure/adapter/out`, regras de dependência (infra→app→domain, nunca inverso) e exemplos de classes por camada.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/java/` é inspecionado
- **THEN** o arquivo `architecture.md` existe com: estrutura de pacotes obrigatória, diagrama de dependências, exemplos de classe por camada

#### Scenario: Arquivo é copiado apenas para projetos Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/architecture.md` existe com conteúdo Java/hexagonal

#### Scenario: Arquivo não é copiado para projetos React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/architecture.md` contém conteúdo React/feature-sliced (não Java)

### Requirement: Arquivo testing.md Java instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/java/testing.md` com a pirâmide de testes Java: unitários no domínio puro sem Spring (JUnit 5 + Mockito), integração com Testcontainers, E2E com RestAssured, nomenclatura GivenWhenThen, cobertura mínima de 80% em `domain` e `application`.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/java/` é inspecionado
- **THEN** o arquivo `testing.md` existe com: pirâmide de testes, ferramentas por nível, nomenclatura e requisito de cobertura

#### Scenario: Arquivo é copiado para projetos Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/testing.md` existe no repo do cliente

### Requirement: Arquivo naming.md Java instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/java/naming.md` com convenções de nomenclatura por camada: Domain (substantivos sem sufixo técnico), Application (verbo + UseCase), Infrastructure (padrão + sufixo técnico como `Controller`, `Repository`, `Adapter`).

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/java/` é inspecionado
- **THEN** o arquivo `naming.md` existe com exemplos de nomes válidos e inválidos por camada

#### Scenario: Arquivo é copiado para projetos Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/naming.md` existe no repo do cliente
