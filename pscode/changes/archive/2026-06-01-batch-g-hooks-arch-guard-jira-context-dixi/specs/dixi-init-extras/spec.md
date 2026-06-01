## ADDED Requirements

### Requirement: Instalação dos hooks durante pscode init --profile dixi
O comando `pscode init --profile dixi` SHALL copiar `arch-guard.mjs` e `jira-context.mjs` para `.claude/hooks/` no repo do cliente.

#### Scenario: Hooks copiados em novo projeto
- **WHEN** `pscode init --profile dixi` é executado em um projeto sem `.claude/hooks/`
- **THEN** o diretório `.claude/hooks/` é criado
- **AND** `arch-guard.mjs` e `jira-context.mjs` são copiados para `.claude/hooks/`

#### Scenario: Hooks já existentes não são sobrescritos
- **WHEN** `pscode init --profile dixi` é executado em um projeto que já possui `.claude/hooks/arch-guard.mjs`
- **THEN** o arquivo existente é mantido sem modificação (brownfield-safe)

---

### Requirement: Merge de .claude/settings.json ao registrar hooks
O comando `pscode init --profile dixi` SHALL fazer merge das entradas de hooks em `.claude/settings.json` sem sobrescrever configurações existentes.

#### Scenario: settings.json inexistente — criado com hooks
- **WHEN** `pscode init --profile dixi` é executado e `.claude/settings.json` não existe
- **THEN** um novo `settings.json` é criado com as entradas de hook `PreToolUse` (arch-guard) e `UserPromptSubmit` (jira-context)

#### Scenario: settings.json existente — merge não duplica entradas
- **WHEN** `.claude/settings.json` já existe com configurações de hooks do usuário
- **THEN** as entradas de arch-guard e jira-context são adicionadas apenas se ainda não existirem
- **AND** as configurações pré-existentes são preservadas integralmente

#### Scenario: settings.json com JSON inválido — log de erro e novo arquivo
- **WHEN** `.claude/settings.json` existe mas contém JSON inválido
- **THEN** o erro é logado no console
- **AND** um novo `settings.json` é criado com apenas as entradas dos hooks Dixi

---

### Requirement: Estrutura de hooks no settings.json
O `settings.json` gerado SHALL registrar `arch-guard.mjs` como hook `PreToolUse` com matcher para `Edit` e `Write`, e `jira-context.mjs` como hook `UserPromptSubmit`.

#### Scenario: Estrutura correta do settings.json após instalação
- **WHEN** `pscode init --profile dixi` completa a instalação
- **THEN** `.claude/settings.json` contém uma entrada `hooks` com:
  - `PreToolUse` matcher `Edit|Write` apontando para `.claude/hooks/arch-guard.mjs`
  - `UserPromptSubmit` apontando para `.claude/hooks/jira-context.mjs`
