# Conceitos

Este guia explica as ideias centrais do OpenSpec e como elas se encaixam. Para uso prático, consulte [Primeiros Passos](getting-started.md) e [Fluxos de Trabalho](workflows.md).

## Filosofia

O OpenSpec é construído em torno de quatro princípios:

```
fluid not rigid         — no phase gates, work on what makes sense
iterative not waterfall — learn as you build, refine as you go
easy not complex        — lightweight setup, minimal ceremony
brownfield-first        — works with existing codebases, not just greenfield
```

### Por Que Esses Princípios Importam

**Fluido, não rígido.** Sistemas de spec tradicionais prendem você em fases: primeiro você planeja, depois implementa, depois termina. O OpenSpec é mais flexível — você pode criar artefatos em qualquer ordem que faça sentido para o seu trabalho.

**Iterativo, não waterfall.** Os requisitos mudam. O entendimento se aprofunda. O que parecia uma boa abordagem no início pode não se sustentar após você ver o código. O OpenSpec abraça essa realidade.

**Fácil, não complexo.** Alguns frameworks de spec exigem configuração extensa, formatos rígidos ou processos pesados. O OpenSpec fica fora do seu caminho. Inicialize em segundos, comece a trabalhar imediatamente, personalize apenas se precisar.

**Brownfield-first.** A maior parte do trabalho de software não é construir do zero — é modificar sistemas existentes. A abordagem baseada em deltas do OpenSpec facilita a especificação de mudanças no comportamento existente, não apenas a descrição de novos sistemas.

## O Panorama Geral

O OpenSpec organiza seu trabalho em duas áreas principais:

```
┌────────────────────────────────────────────────────────────────────┐
│                        openspec/                                   │
│                                                                    │
│   ┌─────────────────────┐      ┌───────────────────────────────┐   │
│   │       specs/        │      │         changes/              │   │
│   │                     │      │                               │   │
│   │  Fonte de verdade   │◄─────│  Modificações propostas       │   │
│   │  Como seu sistema   │ merge│  Cada mudança = uma pasta     │   │
│   │  funciona agora     │      │  Contém artefatos + deltas    │   │
│   │                     │      │                               │   │
│   └─────────────────────┘      └───────────────────────────────┘   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Specs** são a fonte de verdade — descrevem como seu sistema se comporta atualmente.

**Mudanças** são modificações propostas — ficam em pastas separadas até que você esteja pronto para mesclá-las.

Essa separação é fundamental. Você pode trabalhar em múltiplas mudanças em paralelo sem conflitos. Você pode revisar uma mudança antes que ela afete as specs principais. E quando você arquiva uma mudança, seus deltas se mesclam de forma limpa na fonte de verdade.

## Specs

As specs descrevem o comportamento do seu sistema usando requisitos e cenários estruturados.

### Estrutura

```
openspec/specs/
├── auth/
│   └── spec.md           # Authentication behavior
├── payments/
│   └── spec.md           # Payment processing
├── notifications/
│   └── spec.md           # Notification system
└── ui/
    └── spec.md           # UI behavior and themes
```

Organize as specs por domínio — agrupamentos lógicos que fazem sentido para o seu sistema. Padrões comuns:

- **Por área de funcionalidade**: `auth/`, `payments/`, `search/`
- **Por componente**: `api/`, `frontend/`, `workers/`
- **Por contexto delimitado**: `ordering/`, `fulfillment/`, `inventory/`

### Formato da Spec

Uma spec contém requisitos, e cada requisito possui cenários:

```markdown
# Auth Specification

## Purpose
Authentication and session management for the application.

## Requirements

### Requirement: User Authentication
The system SHALL issue a JWT token upon successful login.

#### Scenario: Valid credentials
- GIVEN a user with valid credentials
- WHEN the user submits login form
- THEN a JWT token is returned
- AND the user is redirected to dashboard

#### Scenario: Invalid credentials
- GIVEN invalid credentials
- WHEN the user submits login form
- THEN an error message is displayed
- AND no token is issued

