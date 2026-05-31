## 1. Docs compartilhados (shared/)

- [ ] 1.1 Criar `pscode/content/dixi/context/shared/commits.md` com convenção Conventional Commits + ticket JIRA obrigatório (exceto docs/chore)
- [ ] 1.2 Criar `pscode/content/dixi/context/shared/dod.md` com DoD para Feature, Bug Fix e Refactor
- [ ] 1.3 Criar `pscode/content/dixi/context/shared/dev-flow.md` com fluxo RFC→Design→Tasks→Apply e referências aos slash commands
- [ ] 1.4 Criar `pscode/content/dixi/context/shared/pr-flow.md` com template de PR, processo de revisão e critérios de merge

## 2. Docs específicos Java (java/)

- [ ] 2.1 Criar `pscode/content/dixi/context/java/architecture.md` com arquitetura hexagonal, pacotes obrigatórios e regras de dependência
- [ ] 2.2 Criar `pscode/content/dixi/context/java/testing.md` com pirâmide de testes (JUnit 5 + Mockito / Testcontainers / RestAssured) e cobertura mínima 80%
- [ ] 2.3 Criar `pscode/content/dixi/context/java/naming.md` com convenções por camada (Domain / Application / Infrastructure)

## 3. Docs específicos React/Next.js (react/)

- [ ] 3.1 Criar `pscode/content/dixi/context/react/architecture.md` com feature-sliced design, camadas e estrutura interna de feature
- [ ] 3.2 Criar `pscode/content/dixi/context/react/testing.md` com pirâmide de testes (Vitest / RTL / Playwright)
- [ ] 3.3 Criar `pscode/content/dixi/context/react/naming.md` com convenções (PascalCase / camelCase / kebab-case / SCREAMING_SNAKE)

## 4. Lógica de instalação em installDixiExtras

- [ ] 4.1 Adicionar função auxiliar `copyContextDocs(destRoot, srcDir)` em `src/commands/init.ts` que copia arquivos com brownfield-safe (skip se existir)
- [ ] 4.2 Chamar `copyContextDocs` para `shared/` em todos os projetos Dixi, com aviso se `family` for null ou 'node'
- [ ] 4.3 Chamar `copyContextDocs` condicionalmente para `java/` quando `family === 'java'`
- [ ] 4.4 Chamar `copyContextDocs` condicionalmente para `react/` quando `family === 'react'`
- [ ] 4.5 Criar diretório `pastelsdd/context/` no repo do cliente se não existir

## 5. Testes

- [ ] 5.1 Adicionar teste em `test/commands/init.test.ts`: projeto Java recebe shared/ + java/ em `pastelsdd/context/`
- [ ] 5.2 Adicionar teste: projeto React recebe shared/ + react/ em `pastelsdd/context/`
- [ ] 5.3 Adicionar teste: projeto sem family recebe apenas shared/ + exibe aviso
- [ ] 5.4 Adicionar teste: arquivo existente não é sobrescrito (brownfield-safe)

## 6. Changeset e validação

- [ ] 6.1 Rodar `pnpm test` e garantir que todos os testes passam
- [ ] 6.2 Criar changeset `minor` para esta change com `pnpm changeset`
