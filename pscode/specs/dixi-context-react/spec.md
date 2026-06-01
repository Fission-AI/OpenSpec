# Spec: dixi-context-react

## Purpose

Define os arquivos de contexto específicos para projetos React/Next.js que o Dixi instala em `pastelsdd/context/`. Esses arquivos documentam as convenções de arquitetura (feature-sliced design), testes e nomenclatura do stack React adotado pelo workflow Dixi.

## Requirements

### Requirement: Arquivo architecture.md React instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/react/architecture.md` descrevendo o feature-sliced design adaptado: camadas `shared → entities → features → pages/app`, estrutura interna de cada feature (`components/`, `hooks/`, `services/`, `types/`, `index.ts`), regra de que features não importam umas das outras, e barrel export como única entrada pública de cada feature.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/react/` é inspecionado
- **THEN** o arquivo `architecture.md` existe com: camadas do feature-sliced, estrutura de feature, regra de no-cross-import

#### Scenario: Arquivo é copiado apenas para projetos React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/architecture.md` contém conteúdo React/feature-sliced

#### Scenario: Arquivo não é copiado para projetos Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/architecture.md` contém conteúdo Java/hexagonal (não React)

### Requirement: Arquivo testing.md React instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/react/testing.md` com a pirâmide de testes React/Next.js: unitários para hooks e services com Vitest, componentes com React Testing Library, E2E com Playwright para fluxos críticos.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/react/` é inspecionado
- **THEN** o arquivo `testing.md` existe com: ferramentas por nível da pirâmide e exemplos de uso

#### Scenario: Arquivo é copiado para projetos React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/testing.md` existe no repo do cliente

### Requirement: Arquivo naming.md React instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/react/naming.md` com convenções: componentes em PascalCase, hooks em `use` + PascalCase, services em camelCase, arquivos em kebab-case, constantes em SCREAMING_SNAKE_CASE.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/react/` é inspecionado
- **THEN** o arquivo `naming.md` existe com exemplos válidos e inválidos para cada tipo

#### Scenario: Arquivo é copiado para projetos React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/naming.md` existe no repo do cliente