### Requirement: Session Expiration
The system MUST expire sessions after 30 minutes of inactivity.

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated
- AND the user must re-authenticate
```

**Elementos principais:**

| Elemento | Finalidade |
|---------|---------|
| `## Purpose` | Descrição de alto nível do domínio desta spec |
| `### Requirement:` | Um comportamento específico que o sistema deve ter |
| `#### Scenario:` | Um exemplo concreto do requisito em ação |
| SHALL/MUST/SHOULD | Palavras-chave RFC 2119 que indicam a força do requisito |

### Por Que Estruturar Specs Dessa Forma

**Requisitos são o "quê"** — eles declaram o que o sistema deve fazer sem especificar a implementação.

**Cenários são o "quando"** — eles fornecem exemplos concretos que podem ser verificados. Bons cenários:
- São testáveis (você poderia escrever um teste automatizado para eles)
- Cobrem tanto o caminho feliz quanto os casos extremos
- Usam Given/When/Then ou formato estruturado similar

**Palavras-chave RFC 2119** (SHALL, MUST, SHOULD, MAY) comunicam a intenção:
- **MUST/SHALL** — requisito absoluto
- **SHOULD** — recomendado, mas existem exceções
- **MAY** — opcional

### O Que Uma Spec É (e Não É)

Uma spec é um **contrato de comportamento**, não um plano de implementação.

Conteúdo adequado para uma spec:
- Comportamento observável do qual usuários ou sistemas downstream dependem
- Entradas, saídas e condições de erro
- Restrições externas (segurança, privacidade, confiabilidade, compatibilidade)
- Cenários que podem ser testados ou explicitamente validados

Evite em specs:
- Nomes internos de classes/funções
- Escolhas de bibliotecas ou frameworks
- Detalhes de implementação passo a passo
- Planos de execução detalhados (esses pertencem a `design.md` ou `tasks.md`)

Teste rápido:
- Se a implementação pode mudar sem alterar o comportamento externamente visível, provavelmente não pertence à spec.

### Mantenha Leve: Rigor Progressivo

O OpenSpec visa evitar burocracia. Use o nível mais leve que ainda torne a mudança verificável.

**Spec lite (padrão):**
- Requisitos curtos com foco no comportamento
- Escopo e não-objetivos claros
- Algumas verificações concretas de aceitação

**Spec completa (para maior risco):**
- Mudanças entre equipes ou entre repositórios
- Mudanças de API/contrato, migrações, preocupações de segurança/privacidade
- Mudanças onde a ambiguidade provavelmente causará retrabalho caro

A maioria das mudanças deve permanecer no modo Lite.

### Colaboração Humano + Agente

Em muitas equipes, humanos exploram e agentes rascunham artefatos. O ciclo pretendido é:

1. O humano fornece intenção, contexto e restrições.
2. O agente converte isso em requisitos e cenários com foco no comportamento.
3. O agente mantém detalhes de implementação em `design.md` e `tasks.md`, não em `spec.md`.
4. A validação confirma estrutura e clareza antes da implementação.

Isso mantém as specs legíveis para humanos e consistentes para agentes.

## Mudanças

Uma mudança é uma modificação proposta ao seu sistema, empacotada como uma pasta com tudo o que é necessário para entendê-la e implementá-la.

### Estrutura de uma Mudança

```
openspec/changes/add-dark-mode/
├── proposal.md           # Why and what
├── design.md             # How (technical approach)
├── tasks.md              # Implementation checklist
├── .openspec.yaml        # Change metadata (optional)
└── specs/                # Delta specs
    └── ui/
        └── spec.md       # What's changing in ui/spec.md
```

Cada mudança é autocontida. Ela possui:
- **Artefatos** — documentos que capturam intenção, design e tarefas
- **Delta specs** — especificações do que está sendo adicionado, modificado ou removido
- **Metadados** — configuração opcional para essa mudança específica

### Por Que Mudanças São Pastas

Empacotar uma mudança como uma pasta tem vários benefícios:

1. **Tudo junto.** Proposta, design, tarefas e specs ficam em um só lugar. Sem precisar procurar em locais diferentes.

