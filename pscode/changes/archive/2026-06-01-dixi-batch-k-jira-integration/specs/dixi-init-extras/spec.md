## MODIFIED Requirements

### Requirement: installDixiExtras como ponto de extensão placeholder
O sistema SHALL fornecer a função `installDixiExtras(projectDir, stack)` que cria `.claude/commands/pstld/` no `projectDir` e copia os 7 arquivos de slash command dixi: `rfc.md`, `arch-check.md`, `adr.md`, `jira-sync.md`, `dod.md`, `jira-draft.md` e `jira-setup.md`.

#### Scenario: Instalação completa dos 7 slash commands
- **WHEN** `installDixiExtras(projectDir, 'java-maven')` é chamado
- **THEN** o diretório `.claude/commands/pstld/` é criado no `projectDir` e os 7 arquivos (`rfc.md`, `arch-check.md`, `adr.md`, `jira-sync.md`, `dod.md`, `jira-draft.md`, `jira-setup.md`) são copiados para ele

#### Scenario: Instalação com stack nula instala todos os comandos
- **WHEN** `installDixiExtras(projectDir, null)` é chamado
- **THEN** os mesmos 7 arquivos são instalados independentemente da stack, pois os comandos são agnósticos de stack

#### Scenario: Comandos jira-draft e jira-setup presentes após instalação
- **WHEN** `installDixiExtras` é executado com sucesso
- **THEN** `jira-draft.md` e `jira-setup.md` existem em `.claude/commands/pstld/` do projeto cliente
