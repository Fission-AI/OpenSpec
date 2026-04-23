<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec">
    <picture>
      <source srcset="assets/openspec_bg.png">
      <img src="assets/openspec_bg.png" alt="OpenSpec logo">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Fission-AI/OpenSpec/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/@fission-ai/openspec"><img alt="npm version" src="https://img.shields.io/npm/v/@fission-ai/openspec?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" /></a>
  <a href="https://discord.gg/YctCnvvshC"><img alt="Discord" src="https://img.shields.io/discord/1411657095639601154?style=flat-square&logo=discord&logoColor=white&label=Discord&suffix=%20online" /></a>
</p>

<details>
<summary><strong>O framework de spec mais querido.</strong></summary>

[![Stars](https://img.shields.io/github/stars/Fission-AI/OpenSpec?style=flat-square&label=Stars)](https://github.com/Fission-AI/OpenSpec/stargazers)
[![Downloads](https://img.shields.io/npm/dm/@fission-ai/openspec?style=flat-square&label=Downloads/mo)](https://www.npmjs.com/package/@fission-ai/openspec)
[![Contributors](https://img.shields.io/github/contributors/Fission-AI/OpenSpec?style=flat-square&label=Contributors)](https://github.com/Fission-AI/OpenSpec/graphs/contributors)

</details>
<p></p>
Nossa filosofia:

```text
→ fluid not rigid
→ iterative not waterfall
→ easy not complex
→ built for brownfield not just greenfield
→ scalable from personal projects to enterprises
```

> [!TIP]
> **Novo fluxo de trabalho disponível!** Reconstruímos o OpenSpec com um novo fluxo de trabalho guiado por artefatos.
>
> Execute `/opsx:propose "sua ideia"` para começar. → [Saiba mais aqui](docs/pt-BR/opsx.md)

<p align="center">
  Siga <a href="https://x.com/0xTab">@0xTab no X</a> para atualizações · Entre no <a href="https://discord.gg/YctCnvvshC">Discord do OpenSpec</a> para ajuda e dúvidas.
</p>

<!-- TODO: Add GIF demo of /opsx:propose → /opsx:archive workflow -->

## Veja em ação

```text
Você: /opsx:propose add-dark-mode
IA:   Criado openspec/changes/add-dark-mode/
      ✓ proposal.md — por que estamos fazendo isso, o que está mudando
      ✓ specs/       — requisitos e cenários
      ✓ design.md    — abordagem técnica
      ✓ tasks.md     — checklist de implementação
      Pronto para implementação!

Você: /opsx:apply
IA:   Implementando tarefas...
      ✓ 1.1 Adicionar provedor de contexto de tema
      ✓ 1.2 Criar componente de alternância
      ✓ 2.1 Adicionar variáveis CSS
      ✓ 2.2 Conectar localStorage
      Todas as tarefas concluídas!

Você: /opsx:archive
IA:   Arquivado em openspec/changes/archive/2025-01-23-add-dark-mode/
      Specs atualizadas. Pronto para a próxima funcionalidade.
```

<details>
<summary><strong>Dashboard do OpenSpec</strong></summary>

<p align="center">
  <img src="assets/openspec_dashboard.png" alt="OpenSpec dashboard preview" width="90%">
</p>

</details>

## Início Rápido

**Requer Node.js 20.19.0 ou superior.**

Instale o OpenSpec globalmente:

```bash
npm install -g @fission-ai/openspec@latest
```

Em seguida, navegue até o diretório do seu projeto e inicialize:

```bash
cd your-project
openspec init
```

Agora diga à sua IA: `/opsx:propose <o-que-você-quer-construir>`

Se você quiser o fluxo de trabalho expandido (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:sync`, `/opsx:bulk-archive`, `/opsx:onboard`), selecione-o com `openspec config profile` e aplique com `openspec update`.

> [!NOTE]
> Não tem certeza se sua ferramenta é suportada? [Veja a lista completa](docs/pt-BR/supported-tools.md) – suportamos mais de 25 ferramentas e crescendo.
>
> Também funciona com pnpm, yarn, bun e nix. [Veja as opções de instalação](docs/pt-BR/installation.md).

## Documentação

→ **[Primeiros Passos](docs/pt-BR/getting-started.md)**: primeiros passos<br>
→ **[Fluxos de Trabalho](docs/pt-BR/workflows.md)**: combinações e padrões<br>
→ **[Comandos](docs/pt-BR/commands.md)**: slash commands e skills<br>
→ **[CLI](docs/pt-BR/cli.md)**: referência do terminal<br>
→ **[Ferramentas Suportadas](docs/pt-BR/supported-tools.md)**: integrações e caminhos de instalação<br>
→ **[Conceitos](docs/pt-BR/concepts.md)**: como tudo se encaixa<br>
→ **[Multi-Idioma](docs/pt-BR/multi-language.md)**: suporte a múltiplos idiomas<br>
→ **[Personalização](docs/pt-BR/customization.md)**: faça do seu jeito


## Por que o OpenSpec?

Assistentes de codificação com IA são poderosos, mas imprevisíveis quando os requisitos vivem apenas no histórico do chat. O OpenSpec adiciona uma camada leve de especificação para que você concorde sobre o que construir antes de qualquer código ser escrito.

- **Alinhe antes de construir** — humano e IA alinham as specs antes de o código ser escrito
- **Mantenha-se organizado** — cada mudança tem sua própria pasta com proposta, specs, design e tarefas
- **Trabalhe com fluidez** — atualize qualquer artefato a qualquer momento, sem fases rígidas
- **Use suas ferramentas** — funciona com mais de 20 assistentes de IA via slash commands

### Como nos comparamos

**vs. [Spec Kit](https://github.com/github/spec-kit)** (GitHub) — Completo, mas pesado. Fases rígidas, muito Markdown, configuração em Python. O OpenSpec é mais leve e permite iterar livremente.

**vs. [Kiro](https://kiro.dev)** (AWS) — Poderoso, mas você fica preso à IDE deles e limitado aos modelos Claude. O OpenSpec funciona com as ferramentas que você já usa.

**vs. nada** — Codificação com IA sem specs significa prompts vagos e resultados imprevisíveis. O OpenSpec traz previsibilidade sem a burocracia.

## Atualizando o OpenSpec

**Atualize o pacote**

```bash
npm install -g @fission-ai/openspec@latest
```

**Atualize as instruções do agente**

Execute dentro de cada projeto para regenerar a orientação da IA e garantir que os slash commands mais recentes estejam ativos:

```bash
openspec update
```

## Notas de Uso

**Seleção de modelo**: O OpenSpec funciona melhor com modelos de alto raciocínio. Recomendamos Opus 4.5 e GPT 5.2 tanto para planejamento quanto para implementação.

**Higiene de contexto**: O OpenSpec se beneficia de uma janela de contexto limpa. Limpe seu contexto antes de iniciar a implementação e mantenha uma boa higiene de contexto ao longo da sua sessão.

## Contribuindo

**Pequenas correções** — Correções de bugs, erros de digitação e melhorias menores podem ser enviadas diretamente como PRs.

**Mudanças maiores** — Para novas funcionalidades, refatorações significativas ou mudanças arquiteturais, envie primeiro uma proposta de mudança do OpenSpec para que possamos alinhar a intenção e os objetivos antes de começar a implementação.

Ao escrever propostas, tenha em mente a filosofia do OpenSpec: servimos a uma grande variedade de usuários em diferentes agentes de codificação, modelos e casos de uso. As mudanças devem funcionar bem para todos.

**Código gerado por IA é bem-vindo** — desde que tenha sido testado e verificado. PRs contendo código gerado por IA devem mencionar o agente de codificação e o modelo usado (ex.: "Gerado com Claude Code usando claude-opus-4-5-20251101").

### Desenvolvimento

- Instalar dependências: `pnpm install`
- Compilar: `pnpm run build`
- Testar: `pnpm test`
- Desenvolver CLI localmente: `pnpm run dev` ou `pnpm run dev:cli`
- Commits convencionais (uma linha): `type(scope): subject`

## Outros

<details>
<summary><strong>Telemetria</strong></summary>

O OpenSpec coleta estatísticas de uso anônimas.

Coletamos apenas nomes de comandos e versão para entender padrões de uso. Sem argumentos, caminhos, conteúdo ou PII. Desativado automaticamente em CI.

**Desativar:** `export OPENSPEC_TELEMETRY=0` ou `export DO_NOT_TRACK=1`

</details>

<details>
<summary><strong>Mantenedores e Consultores</strong></summary>

Veja [MAINTAINERS.md](MAINTAINERS.md) para a lista de mantenedores principais e consultores que ajudam a guiar o projeto.

</details>



## Licença

MIT
