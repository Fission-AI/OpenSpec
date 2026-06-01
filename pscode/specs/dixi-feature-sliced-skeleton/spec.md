## Purpose

Defines the architectural skeleton creation for React/Next.js projects using the Feature-Sliced Design pattern. Applied during `pscode init --profile dixi` when `family === 'react'`.

## Requirements

### Requirement: Skeleton feature-sliced é criado em projetos React/Next
O sistema SHALL criar a estrutura de diretórios do design feature-sliced quando `family === 'react'`, usando os caminhos definidos em `pscode/content/dixi/architectures/feature-sliced-react/skeleton.yaml`, adicionando `.gitkeep` nos diretórios folha (exceto `features/`, que recebe `README.md`).

#### Scenario: Projeto Next.js vazio recebe skeleton completo
- **WHEN** `pscode init --profile dixi` é executado em um diretório com `package.json` indicando Next.js e sem estrutura `src/` prévia
- **THEN** os seguintes diretórios são criados:
  - `src/shared/components/ui/` (com `.gitkeep`)
  - `src/shared/hooks/` (com `.gitkeep`)
  - `src/shared/services/` (com `.gitkeep`)
  - `src/shared/types/` (com `.gitkeep`)
  - `src/shared/utils/` (com `.gitkeep`)
  - `src/entities/` (com `.gitkeep`)
  - `src/features/` (com `README.md` — sem `.gitkeep`)

#### Scenario: Diretórios existentes não são sobrescritos (brownfield-safe)
- **WHEN** `pscode init --profile dixi` é executado em projeto que já possui `src/shared/`
- **THEN** o diretório existente é preservado e apenas os ausentes são criados

### Requirement: `features/README.md` é gerado com convenções da feature-sliced
O sistema SHALL criar `src/features/README.md` a partir do template `features/README.md.template`, descrevendo a convenção de subdiretórios por feature (`components/`, `hooks/`, `services/`, `types/`, `index.ts`) e a regra de que features não importam umas das outras.

#### Scenario: README criado em projeto limpo
- **WHEN** `src/features/` é criado pelo skeleton
- **THEN** `src/features/README.md` existe com as seções de estrutura e regras de importação

#### Scenario: README existente não é sobrescrito
- **WHEN** `src/features/README.md` já existe no projeto
- **THEN** o arquivo é preservado sem modificação

### Requirement: Template de regras ESLint é instalado com instrução de integração
O sistema SHALL instalar `eslint-architecture.mjs` na raiz do projeto a partir do template em `feature-sliced-react/eslint-architecture.mjs.template`, contendo regras `no-restricted-imports` para isolar features entre si e impedir importação de lógica de negócio inline em páginas. Após instalar, SHALL exibir instrução de como adicionar o arquivo ao `eslint.config.js` existente.

#### Scenario: Template ESLint instalado e instrução exibida
- **WHEN** `pscode init --profile dixi` é executado em projeto React
- **THEN** `eslint-architecture.mjs` é criado na raiz do projeto E uma mensagem é exibida com o trecho de código a adicionar ao `eslint.config.js`

#### Scenario: `eslint.config.js` existente não é modificado automaticamente
- **WHEN** `eslint.config.js` já existe no projeto
- **THEN** o arquivo não é alterado; apenas a instrução de integração é exibida

#### Scenario: Template ESLint não sobrescreve arquivo existente
- **WHEN** `eslint-architecture.mjs` já existe na raiz do projeto
- **THEN** o arquivo é preservado e a instrução de integração ainda é exibida
