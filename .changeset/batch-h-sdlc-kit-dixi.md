---
"pscode": minor
---

Adiciona kit SDLC Dixi com variantes por stack (Java/Spring e React/Next.js):

- **Kit shared** (instalado para qualquer stack): `.commitlintrc.yml` com conventional commits + warning JIRA via `commitlint-plugin-jira-rules`; `.github/pull_request_template.md` com seções padronizadas (sempre sobrescrito).

- **Kit Java** (`family: java`): `.editorconfig` (indent=4, LF para Java/XML/properties); `.husky/commit-msg`; `.github/workflows/ci-java.yml` com jobs `build → test → archunit → coverage` (Jacoco, Java 21 Temurin, Maven cache).

- **Kit React** (`family: react`): `.editorconfig` (indent=2 para TS/CSS/JSON); `.husky/commit-msg` + `.husky/pre-commit`; `lint-staged.config.mjs`; `.github/workflows/ci-react.yml` com jobs `typecheck → lint → test → build → e2e` (e2e condicional via `hashFiles('playwright.config.ts')`).

`installDixiExtras` estendido com `copyKitFiles` (brownfield-safe: não sobrescreve arquivos existentes, exceto `pull_request_template.md`). Exibe mensagem pós-instalação com dependências npm/Maven necessárias.
