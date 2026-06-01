# Spec: dixi-claude-md-react

## Purpose

Defines the constitutional CLAUDE.md template for React/Next.js + TypeScript projects with feature-sliced design, providing concise rules and pointers to full reference docs.

## Requirements

### Requirement: Template CLAUDE.md para stack React/Next.js
O sistema SHALL fornecer o arquivo `pscode/content/dixi/claude-runtime/CLAUDE.md.react.template` como template constitucional (~100 linhas) para projetos React/Next.js + TypeScript com feature-sliced design adaptado. O template SHALL cobrir: estrutura de camadas (`shared → entities → features → pages/app`), regra de não-importação cruzada entre features, nomenclatura de componentes/hooks/services/arquivos, padrão de commits com ticket JIRA, e ponteiros para `pastelsdd/context/` onde ficam os docs de referência completos (instalados pelo Batch C).

#### Scenario: Template contém regras de feature-sliced design
- **WHEN** o arquivo `CLAUDE.md.react.template` é lido
- **THEN** ele SHALL conter as camadas do feature-sliced design e a regra explícita de que features NÃO importam umas das outras

#### Scenario: Template é conciso
- **WHEN** o arquivo `CLAUDE.md.react.template` é lido
- **THEN** ele SHALL ter no máximo 120 linhas e NÃO SHALL conter detalhes técnicos completos — apenas regras invioláveis e ponteiros para `pastelsdd/context/`

#### Scenario: Template referencia docs de contexto
- **WHEN** o arquivo `CLAUDE.md.react.template` é lido
- **THEN** ele SHALL referenciar `pastelsdd/context/react/architecture.md`, `pastelsdd/context/react/naming.md`, `pastelsdd/context/shared/commits.md` e `pastelsdd/context/shared/dev-flow.md`
