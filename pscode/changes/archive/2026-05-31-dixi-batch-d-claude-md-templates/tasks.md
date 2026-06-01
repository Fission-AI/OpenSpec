## 1. Templates CLAUDE.md

- [x] 1.1 Criar `pscode/content/dixi/claude-runtime/CLAUDE.md.java.template` com regras constitucionais de arquitetura hexagonal, nomenclatura por camada (domain/application/infrastructure), imports proibidos, padrão de commits e ponteiros para `pastelsdd/context/java/` e `pastelsdd/context/shared/`
- [x] 1.2 Criar `pscode/content/dixi/claude-runtime/CLAUDE.md.react.template` com regras constitucionais de feature-sliced design, proibição de import cruzado entre features, nomenclatura de componentes/hooks/services/arquivos, padrão de commits e ponteiros para `pastelsdd/context/react/` e `pastelsdd/context/shared/`
- [x] 1.3 Verificar que cada template tem no máximo 120 linhas e contém o marcador `<!-- dixi-constitutional -->` no início da seção

## 2. Lógica de Instalação em installDixiExtras

- [x] 2.1 Em `src/core/presets/dixi.ts`, adicionar função `installDixiClaudeMd(projectDir: string, family: string | null): void` que: seleciona o template pela `family`, lê o arquivo de template do bundle, verifica/merge em `CLAUDE.md` existente
- [x] 2.2 Implementar lógica de merge: se `CLAUDE.md` já existe e contém `<!-- dixi-constitutional -->` → pular com log; se existe mas não contém → appendar; se não existe → criar
- [x] 2.3 Implementar fallback: quando `family` não é `'java'` nem `'react'`, usar template Java e logar aviso `"Dixi: stack não detectada, instalando CLAUDE.md genérico (baseado em Java). Edite .pscode-dixi.yaml para corrigir."`
- [x] 2.4 Chamar `installDixiClaudeMd(projectDir, stack?.family ?? null)` dentro de `installDixiExtras` (remover ou manter o placeholder log do Batch B conforme convenção do projeto)

## 3. Inclusão no Bundle npm

- [x] 3.1 Verificar que `pscode/content/dixi/claude-runtime/` está listado no campo `files` de `package.json` (ou que o glob existente já o cobre)
- [x] 3.2 Confirmar que o caminho de leitura dos templates em runtime usa `new URL('../../../pscode/content/...', import.meta.url)` ou equivalente ESM-safe para funcionar tanto em dev quanto no pacote instalado

## 4. Testes

- [x] 4.1 Em `test/core/presets/dixi.test.ts` (ou arquivo de teste equivalente), adicionar testes para `installDixiClaudeMd`: criação quando não existe, merge quando existe sem marcador, idempotência quando marcador já está presente, fallback quando `family` é null
- [x] 4.2 Verificar que os testes existentes do Batch B continuam passando (`pnpm test`)

## 5. Changeset

- [x] 5.1 Criar changeset `minor` com sumário: `"dixi: instalar CLAUDE.md constitucional via pscode init --profile dixi (Batch D)"`
