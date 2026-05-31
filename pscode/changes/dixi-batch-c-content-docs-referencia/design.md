## Context

O perfil `dixi` do pscode instala guardrails arquiteturais (hooks, skills, CLAUDE.md) nos Batches anteriores, mas o agente de IA opera sem documentação de contexto no repositório do cliente. Os hooks de arquitetura (Batch G) e as skills (Batch F) referenciam `pastelsdd/context/` como fonte de verdade para regras — sem esses arquivos o link fica quebrado.

Esta change adiciona os arquivos de conteúdo que preenchem `pscode/content/dixi/context/` e define a lógica de instalação que os copia para `pastelsdd/context/` nos repos dos clientes durante `pscode init --profile dixi`.

## Goals / Non-Goals

**Goals:**
- Criar 10 arquivos Markdown de referência técnica em `pscode/content/dixi/context/{shared,java,react}/`
- Definir lógica de instalação em `installDixiExtras` que copia shared sempre + pasta de stack conforme `family`
- Manter brownfield-safe: não sobrescrever arquivos existentes em `pastelsdd/context/`
- Garantir que os docs instalados funcionem como contexto para hooks e skills dos Batches F e G

**Non-Goals:**
- Gerar os docs dinamicamente em runtime (são estáticos)
- Traduzir ou adaptar os docs após instalação
- Criar lógica de atualização/sync (a instalação é one-time)
- Cobrir stack `node` com docs específicos (apenas aviso)

## Decisions

### Estrutura de diretórios: `shared/` + `java/` + `react/`

Separar em três diretórios em vez de um único flat permite que a instalação copie seletivamente por stack sem lógica condicional por arquivo. O código de instalação fica: sempre copia `shared/`, condicionalmente copia `java/` ou `react/`.

Alternativa considerada: nomes de arquivo com sufixo (ex: `architecture.java.md`) — rejeitada porque complica o destino e a leitura do agente no repo do cliente.

### Destino: `pastelsdd/context/` (não `.claude/`)

Os docs de contexto são referências para o agente e para humanos — devem estar versionados numa pasta visível, não escondidos em `.claude/`. Outros Batches (F e G) já apontam para `pastelsdd/context/` em seus prompts.

### Markdown puro, sem templates de variável

Os docs são instalados como texto final. Usar variáveis (ex: `{basePackage}`) tornaria a instalação mais complexa sem ganho proporcional — o agente consegue inferir o contexto do projeto ao ler o arquivo.

Alternativa considerada: templates com substituição de variáveis — rejeitada para manter o código de instalação simples (cp de arquivo, sem interpolação).

### Brownfield-safe: skip se arquivo existir

A instalação verifica `existsSync` antes de copiar cada arquivo. O objetivo é não sobrescrever customizações do time. Exceção: `pr-flow.md` pode ser reinstalado se vazio (decisão de implementação).

### `family === null` ou `'node'`: copia apenas shared com aviso

Projetos sem stack detectada ainda se beneficiam dos docs compartilhados (commits, DoD, pr-flow, dev-flow). O aviso orienta o desenvolvedor a configurar `family` em `.pscode-dixi.yaml`.

## Risks / Trade-offs

- [Docs ficam desatualizados] → Os arquivos são copiados once no `init`; atualizações do template não propagam para repos existentes. Mitigação: documentar que re-run de `pscode init --profile dixi` pode ser feito manualmente; versão futura pode ter `pscode update --profile dixi`.
- [Conflito com documentação existente do time] → Brownfield-safe (skip se existe) evita sobrescrever. Mitigação aceitável.
- [Stack não detectada] → Aviso claro + instalação parcial (shared apenas) mantém o valor mínimo.

## Migration Plan

Nenhuma migração necessária — change additive. Repos que já rodaram `pscode init --profile dixi` não recebem os docs automaticamente; equipe deve re-rodar o init ou copiar manualmente de `pscode/content/dixi/context/`.

## Open Questions

_(nenhuma — escopo bem definido pelo rascunho do Batch C)_
