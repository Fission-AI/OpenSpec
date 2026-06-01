# Spec: dixi-context-shared

## Purpose

Define os arquivos de contexto compartilhados (independentes de stack) que o Dixi instala em `pastelsdd/context/` para todos os projetos. Esses arquivos documentam as convenções universais do workflow Dixi: commits, definition of done, fluxo de desenvolvimento e fluxo de PR.

## Requirements

### Requirement: Arquivo commits.md instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/shared/commits.md` com a convenção de commits Dixi: formato Conventional Commits obrigatório (`tipo(escopo): descrição [PROJ-123]`), tipos válidos (feat, fix, refactor, test, docs, chore), escopo igual ao módulo/bounded context/feature, mensagem no imperativo em português ou inglês (consistente no projeto), ticket JIRA obrigatório em todos os tipos exceto `docs` e `chore`.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/shared/` é inspecionado
- **THEN** o arquivo `commits.md` existe com as seções: formato do commit, tipos válidos, regra de escopo, regra de ticket JIRA

#### Scenario: Arquivo é copiado para o repo do cliente
- **WHEN** `pscode init --profile dixi` é executado em qualquer projeto Dixi
- **THEN** `pastelsdd/context/commits.md` existe no repo do cliente

### Requirement: Arquivo dod.md instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/shared/dod.md` com a Definition of Done por tipo de entrega: Feature (RFC aprovada, design revisado, tasks concluídas, testes verdes, PR aprovado, CHANGELOG atualizado), Bug Fix (root cause documentado, teste de regressão adicionado), Refactor (comportamento preservado, cobertura mantida).

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/shared/` é inspecionado
- **THEN** o arquivo `dod.md` existe com DoD para os três tipos: Feature, Bug Fix e Refactor

#### Scenario: Arquivo é copiado para o repo do cliente
- **WHEN** `pscode init --profile dixi` é executado
- **THEN** `pastelsdd/context/dod.md` existe no repo do cliente

### Requirement: Arquivo dev-flow.md instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/shared/dev-flow.md` descrevendo o fluxo RFC→Design→Tasks→Apply: quando criar RFC vs ir direto para task, como usar `/pstld:rfc`, quem revisa o design, como quebrar em tasks e como usar `/pstld:dod`.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/shared/` é inspecionado
- **THEN** o arquivo `dev-flow.md` existe com as seções: fluxo completo, critério de quando usar RFC, referências aos slash commands

#### Scenario: Arquivo é copiado para o repo do cliente
- **WHEN** `pscode init --profile dixi` é executado
- **THEN** `pastelsdd/context/dev-flow.md` existe no repo do cliente

### Requirement: Arquivo pr-flow.md instalado em pastelsdd/context/
O sistema SHALL criar `pscode/content/dixi/context/shared/pr-flow.md` com: template de PR (O que muda / Por que / Como testar / Checklist), processo de revisão, critérios de merge e como referenciar tickets JIRA no PR.

#### Scenario: Arquivo existe no pacote do pscode
- **WHEN** o diretório `pscode/content/dixi/context/shared/` é inspecionado
- **THEN** o arquivo `pr-flow.md` existe com template de PR e critérios de merge

#### Scenario: Arquivo é copiado para o repo do cliente
- **WHEN** `pscode init --profile dixi` é executado
- **THEN** `pastelsdd/context/pr-flow.md` existe no repo do cliente
