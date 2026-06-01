## Purpose

Defines how `pscode` detects the technology stack of a client project during Dixi profile initialization. Covers the detection algorithm, priority order, family grouping, and human-readable label utilities.

## Requirements

### Requirement: Detectar stack do projeto a partir de arquivos de configuração
O sistema SHALL inspecionar o diretório do projeto e retornar o tipo de stack (`DixiStack`) com base na presença de arquivos de configuração conhecidos, respeitando a seguinte ordem de prioridade: `pom.xml` → `build.gradle` → `next.config.{js,ts,mjs}` → `package.json` com `"next"` em dependencies → `package.json` com `"react"` em dependencies → `package.json` existente → `pyproject.toml` → `null`.

#### Scenario: Projeto Maven detectado
- **WHEN** `pom.xml` existe na raiz do `projectDir`
- **THEN** `detectDixiStack` retorna `'java-maven'`

#### Scenario: Projeto Gradle detectado quando não há Maven
- **WHEN** `build.gradle` existe na raiz e `pom.xml` não existe
- **THEN** `detectDixiStack` retorna `'java-gradle'`

#### Scenario: Projeto Next.js detectado por arquivo de config
- **WHEN** qualquer um de `next.config.js`, `next.config.ts` ou `next.config.mjs` existe na raiz
- **THEN** `detectDixiStack` retorna `'next'`

#### Scenario: Projeto Next.js detectado via package.json
- **WHEN** `package.json` existe com `"next"` em `dependencies` ou `devDependencies` e nenhum arquivo `next.config.*` existe
- **THEN** `detectDixiStack` retorna `'next'`

#### Scenario: Projeto React puro detectado
- **WHEN** `package.json` tem `"react"` em `dependencies` mas não tem `"next"` em nenhuma seção de dependências e não há `next.config.*`
- **THEN** `detectDixiStack` retorna `'react'`

#### Scenario: Projeto Node genérico detectado
- **WHEN** `package.json` existe mas não contém `"react"` nem `"next"` em dependências
- **THEN** `detectDixiStack` retorna `'node'`

#### Scenario: Projeto Python detectado
- **WHEN** `pyproject.toml` existe e nenhum arquivo das categorias anteriores está presente
- **THEN** `detectDixiStack` retorna `'python'`

#### Scenario: Nenhuma stack detectada
- **WHEN** o `projectDir` está vazio ou não contém nenhum arquivo de configuração reconhecido
- **THEN** `detectDixiStack` retorna `null`

### Requirement: Mapear stack para família de stack
O sistema SHALL fornecer `getDixiStackFamily(stack)` que agrupa stacks em famílias: `java-maven` e `java-gradle` mapeiam para `'java'`; `next` mapeia para `'react'`; `react`, `node` e `python` mapeiam para seus próprios nomes; `null` mapeia para `null`.

#### Scenario: Família Java para Maven
- **WHEN** `getDixiStackFamily('java-maven')` é chamado
- **THEN** retorna `'java'`

#### Scenario: Família Java para Gradle
- **WHEN** `getDixiStackFamily('java-gradle')` é chamado
- **THEN** retorna `'java'`

#### Scenario: Família React para Next.js
- **WHEN** `getDixiStackFamily('next')` é chamado
- **THEN** retorna `'react'`

#### Scenario: Stack null retorna família null
- **WHEN** `getDixiStackFamily(null)` é chamado
- **THEN** retorna `null`

### Requirement: Retornar label legível para exibição
O sistema SHALL fornecer `getDixiStackLabel(stack)` que retorna uma string legível para log e UI: `'java-maven'` → `'Java/Maven'`; `'java-gradle'` → `'Java/Gradle'`; `'next'` → `'Next.js'`; `'react'` → `'React'`; `'node'` → `'Node.js'`; `'python'` → `'Python'`; `null` → `'desconhecida'`.

#### Scenario: Label para stack Maven
- **WHEN** `getDixiStackLabel('java-maven')` é chamado
- **THEN** retorna `'Java/Maven'`

#### Scenario: Label para stack Next.js
- **WHEN** `getDixiStackLabel('next')` é chamado
- **THEN** retorna `'Next.js'`

#### Scenario: Label para stack nula
- **WHEN** `getDixiStackLabel(null)` é chamado
- **THEN** retorna `'desconhecida'`
