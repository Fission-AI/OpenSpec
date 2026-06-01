# Spec: dixi-claude-md-java

## Purpose

Defines the constitutional CLAUDE.md template for Java/Spring projects with hexagonal architecture, providing concise rules and pointers to full reference docs.

## Requirements

### Requirement: Template CLAUDE.md para stack Java/Spring
O sistema SHALL fornecer o arquivo `pscode/content/dixi/claude-runtime/CLAUDE.md.java.template` como template constitucional (~100 linhas) para projetos Java/Spring com arquitetura hexagonal. O template SHALL cobrir: regras de arquitetura hexagonal com as 3 camadas obrigatórias, regras de imports entre camadas, nomenclatura por camada, padrão de commits com ticket JIRA, e ponteiros para `pastelsdd/context/` onde ficam os docs de referência completos (instalados pelo Batch C).

#### Scenario: Template contém regras de arquitetura hexagonal
- **WHEN** o arquivo `CLAUDE.md.java.template` é lido
- **THEN** ele SHALL conter as 3 camadas (`domain`, `application`, `infrastructure`) e a regra de dependência unidirecional (`infra → app → domain`)

#### Scenario: Template é conciso
- **WHEN** o arquivo `CLAUDE.md.java.template` é lido
- **THEN** ele SHALL ter no máximo 120 linhas e NÃO SHALL conter detalhes técnicos completos — apenas regras invioláveis e ponteiros para `pastelsdd/context/`

#### Scenario: Template referencia docs de contexto
- **WHEN** o arquivo `CLAUDE.md.java.template` é lido
- **THEN** ele SHALL referenciar `pastelsdd/context/java/architecture.md`, `pastelsdd/context/java/naming.md`, `pastelsdd/context/shared/commits.md` e `pastelsdd/context/shared/dev-flow.md`
