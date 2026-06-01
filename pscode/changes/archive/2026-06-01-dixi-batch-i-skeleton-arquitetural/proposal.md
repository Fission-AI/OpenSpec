## Why

O profile `dixi` já detecta a stack (Java ou React/Next) mas ainda não impõe uma estrutura de pastas padronizada nem guardrails arquiteturais. Sem um skeleton inicial, cada projeto Dixi cresce de forma orgânica e diverge da arquitetura esperada (hexagonal para Java, feature-sliced para React), tornando ArchUnit e regras ESLint ineficazes porque os pacotes/diretórios que elas monitoram simplesmente não existem.

## What Changes

- Adicionar `pscode/content/dixi/architectures/hexagonal-spring/` com `skeleton.yaml` (lista de diretórios a criar) e template `ArchitectureTest.java` pré-configurado com regras ArchUnit
- Adicionar `pscode/content/dixi/architectures/feature-sliced-react/` com `skeleton.yaml` (diretórios `shared/`, `entities/`, `features/`) e templates `features/README.md` e `eslint-architecture.mjs`
- Estender `installDixiExtras` (Batch B) para invocar o skeleton correto conforme `family === 'java'` ou `family === 'react'`, com verificação brownfield (não sobrescreve o que já existe)
- Detecção de `basePackage` a partir do `pom.xml` (`<groupId>` + kebab-to-dot(`<artifactId>`)) para parametrizar o `ArchitectureTest.java`

## Capabilities

### New Capabilities

- `dixi-hexagonal-skeleton`: Criação do skeleton de pastas para arquitetura hexagonal em projetos Java/Spring, com `.gitkeep` em cada diretório e geração do `ArchitectureTest.java` parametrizado com o `basePackage` do projeto
- `dixi-feature-sliced-skeleton`: Criação do skeleton de pastas para feature-sliced design em projetos React/Next, incluindo `features/README.md` com convenções e `eslint-architecture.mjs` com regras de import entre features

### Modified Capabilities

- `dixi-init-extras`: A função `installDixiExtras` passa a chamar o skeleton correspondente após a instalação do kit SDLC (Batch H), condicionalmente à stack detectada

## Impact

- Novos arquivos em `pscode/content/dixi/architectures/` (somente conteúdo estático — templates e YAMLs de skeleton)
- `src/core/dixi/install-extras.ts` (ou equivalente do Batch B): adição da chamada ao skeleton após instalação do kit
- Novos testes de integração: `pscode init --profile dixi` em projeto Maven vazio deve criar estrutura hexagonal + `ArchitectureTest.java`; em projeto Next.js deve criar `shared/`, `entities/`, `features/` + `README.md`
- Changeset: `minor`
