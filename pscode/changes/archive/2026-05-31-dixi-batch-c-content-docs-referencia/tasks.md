## 1. Docs compartilhados (shared/)

- [x] 1.1 Criar `pscode/content/dixi/context/shared/commits.md` com convenção Conventional Commits + ticket JIRA obrigatório (exceto docs/chore)
- [x] 1.2 Criar `pscode/content/dixi/context/shared/dod.md` com DoD para Feature, Bug Fix e Refactor
- [x] 1.3 Criar `pscode/content/dixi/context/shared/dev-flow.md` com fluxo RFC→Design→Tasks→Apply e referências aos slash commands
- [x] 1.4 Criar `pscode/content/dixi/context/shared/pr-flow.md` com template de PR, processo de revisão e critérios de merge

## 2. Docs específicos Java (java/)

- [x] 2.1 Criar `pscode/content/dixi/context/java/architecture.md` com arquitetura hexagonal, pacotes obrigatórios e regras de dependência
- [x] 2.2 Criar `pscode/content/dixi/context/java/testing.md` com pirâmide de testes (JUnit 5 + Mockito / Testcontainers / RestAssured) e cobertura mínima 80%
- [x] 2.3 Criar `pscode/content/dixi/context/java/naming.md` com convenções por camada (Domain / Application / Infrastructure)

## 3. Docs específicos React/Next.js (react/)

- [x] 3.1 Criar `pscode/content/dixi/context/react/architecture.md` com feature-sliced design, camadas e estrutura interna de feature
- [x] 3.2 Criar `pscode/content/dixi/context/react/testing.md` com pirâmide de testes (Vitest / RTL / Playwright)
- [x] 3.3 Criar `pscode/content/dixi/context/react/naming.md` com convenções (PascalCase / camelCase / kebab-case / SCREAMING_SNAKE)

## 4. Lógica de instalação em installDixiExtras

- [x] 4.1 Adicionar função auxiliar `copyContextDocs(destRoot, srcDir)` em `src/commands/init.ts` que copia arquivos com brownfield-safe (skip se existir)
- [x] 4.2 Chamar `copyContextDocs` para `shared/` em todos os projetos Dixi, com aviso se `family` for null ou 'node'
- [x] 4.3 Chamar `copyContextDocs` condicionalmente para `java/` quando `family === 'java'`
- [x] 4.4 Chamar `copyContextDocs` condicionalmente para `react/` quando `family === 'react'`
- [x] 4.5 Criar diretório `pastelsdd/context/` no repo do cliente se não existir

## 5. Testes

- [x] 5.1 Adicionar teste em `test/commands/init.test.ts`: projeto Java recebe shared/ + java/ em `pastelsdd/context/`
- [x] 5.2 Adicionar teste: projeto React recebe shared/ + react/ em `pastelsdd/context/`
- [x] 5.3 Adicionar teste: projeto sem family recebe apenas shared/ + exibe aviso
- [x] 5.4 Adicionar teste: arquivo existente não é sobrescrito (brownfield-safe)

## 6. Changeset e validação

- [x] 6.1 Rodar `pnpm test` e garantir que todos os testes passam
- [x] 6.2 Criar changeset `minor` para esta change com `pnpm changeset`
