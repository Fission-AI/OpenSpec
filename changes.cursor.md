# changes.cursor.md

Registro de alterações para dar continuidade entre sessões.

---

## 2026-08-07 — Clone do repositório OpenSpec

- Diretório de destino já continha `.remember/`, então `git clone` direto falhava
  (`destination path '.' already exists and is not an empty directory`).
- Solução equivalente aplicada: `git init` + `git remote add origin
  git@github.com:jassonjunior/OpenSpec.git` + `git fetch` + `git checkout main`.
- HEAD: `0ca7476 fix windows workspace data dir paths (#1038)`, branch `main`
  rastreando `origin/main`. `.remember/` permaneceu intacta e não versionada.

---

## 2026-08-07 — Schema `spec-driven-tdd` trazido para o repositório

### Objetivo
Versionar no repo o schema `spec-driven-tdd` que existia apenas no ambiente
global, para commitar e o time usar.

### Origem
`~/.claude/skills/athionspec/assets/schemas/spec-driven-tdd/`
(5 arquivos: `schema.yaml` + `templates/{proposal,spec,design,tasks}.md`)

Esse caminho fica **fora** das três camadas que a CLI resolve, por isso a CLI
não enxergava o schema.

### Como a CLI resolve schemas
`src/core/artifact-graph/resolver.ts:52-54` — ordem de precedência:

1. **Projeto**: `<projectRoot>/openspec/schemas/<nome>/schema.yaml`
2. **Usuário**: `$XDG_DATA_HOME/openspec/schemas/<nome>/schema.yaml`
3. **Built-in do pacote**: `<package>/schemas/<nome>/schema.yaml`

Não existe registro hardcoded — a descoberta é por varredura de diretório
(`resolver.ts:157-205`). Basta a pasta existir com `schema.yaml`.

### Decisão tomada
Colocado na camada **projeto**: `openspec/schemas/spec-driven-tdd/`.

Motivo: fica versionado neste repositório e vale para quem clona, sem alterar o
pacote publicado no npm. A alternativa descartada era `schemas/` na raiz — essa
pasta está em `package.json:files`, ou seja, viraria schema built-in distribuído
a todos os usuários da CLI, o que é mudança de produto (pediria PR/testes).

### Arquivos criados
```
openspec/schemas/spec-driven-tdd/
  schema.yaml
  templates/proposal.md
  templates/spec.md
  templates/design.md
  templates/tasks.md
```

### Validação executada
```
npm run build
node bin/openspec.js schemas
```
Saída confirma: `spec-driven-tdd (project)` — "Fusão de spec-driven + qa -
proposal → BDD specs → design → tasks TDD (test-first) → apply".
Também verificado com `git check-ignore` que os arquivos NÃO estão ignorados.

### Pendente / decisão em aberto
- `openspec/config.yaml` continua com `schema: spec-driven`. **Não foi
  alterado.** Trocar para `spec-driven-tdd` mudaria o workflow padrão de todo o
  repositório (que é o próprio upstream do OpenSpec) — decisão do usuário.
- Commit ainda não realizado.