2. **Trabalho paralelo.** Múltiplas mudanças podem existir simultaneamente sem conflitos. Trabalhe em `add-dark-mode` enquanto `fix-auth-bug` também está em andamento.

3. **Histórico limpo.** Quando arquivadas, as mudanças vão para `changes/archive/` com todo o contexto preservado. Você pode olhar para trás e entender não apenas o que mudou, mas por quê.

4. **Fácil de revisar.** Uma pasta de mudança é fácil de revisar — abra-a, leia a proposta, verifique o design, veja os deltas de spec.

## Artefatos

Artefatos são os documentos dentro de uma mudança que orientam o trabalho.

### O Fluxo de Artefatos

```
proposta ──────► specs ──────► design ──────► tarefas ──────► implementar
    │               │             │                │
  por quê          o quê        como            passos
 + escopo         muda        abordagem        a seguir
```

Os artefatos constroem uns sobre os outros. Cada artefato fornece contexto para o próximo.

### Tipos de Artefatos

#### Proposta (`proposal.md`)

A proposta captura **intenção**, **escopo** e **abordagem** em alto nível.

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage and match system preferences.

## Scope
In scope:
- Theme toggle in settings
- System preference detection
- Persist preference in localStorage

Out of scope:
- Custom color themes (future work)
- Per-page theme overrides

## Approach
Use CSS custom properties for theming with a React context
for state management. Detect system preference on first load,
allow manual override.
```

**Quando atualizar a proposta:**
- O escopo muda (redução ou expansão)
- A intenção fica mais clara (melhor entendimento do problema)
- A abordagem muda fundamentalmente

#### Specs (delta specs em `specs/`)

Delta specs descrevem **o que está mudando** em relação às specs atuais. Veja [Delta Specs](#delta-specs) abaixo.

#### Design (`design.md`)

O design captura a **abordagem técnica** e as **decisões de arquitetura**.

````markdown
# Design: Add Dark Mode

## Technical Approach
Theme state managed via React Context to avoid prop drilling.
CSS custom properties enable runtime switching without class toggling.

## Architecture Decisions

### Decision: Context over Redux
Using React Context for theme state because:
- Simple binary state (light/dark)
- No complex state transitions
- Avoids adding Redux dependency

### Decision: CSS Custom Properties
Using CSS variables instead of CSS-in-JS because:
- Works with existing stylesheet
- No runtime overhead
- Browser-native solution

## Data Flow
```
ThemeProvider (context)
       │
       ▼
ThemeToggle ◄──► localStorage
       │
       ▼
CSS Variables (applied to :root)
```

## File Changes
- `src/contexts/ThemeContext.tsx` (new)
- `src/components/ThemeToggle.tsx` (new)
- `src/styles/globals.css` (modified)
````

**Quando atualizar o design:**
- A implementação revela que a abordagem não funcionará
- Uma solução melhor é descoberta
- Dependências ou restrições mudam

#### Tarefas (`tasks.md`)

Tarefas são o **checklist de implementação** — passos concretos com caixas de seleção.

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence
- [ ] 1.4 Add system preference detection

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
- [ ] 3.3 Test contrast ratios for accessibility
```

**Boas práticas para tarefas:**
- Agrupe tarefas relacionadas sob títulos
- Use numeração hierárquica (1.1, 1.2, etc.)
- Mantenha as tarefas pequenas o suficiente para concluir em uma sessão
- Marque as tarefas conforme forem concluídas

## Delta Specs

Delta specs são o conceito-chave que faz o OpenSpec funcionar para desenvolvimento brownfield. Elas descrevem **o que está mudando** em vez de repetir toda a spec.

### O Formato

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST support TOTP-based two-factor authentication.

#### Scenario: 2FA enrollment
- GIVEN a user without 2FA enabled
- WHEN the user enables 2FA in settings
- THEN a QR code is displayed for authenticator app setup
- AND the user must verify with a code before activation

#### Scenario: 2FA login
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented
- AND login completes only after valid OTP

## MODIFIED Requirements

