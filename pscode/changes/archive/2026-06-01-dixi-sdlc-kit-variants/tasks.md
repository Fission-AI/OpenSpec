## 1. Conteúdo estático — kit shared

- [x] 1.1 Criar `pscode/content/dixi/kit/shared/.commitlintrc.yml` com `extends: @commitlint/config-conventional`, `subject-case: [2, always, lower-case]` e regra de warning para ticket JIRA `[A-Z]+-\d+`
- [x] 1.2 Criar `pscode/content/dixi/kit/shared/.github/pull_request_template.md` com seções: O que muda, Por que (contexto + ticket), Como testar, Checklist

## 2. Conteúdo estático — kit Java

- [x] 2.1 Criar `pscode/content/dixi/kit/java/.editorconfig` com regras para `*.java` (indent=4, charset=utf-8, eol=lf), `*.{yml,yaml}` (indent=2), `*.xml` (indent=4), `*.properties` (indent=4)
- [x] 2.2 Criar `pscode/content/dixi/kit/java/.husky/commit-msg` com `npx --no-install commitlint --edit "$1"`
- [x] 2.3 Criar `pscode/content/dixi/kit/java/.github/workflows/ci-java.yml` com jobs: `build` (setup-java@v4 Java 21 temurin + cache Maven + `mvn compile`), `test` (`mvn test`), `archunit` (`mvn test -Dtest=ArchitectureTest`), `coverage` (`mvn jacoco:report` + upload artifact); trigger em push/PR para `main` e `develop`

## 3. Conteúdo estático — kit React/Next.js

- [x] 3.1 Criar `pscode/content/dixi/kit/react/.editorconfig` com regras para `*.{ts,tsx,js,jsx}` (indent=2, charset=utf-8), `*.{css,scss}` (indent=2), `*.{json,yml,yaml,md}` (indent=2)
- [x] 3.2 Criar `pscode/content/dixi/kit/react/.husky/commit-msg` com `npx --no-install commitlint --edit "$1"`
- [x] 3.3 Criar `pscode/content/dixi/kit/react/.husky/pre-commit` com `npx --no-install lint-staged`
- [x] 3.4 Criar `pscode/content/dixi/kit/react/lint-staged.config.mjs` configurando `*.{ts,tsx}` → `[eslint --fix, prettier --write]` e `*.{css,scss,md,json}` → `[prettier --write]`
- [x] 3.5 Criar `pscode/content/dixi/kit/react/.github/workflows/ci-react.yml` com jobs: `typecheck` (Node 20 + npm cache + `npx tsc --noEmit`), `lint` (`npm run lint`), `test` (`npm test`), `build` (`npm run build`), `e2e` (condicional via `hashFiles('playwright.config.ts') != ''`); trigger em push/PR para `main` e `develop`

## 4. Lógica de instalação em installDixiExtras

- [x] 4.1 Adicionar função auxiliar `copyKitFiles(sourceDir, targetDir, options: { overwrite?: string[] })` que copia recursivamente arquivos de `sourceDir` para `targetDir`, respeitando brownfield-safety (não sobrescreve por padrão; sobrescreve arquivos listados em `overwrite`)
- [x] 4.2 Estender `installDixiExtras` para copiar `pscode/content/dixi/kit/shared/` com `overwrite: ['pull_request_template.md']` independente de `family`
- [x] 4.3 Estender `installDixiExtras` para copiar `pscode/content/dixi/kit/java/` quando `family === 'java'`
- [x] 4.4 Estender `installDixiExtras` para copiar `pscode/content/dixi/kit/react/` quando `family === 'react'`
- [x] 4.5 Exibir mensagem pós-instalação Java: instruções para adicionar `commitlint`, Jacoco e `husky` ao `pom.xml`
- [x] 4.6 Exibir mensagem pós-instalação React: instrução para rodar `npm install --save-dev @commitlint/cli @commitlint/config-conventional husky lint-staged prettier eslint` e `npx husky install`

## 5. Testes

- [x] 5.1 Adicionar teste de integração: `pscode init --profile dixi` em projeto Java → `.commitlintrc.yml`, `.editorconfig` (4 espaços), `.github/workflows/ci-java.yml` e `.github/pull_request_template.md` gerados
- [x] 5.2 Adicionar teste de integração: `pscode init --profile dixi` em projeto React → `.commitlintrc.yml`, `.editorconfig` (2 espaços), `lint-staged.config.mjs`, `.github/workflows/ci-react.yml` e `.github/pull_request_template.md` gerados
- [x] 5.3 Adicionar teste de integração: `family` ausente em `.pscode-dixi.yaml` → apenas `shared/` instalado, sem erro
- [x] 5.4 Adicionar teste de brownfield-safety: arquivo existente não é sobrescrito (exceto `pull_request_template.md`)

## 6. Changeset e validação final

- [x] 6.1 Rodar `pnpm test` e confirmar todos os testes passando
- [x] 6.2 Criar changeset `minor` via `pnpm changeset` descrevendo a adição do kit SDLC Dixi com variantes Java e React
