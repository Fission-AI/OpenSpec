## Why

O perfil `dixi` já instala hooks de arquitetura (Batch G) e templates de documentação (Batches C/D), mas ainda não provê os arquivos de qualidade SDLC — commitlint, editorconfig, PR template e pipeline CI/CD — que diferem entre stacks Java/Spring e React/Next.js. Sem esse kit, times Dixi precisam configurar manualmente cada repo, perdendo a consistência que o perfil promete.

## What Changes

- Criar conteúdo estático em `pscode/content/dixi/kit/shared/` com arquivos compartilhados por ambas as stacks: `.commitlintrc.yml` e `.github/pull_request_template.md`
- Criar conteúdo estático em `pscode/content/dixi/kit/java/` com `.editorconfig` (Java), `.husky/commit-msg` e `.github/workflows/ci-java.yml` (build → test → archunit → coverage com Jacoco)
- Criar conteúdo estático em `pscode/content/dixi/kit/react/` com `.editorconfig` (TS/CSS), `.husky/commit-msg`, `.husky/pre-commit`, `lint-staged.config.mjs` e `.github/workflows/ci-react.yml` (typecheck → lint → test → build → e2e opcional)
- Atualizar `installDixiExtras` (implementado no Batch B) para copiar `shared/` sempre e copiar `java/` ou `react/` com base em `family` detectado em `.pscode-dixi.yaml`; brownfield-safe (não sobrescreve arquivos existentes, exceto PR template)
- Exibir instrução pós-instalação com dependências npm/Maven necessárias

## Capabilities

### New Capabilities

- `dixi-sdlc-kit-shared`: Arquivos de qualidade compartilhados entre stacks — commitlint config (conventional commits + warning para ticket JIRA) e PR template padronizado
- `dixi-sdlc-kit-java`: Kit SDLC específico Java — editorconfig (4 espaços, LF), husky commit-msg hook, workflow CI com build/test/ArchUnit/coverage
- `dixi-sdlc-kit-react`: Kit SDLC específico React/Next.js — editorconfig (2 espaços), husky commit-msg + pre-commit com lint-staged, workflow CI com typecheck/lint/test/build/e2e condicional

### Modified Capabilities

- `dixi-init-extras`: `installDixiExtras` passa a copiar o kit SDLC correspondente à stack detectada após instalar hooks (adicionado no Batch G)

## Impact

- **Arquivos novos**: `pscode/content/dixi/kit/shared/`, `pscode/content/dixi/kit/java/`, `pscode/content/dixi/kit/react/` (conteúdo estático de templates)
- **Arquivos modificados**: `src/core/profiles/dixi/install-extras.ts` (ou equivalente Batch B) — lógica de cópia por `family`
- **Sem novas dependências de runtime**: conteúdo é arquivos estáticos copiados para o repo do cliente
- **Prerequisito**: `.pscode-dixi.yaml` com `family: java | react` (ausência pula instalação do kit stack-específico, só instala shared)
- **Changeset**: `minor`
