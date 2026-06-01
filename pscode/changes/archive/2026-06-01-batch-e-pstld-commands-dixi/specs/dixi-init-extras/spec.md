## MODIFIED Requirements

### Requirement: installDixiExtras copia slash commands para .claude/commands/pstld/
A função `installDixiExtras(projectDir, stack)` SHALL criar o diretório `.claude/commands/pstld/` na raiz do projeto cliente e copiar os 5 arquivos de comando (rfc.md, arch-check.md, adr.md, jira-sync.md, dod.md) de `pscode/content/dixi/claude-runtime/commands/` para esse diretório.

#### Scenario: Diretório .claude/commands/pstld/ criado após installDixiExtras
- **WHEN** `installDixiExtras` for chamado em qualquer projectDir
- **THEN** `.claude/commands/pstld/` SHALL existir na raiz de projectDir após a execução

#### Scenario: Os 5 arquivos de comando estão presentes após installDixiExtras
- **WHEN** `installDixiExtras` for chamado em qualquer projectDir
- **THEN** os arquivos rfc.md, arch-check.md, adr.md, jira-sync.md e dod.md SHALL existir em `.claude/commands/pstld/`

#### Scenario: Instalação é idempotente — reexecução não duplica nem corrompe arquivos
- **WHEN** `installDixiExtras` for chamado mais de uma vez no mesmo projectDir
- **THEN** `.claude/commands/pstld/` SHALL conter exatamente os 5 arquivos sem duplicatas ou arquivos corrompidos

#### Scenario: Instalação funciona independentemente da stack detectada
- **WHEN** `installDixiExtras` for chamado com qualquer valor de stack (java-maven, next, react, node, null)
- **THEN** os 5 arquivos de comando SHALL ser copiados — a instalação dos commands não depende de family
