## 1. Arquivos de hook — arch-guard.mjs

- [x] 1.1 Criar `pscode/content/dixi/claude-runtime/hooks/arch-guard.mjs` com leitura de `.pscode-dixi.yaml` via `node:fs` e gate de `exit 0` quando arquivo ausente
- [x] 1.2 Implementar lógica Java: detectar arquivos em `src/**/infrastructure/**` e verificar imports diretos de `domain/` sem port (regex sobre linhas de import)
- [x] 1.3 Implementar lógica React: detectar arquivos em `src/features/**` e verificar importações cruzadas entre subdiretórios de features distintos
- [x] 1.4 Implementar warning React: detectar uso combinado de `useState`+`useEffect` com corpo > 10 linhas em arquivos de `src/app/**` ou `src/pages/**` (`exit 1`)
- [x] 1.5 Garantir `exit 0` para todos os caminhos não cobertos pelas regras (arquivo fora de escopo)

## 2. Arquivos de hook — jira-context.mjs

- [x] 2.1 Criar `pscode/content/dixi/claude-runtime/hooks/jira-context.mjs` lendo stdin e detectando padrão `[A-Z]+-\d+`
- [x] 2.2 Implementar leitura de `pastelsdd/jira.yaml`; se ausente ou ticket não detectado → `exit 0` sem output
- [x] 2.3 Quando ticket detectado e `jira.yaml` presente, emitir bloco de contexto no stdout com `project_key` e `board_url`

## 3. Instalação via installDixiExtras

- [x] 3.1 Atualizar `installDixiExtras` para copiar `.claude/hooks/arch-guard.mjs` e `jira-context.mjs` (brownfield-safe: não sobrescrever se já existe)
- [x] 3.2 Implementar merge de `.claude/settings.json`: ler JSON existente (ou `{}`), adicionar entradas de hooks sem duplicar, gravar de volta
- [x] 3.3 Tratar erro de JSON inválido no `settings.json` existente: logar e criar novo arquivo

## 4. Testes — arch-guard.mjs

- [x] 4.1 Teste: `arch-guard` com Java + arquivo em `infrastructure/` + import direto de `domain/` → `exit 2`
- [x] 4.2 Teste: `arch-guard` com Java + arquivo em `infrastructure/` + import apenas de `domain/port/` → `exit 0`
- [x] 4.3 Teste: `arch-guard` com Java + arquivo fora de `infrastructure/` → `exit 0`
- [x] 4.4 Teste: `arch-guard` com React + arquivo em `src/features/a/` importando de `src/features/b/` → `exit 2`
- [x] 4.5 Teste: `arch-guard` com React + arquivo em `src/features/a/` importando de `src/shared/` → `exit 0`
- [x] 4.6 Teste: `arch-guard` sem `.pscode-dixi.yaml` → `exit 0`

## 5. Testes — jira-context.mjs

- [x] 5.1 Teste: prompt sem ticket → `exit 0`, stdout vazio
- [x] 5.2 Teste: prompt com ticket + `jira.yaml` ausente → `exit 0`, stdout vazio
- [x] 5.3 Teste: prompt com ticket + `jira.yaml` presente → stdout com contexto, `exit 0`

## 6. Testes — installDixiExtras

- [x] 6.1 Teste: `pscode init --profile dixi` em projeto vazio → `.claude/hooks/` criado com ambos os `.mjs`
- [x] 6.2 Teste: re-execução não duplica entradas em `settings.json`
- [x] 6.3 Teste: `settings.json` existente com hooks do usuário → entradas preservadas após merge

## 7. Changeset e validação

- [x] 7.1 Executar `pnpm test` e garantir todos os testes passando
- [x] 7.2 Criar changeset `minor` descrevendo os dois novos hooks e a atualização do `installDixiExtras`
