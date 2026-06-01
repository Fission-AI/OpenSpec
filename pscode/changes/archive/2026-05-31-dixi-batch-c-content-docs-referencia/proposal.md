## Why

O perfil `dixi` do pscode instala guardrails e workflows para times Java/Spring e React/Next.js, mas atualmente não entrega documentação de referência técnica no repositório do cliente. Sem esses docs, o agente de IA opera sem contexto de arquitetura, convenções de commit, fluxo de desenvolvimento e definição de pronto — reduzindo a eficácia dos guardrails instalados nos Batches anteriores.

## What Changes

- Criar 10 arquivos Markdown de referência em `pscode/content/dixi/context/`, organizados em `shared/`, `java/` e `react/`
- `shared/` contém docs agnósticos de stack: commits, DoD, dev-flow e pr-flow
- `java/` contém docs específicos Java/Spring: architecture, testing e naming
- `react/` contém docs específicos React/Next.js: architecture, testing e naming
- A instalação via `installDixiExtras` (Batch B) copia `shared/` sempre e a pasta de stack correspondente (`java/` ou `react/`) conforme `family` detectado no `.pscode-dixi.yaml`
- Destino nos repos dos clientes: `pastelsdd/context/`

## Capabilities

### New Capabilities

- `dixi-context-shared`: Docs de referência compartilhados entre stacks — convenções de commit (Conventional Commits + ticket JIRA obrigatório), Definition of Done por tipo de entrega, fluxo RFC→Design→Tasks→Apply, e processo de PR/revisão
- `dixi-context-java`: Docs de referência específicos Java/Spring — arquitetura hexagonal com pacotes obrigatórios e regras de dependência, pirâmide de testes (JUnit 5 + Testcontainers + RestAssured), convenções de nomenclatura por camada
- `dixi-context-react`: Docs de referência específicos React/Next.js — feature-sliced design adaptado com camadas e estrutura de feature, pirâmide de testes (Vitest + RTL + Playwright), convenções de nomenclatura (componentes, hooks, services, arquivos)
- `dixi-context-install`: Lógica de instalação dos docs em `installDixiExtras` — sempre copia `shared/`, copia `java/` ou `react/` conforme `family`, trata `null`/`'node'` copiando apenas shared com aviso

### Modified Capabilities

_(nenhuma — esta change adiciona conteúdo novo, sem alterar specs existentes)_

## Impact

- Novos arquivos em `pscode/content/dixi/context/` (não afeta código compilado)
- `src/commands/init.ts` → função `installDixiExtras`: adiciona lógica de cópia dos docs de contexto
- Nenhuma mudança de API pública do CLI
- Changeset: `minor`