### Requirement: Session Expiration
The system MUST expire sessions after 15 minutes of inactivity.
(Previously: 30 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 15 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA. Users should re-authenticate each session.)
```

### Seções do Delta

| Seção | Significado | O Que Acontece ao Arquivar |
|---------|---------|------------------------|
| `## ADDED Requirements` | Novo comportamento | Adicionado à spec principal |
| `## MODIFIED Requirements` | Comportamento alterado | Substitui o requisito existente |
| `## REMOVED Requirements` | Comportamento descontinuado | Removido da spec principal |

### Por Que Deltas em Vez de Specs Completas

**Clareza.** Um delta mostra exatamente o que está mudando. Lendo uma spec completa, você teria que fazer o diff mentalmente em relação à versão atual.

**Evitar conflitos.** Duas mudanças podem tocar o mesmo arquivo de spec sem conflitar, desde que modifiquem requisitos diferentes.

**Eficiência na revisão.** Os revisores veem a mudança, não o contexto inalterado. Foco no que importa.

**Adequação ao brownfield.** A maior parte do trabalho modifica comportamento existente. Deltas tornam as modificações prioritárias, não uma reflexão tardia.

## Schemas

Schemas definem os tipos de artefatos e suas dependências para um fluxo de trabalho.

### Como os Schemas Funcionam

```yaml
# openspec/schemas/spec-driven/schema.yaml
name: spec-driven
artifacts:
  - id: proposal
    generates: proposal.md
    requires: []              # No dependencies, can create first

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]      # Needs proposal before creating

  - id: design
    generates: design.md
    requires: [proposal]      # Can create in parallel with specs

  - id: tasks
    generates: tasks.md
    requires: [specs, design] # Needs both specs and design first
```

**Os artefatos formam um grafo de dependências:**

```
                    proposal
                   (nó raiz)
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
      specs                       design
   (requires:                  (requires:
    proposal)                   proposal)
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
                    tasks
                (requires:
                specs, design)
```

**Dependências são habilitadores, não bloqueadores.** Elas mostram o que é possível criar, não o que você deve criar a seguir. Você pode pular o design se não precisar dele. Você pode criar specs antes ou depois do design — ambos dependem apenas da proposta.

### Schemas Embutidos

**spec-driven** (padrão)

O fluxo de trabalho padrão para desenvolvimento orientado a specs:

```
proposal → specs → design → tasks → implement
```

Ideal para: A maioria dos trabalhos de funcionalidade em que você quer concordar com as specs antes da implementação.

### Schemas Personalizados

Crie schemas personalizados para o fluxo de trabalho da sua equipe:

```bash
# Create from scratch
openspec schema init research-first

# Or fork an existing one
openspec schema fork spec-driven research-first
```

**Exemplo de schema personalizado:**

```yaml
# openspec/schemas/research-first/schema.yaml
name: research-first
artifacts:
  - id: research
    generates: research.md
    requires: []           # Do research first

  - id: proposal
    generates: proposal.md
    requires: [research]   # Proposal informed by research

  - id: tasks
    generates: tasks.md
    requires: [proposal]   # Skip specs/design, go straight to tasks
```

Consulte [Personalização](customization.md) para detalhes completos sobre como criar e usar schemas personalizados.

## Arquivamento

Arquivar conclui uma mudança ao mesclar seus delta specs nas specs principais e preservar a mudança no histórico.

### O Que Acontece Quando Você Arquiva

```
Antes de arquivar:

openspec/
├── specs/
│   └── auth/
│       └── spec.md ◄────────────────┐
└── changes/                         │
    └── add-2fa/                     │
        ├── proposal.md              │
        ├── design.md                │ merge
        ├── tasks.md                 │
        └── specs/                   │
            └── auth/                │
                └── spec.md ─────────┘


Após arquivar:

openspec/
├── specs/
│   └── auth/
│       └── spec.md        # Agora inclui os requisitos de 2FA
└── changes/
    └── archive/
        └── 2025-01-24-add-2fa/    # Preservado no histórico
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── auth/
                    └── spec.md
```

