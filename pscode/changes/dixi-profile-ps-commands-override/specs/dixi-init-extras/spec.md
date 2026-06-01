## MODIFIED Requirements

### Requirement: installDixiExtras como ponto de extensão placeholder
O sistema SHALL fornecer a função `installDixiExtras(projectDir, stack)` que copia context docs de stack para `pastelsdd/context/` **e** instala overrides de comandos `/ps:*` e comandos exclusivos `/pstld:*` no adapter Claude do `projectDir`.

#### Scenario: installDixiExtras instala context docs e command overrides
- **WHEN** `installDixiExtras(projectDir, 'java-maven')` é chamado
- **THEN** o sistema SHALL copiar os context docs Java para `pastelsdd/context/` e copiar os command overrides Dixi para `.claude/commands/ps/` e `.claude/commands/pstld/`

#### Scenario: installDixiExtras com stack nula instala apenas shared docs e commands
- **WHEN** `installDixiExtras(projectDir, null)` é chamado
- **THEN** o sistema SHALL copiar apenas os context docs shared para `pastelsdd/context/`, logar aviso de stack não detectada, e ainda assim instalar os command overrides em `.claude/commands/ps/` e `.claude/commands/pstld/`
