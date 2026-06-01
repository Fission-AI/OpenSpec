---
"@thiagodiogo/pscode": minor
---

Adiciona 10 docs de referência técnica para o perfil Dixi (`pscode/content/dixi/context/`) e a lógica de instalação brownfield-safe em `installDixiExtras`.

- 4 docs compartilhados: `commits.md`, `dod.md`, `dev-flow.md`, `pr-flow.md`
- 3 docs Java/Spring: `architecture.md` (hexagonal), `testing.md` (JUnit/Testcontainers/RestAssured), `naming.md`
- 3 docs React/Next.js: `architecture.md` (feature-sliced), `testing.md` (Vitest/RTL/Playwright), `naming.md`
- Nova função `copyContextDocs(destRoot, srcDir)` com brownfield-safe (skip se arquivo existir)
- `installDixiExtras` agora copia `shared/` sempre + `java/` ou `react/` conforme stack detectada
- Os docs são instalados em `pastelsdd/context/` no repo do cliente via `pscode init --profile dixi`