### O Processo de Arquivamento

1. **Mesclar os deltas.** Cada seção do delta spec (ADDED/MODIFIED/REMOVED) é aplicada à spec principal correspondente.

2. **Mover para o arquivo.** A pasta da mudança vai para `changes/archive/` com um prefixo de data para ordenação cronológica.

3. **Preservar o contexto.** Todos os artefatos permanecem intactos no arquivo. Você sempre pode olhar para trás para entender por que uma mudança foi feita.

### Por Que o Arquivamento Importa

**Estado limpo.** As mudanças ativas (`changes/`) mostram apenas o trabalho em andamento. O trabalho concluído sai do caminho.

**Trilha de auditoria.** O arquivo preserva o contexto completo de cada mudança — não apenas o que mudou, mas a proposta explicando por quê, o design explicando como, e as tarefas mostrando o trabalho realizado.

**Evolução das specs.** As specs crescem organicamente conforme as mudanças são arquivadas. Cada arquivamento mescla seus deltas, construindo uma especificação abrangente ao longo do tempo.

## Como Tudo Se Encaixa

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DO OPENSPEC                                  │
│                                                                              │
│   ┌────────────────┐                                                         │
│   │  1. INICIAR    │  /opsx:propose (core) or /opsx:new (expanded)           │
│   │     MUDANÇA    │                                                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  2. CRIAR      │  /opsx:ff or /opsx:continue (expanded workflow)         │
│   │     ARTEFATOS  │  Creates proposal → specs → design → tasks              │
│   │                │  (based on schema dependencies)                         │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  3. IMPLEMENTAR│  /opsx:apply                                            │
│   │     TAREFAS    │  Trabalhe nas tarefas, marcando-as como concluídas      │
│   │                │◄──── Atualize artefatos conforme aprender               │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐                                                         │
│   │  4. VERIFICAR  │  /opsx:verify (optional)                                │
│   │     TRABALHO   │  Verifique se a implementação corresponde às specs      │
│   └───────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│   ┌────────────────┐     ┌──────────────────────────────────────────────┐    │
│   │  5. ARQUIVAR   │────►│  Delta specs mesclados nas specs principais  │    │
│   │     MUDANÇA    │     │  Pasta da mudança vai para archive/          │    │
│   └────────────────┘     │  Specs agora são a fonte de verdade atualiz.│    │
│                          └──────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**O ciclo virtuoso:**

1. As specs descrevem o comportamento atual
2. As mudanças propõem modificações (como deltas)
3. A implementação torna as mudanças reais
4. O arquivamento mescla os deltas nas specs
5. As specs agora descrevem o novo comportamento
6. A próxima mudança parte das specs atualizadas

## Glossário

| Termo | Definição |
|------|------------|
| **Artefato** | Um documento dentro de uma mudança (proposta, design, tarefas ou delta specs) |
| **Arquivamento** | O processo de concluir uma mudança e mesclar seus deltas nas specs principais |
| **Mudança** | Uma modificação proposta ao sistema, empacotada como uma pasta com artefatos |
| **Delta spec** | Uma spec que descreve mudanças (ADDED/MODIFIED/REMOVED) em relação às specs atuais |
| **Domínio** | Um agrupamento lógico de specs (por exemplo, `auth/`, `payments/`) |
| **Requisito** | Um comportamento específico que o sistema deve ter |
| **Cenário** | Um exemplo concreto de um requisito, tipicamente no formato Given/When/Then |
| **Schema** | Uma definição de tipos de artefatos e suas dependências |
| **Spec** | Uma especificação que descreve o comportamento do sistema, contendo requisitos e cenários |
| **Fonte de verdade** | O diretório `openspec/specs/`, contendo o comportamento atual acordado |

## Próximos Passos

- [Primeiros Passos](getting-started.md) - Primeiros passos práticos
- [Fluxos de Trabalho](workflows.md) - Padrões comuns e quando usar cada um
- [Comandos](commands.md) - Referência completa de comandos
- [Personalização](customization.md) - Criar schemas personalizados e configurar seu projeto
