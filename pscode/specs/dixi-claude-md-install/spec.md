# Spec: dixi-claude-md-install

## Purpose

Governs how `pscode init --profile dixi` installs the appropriate CLAUDE.md template into the client project, including intelligent merging when the file already exists.

## Requirements

### Requirement: Instalação do template CLAUDE.md no pscode init --profile dixi
O sistema SHALL, dentro de `installDixiExtras`, instalar o template CLAUDE.md correto no `projectDir` do cliente. A seleção SHALL ser baseada em `family` extraído de `.pscode-dixi.yaml`: `family === 'java'` → `CLAUDE.md.java.template`; `family === 'react'` → `CLAUDE.md.react.template`; `family === null` ou desconhecido → `CLAUDE.md.java.template` com aviso no console.

#### Scenario: Instalação em projeto Java
- **WHEN** `installDixiExtras` é chamado e `.pscode-dixi.yaml` contém `family: java`
- **THEN** o conteúdo de `CLAUDE.md.java.template` é instalado no projeto cliente como `CLAUDE.md` (via merge ou criação)

#### Scenario: Instalação em projeto React
- **WHEN** `installDixiExtras` é chamado e `.pscode-dixi.yaml` contém `family: react`
- **THEN** o conteúdo de `CLAUDE.md.react.template` é instalado no projeto cliente como `CLAUDE.md` (via merge ou criação)

#### Scenario: Fallback quando family é null
- **WHEN** `installDixiExtras` é chamado e `.pscode-dixi.yaml` contém `family: null`
- **THEN** o sistema usa `CLAUDE.md.java.template` como fallback e loga aviso: `"Dixi: stack não detectada, instalando CLAUDE.md genérico (baseado em Java). Edite .pscode-dixi.yaml para corrigir."`

### Requirement: Merge de CLAUDE.md se arquivo já existir
O sistema SHALL fazer merge do conteúdo do template no `CLAUDE.md` existente em vez de sobrescrevê-lo. O merge SHALL anexar a seção Dixi ao final do arquivo existente, precedida por um separador `<!-- dixi-constitutional -->`, apenas se essa seção ainda não estiver presente.

#### Scenario: Merge em CLAUDE.md existente sem seção Dixi
- **WHEN** o projeto cliente já tem `CLAUDE.md` e o arquivo NÃO contém `<!-- dixi-constitutional -->`
- **THEN** o sistema appenda o conteúdo do template ao final do arquivo existente, precedido pelo separador `<!-- dixi-constitutional -->`

#### Scenario: Sem re-merge em CLAUDE.md com seção Dixi já presente
- **WHEN** o projeto cliente já tem `CLAUDE.md` e o arquivo já contém `<!-- dixi-constitutional -->`
- **THEN** o sistema NÃO modifica o arquivo e loga: `"Dixi: CLAUDE.md já contém seção constitucional — pulando."`

#### Scenario: Criação de CLAUDE.md quando não existir
- **WHEN** o projeto cliente NÃO tem `CLAUDE.md`
- **THEN** o sistema cria o arquivo com o conteúdo completo do template selecionado
