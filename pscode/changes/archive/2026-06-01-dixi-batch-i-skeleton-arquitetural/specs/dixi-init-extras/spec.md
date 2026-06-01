## MODIFIED Requirements

### Requirement: `installDixiExtras` aplica extras condicionais por stack
A função `installDixiExtras` SHALL aplicar os extras do profile `dixi` em ordem: (1) kit SDLC por stack (Batch H), (2) skeleton arquitetural por stack (Batch I), (3) integração JIRA se configurada (Batch J). Cada etapa é condicional a `family` e brownfield-safe.

#### Scenario: Projeto Java recebe kit SDLC e skeleton hexagonal
- **WHEN** `installDixiExtras` é chamado com `family === 'java'`
- **THEN** o kit SDLC Java é instalado (Batch H) E o skeleton hexagonal é criado (Batch I)

#### Scenario: Projeto React recebe kit SDLC e skeleton feature-sliced
- **WHEN** `installDixiExtras` é chamado com `family === 'react'`
- **THEN** o kit SDLC React é instalado (Batch H) E o skeleton feature-sliced é criado (Batch I)

#### Scenario: Stack não reconhecida não aplica skeleton
- **WHEN** `installDixiExtras` é chamado com `family` diferente de `'java'` e `'react'`
- **THEN** nenhum skeleton é criado e uma mensagem informa que o skeleton não está disponível para a stack detectada

## ADDED Requirements

### Requirement: Ordem de instalação é documentada e estável
A função `installDixiExtras` SHALL executar as etapas de instalação em ordem determinística e logar cada etapa (nome + resultado: criado / ignorado / erro) para permitir diagnóstico.

#### Scenario: Log de instalação exibe resultado por etapa
- **WHEN** `pscode init --profile dixi` é executado com sucesso
- **THEN** a saída exibe uma linha por etapa no formato `[dixi] <etapa>: <resultado>` (ex: `[dixi] skeleton hexagonal: 10 diretórios criados, 1 arquivo ignorado`)
