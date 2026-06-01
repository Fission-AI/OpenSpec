# Spec: dixi-context-install

## Purpose

Define o comportamento da função `installDixiExtras` em `src/commands/init.ts` ao copiar arquivos de contexto Dixi (shared e específicos de stack) para o repositório do cliente durante `pscode init --profile dixi`.

## Requirements

### Requirement: installDixiExtras copia shared/ sempre
A função `installDixiExtras` em `src/commands/init.ts` SHALL copiar todos os arquivos de `pscode/content/dixi/context/shared/` para `pastelsdd/context/` no repo do cliente, independente da `family` detectada.

#### Scenario: Projeto Java recebe shared/
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/commits.md`, `pastelsdd/context/dod.md`, `pastelsdd/context/dev-flow.md` e `pastelsdd/context/pr-flow.md` existem no repo do cliente

#### Scenario: Projeto React recebe shared/
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** os 4 arquivos shared existem em `pastelsdd/context/`

#### Scenario: Projeto sem stack recebe shared/ com aviso
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: null` ou `family: 'node'`
- **THEN** os 4 arquivos shared são copiados e o CLI exibe aviso: "Stack não detectada — apenas docs compartilhados instalados. Configure `family` em `.pscode-dixi.yaml` para instalar docs específicos de stack."

### Requirement: installDixiExtras copia java/ apenas para projetos Java
A função SHALL copiar `pscode/content/dixi/context/java/` para `pastelsdd/context/` somente quando `family === 'java'`.

#### Scenario: Projeto Java recebe docs Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/architecture.md`, `pastelsdd/context/testing.md` e `pastelsdd/context/naming.md` existem com conteúdo Java

#### Scenario: Projeto React não recebe docs Java
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/` não contém arquivos provenientes de `java/`

### Requirement: installDixiExtras copia react/ apenas para projetos React
A função SHALL copiar `pscode/content/dixi/context/react/` para `pastelsdd/context/` somente quando `family === 'react'`.

#### Scenario: Projeto React recebe docs React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: react`
- **THEN** `pastelsdd/context/architecture.md`, `pastelsdd/context/testing.md` e `pastelsdd/context/naming.md` existem com conteúdo React/Next.js

#### Scenario: Projeto Java não recebe docs React
- **WHEN** `pscode init --profile dixi` é executado em projeto com `family: java`
- **THEN** `pastelsdd/context/` não contém arquivos provenientes de `react/`

### Requirement: Instalação é brownfield-safe
A função SHALL verificar a existência de cada arquivo destino antes de copiar. Se o arquivo já existir em `pastelsdd/context/`, SHALL pular a cópia sem erro.

#### Scenario: Arquivo já existe — não sobrescreve
- **WHEN** `pastelsdd/context/commits.md` já existe no repo do cliente
- **THEN** a instalação pula esse arquivo e exibe log informativo: "commits.md já existe — pulado"

#### Scenario: Arquivo não existe — copia normalmente
- **WHEN** `pastelsdd/context/commits.md` não existe no repo do cliente
- **THEN** o arquivo é copiado de `pscode/content/dixi/context/shared/commits.md`
