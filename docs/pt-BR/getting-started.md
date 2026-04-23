# Primeiros Passos

Este guia explica como o OpenSpec funciona após você tê-lo instalado e inicializado. Para instruções de instalação, consulte o [README principal](../../README.pt-BR.md#quick-start).

## Como Funciona

O OpenSpec ajuda você e seu assistente de codificação com IA a chegarem a um acordo sobre o que construir antes de qualquer código ser escrito.

**Caminho rápido padrão (perfil `core`):**

```text
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

**Caminho expandido (seleção de workflow personalizado):**

```text
/opsx:new ──► /opsx:ff or /opsx:continue ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

O perfil global padrão é `core`, que inclui `propose`, `explore`, `apply` e `archive`. Você pode habilitar os comandos de workflow expandido com `openspec config profile` e depois `openspec update`.

## O Que o OpenSpec Cria

Após executar `openspec init`, seu projeto terá esta estrutura:

```
openspec/
├── specs/              # Fonte de verdade (o comportamento do seu sistema)
│   └── <domain>/
│       └── spec.md
├── changes/            # Atualizações propostas (uma pasta por mudança)
│   └── <change-name>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (o que está mudando)
│           └── <domain>/
│               └── spec.md
└── config.yaml         # Configuração do projeto (opcional)
```

**Dois diretórios principais:**

- **`specs/`** - A fonte de verdade. Essas specs descrevem como o seu sistema se comporta atualmente. Organizadas por domínio (ex.: `specs/auth/`, `specs/payments/`).

- **`changes/`** - Modificações propostas. Cada mudança tem sua própria pasta com todos os artefatos relacionados. Quando uma mudança é concluída, suas specs são mescladas no diretório principal `specs/`.

## Entendendo os Artefatos

Cada pasta de mudança contém artefatos que orientam o trabalho:

| Artefato | Propósito |
|----------|-----------|
| `proposal.md` | O "por quê" e o "o quê" — captura a intenção, o escopo e a abordagem |
| `specs/` | Delta specs mostrando requisitos ADICIONADOS/MODIFICADOS/REMOVIDOS |
| `design.md` | O "como" — abordagem técnica e decisões de arquitetura |
| `tasks.md` | Lista de verificação de implementação com checkboxes |

**Os artefatos se constroem uns sobre os outros:**

```
proposta ──► specs ──► design ──► tarefas ──► implementação
   ▲           ▲          ▲                        │
   └───────────┴──────────┴────────────────────────┘
            atualizar conforme você aprende
```

Você sempre pode voltar e refinar artefatos anteriores à medida que aprende mais durante a implementação.

## Como as Delta Specs Funcionam

As delta specs são o conceito central do OpenSpec. Elas mostram o que está mudando em relação às suas specs atuais.

### O Formato

As delta specs usam seções para indicar o tipo de mudança:

```markdown
# Delta for Auth

## ADDED Requirements

### Requirement: Two-Factor Authentication
The system MUST require a second factor during login.

#### Scenario: OTP required
- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented

## MODIFIED Requirements

### Requirement: Session Timeout
The system SHALL expire sessions after 30 minutes of inactivity.
(Previously: 60 minutes)

#### Scenario: Idle timeout
- GIVEN an authenticated session
- WHEN 30 minutes pass without activity
- THEN the session is invalidated

## REMOVED Requirements

### Requirement: Remember Me
(Deprecated in favor of 2FA)
```

### O Que Acontece ao Arquivar

Quando você arquiva uma mudança:

1. Os requisitos **ADDED** são anexados à spec principal
2. Os requisitos **MODIFIED** substituem a versão existente
3. Os requisitos **REMOVED** são excluídos da spec principal

A pasta da mudança é movida para `openspec/changes/archive/` como histórico de auditoria.

## Exemplo: Sua Primeira Mudança

Vamos percorrer o processo de adição do modo escuro a uma aplicação.

### 1. Iniciar a Mudança (Padrão)

```text
Você: /opsx:propose add-dark-mode

IA:   Criado openspec/changes/add-dark-mode/
      ✓ proposal.md — por que estamos fazendo isso, o que está mudando
      ✓ specs/       — requisitos e cenários
      ✓ design.md    — abordagem técnica
      ✓ tasks.md     — lista de verificação de implementação
      Pronto para implementação!
```

Se você habilitou o perfil de workflow expandido, também pode fazer isso em duas etapas: `/opsx:new` e depois `/opsx:ff` (ou `/opsx:continue` de forma incremental).

### 2. O Que é Criado

**proposal.md** — Captura a intenção:

```markdown
# Proposal: Add Dark Mode

## Intent
Users have requested a dark mode option to reduce eye strain
during nighttime usage.

## Scope
- Add theme toggle in settings
- Support system preference detection
- Persist preference in localStorage

## Approach
Use CSS custom properties for theming with a React context
for state management.
```

**specs/ui/spec.md** — Delta mostrando os novos requisitos:

```markdown
# Delta for UI

## ADDED Requirements

### Requirement: Theme Selection
The system SHALL allow users to choose between light and dark themes.

#### Scenario: Manual toggle
- GIVEN a user on any page
- WHEN the user clicks the theme toggle
- THEN the theme switches immediately
- AND the preference persists across sessions

#### Scenario: System preference
- GIVEN a user with no saved preference
- WHEN the application loads
- THEN the system's preferred color scheme is used
```

**tasks.md** — Lista de verificação de implementação:

```markdown
# Tasks

## 1. Theme Infrastructure
- [ ] 1.1 Create ThemeContext with light/dark state
- [ ] 1.2 Add CSS custom properties for colors
- [ ] 1.3 Implement localStorage persistence

## 2. UI Components
- [ ] 2.1 Create ThemeToggle component
- [ ] 2.2 Add toggle to settings page
- [ ] 2.3 Update Header to include quick toggle

## 3. Styling
- [ ] 3.1 Define dark theme color palette
- [ ] 3.2 Update components to use CSS variables
```

### 3. Implementar

```
Você: /opsx:apply

IA:   Executando as tarefas...
      ✓ 1.1 ThemeContext criado com estado light/dark
      ✓ 1.2 Propriedades CSS customizadas adicionadas ao globals.css
      ✓ 1.3 Persistência com localStorage implementada
      ✓ 2.1 Componente ThemeToggle criado
      ...
      Todas as tarefas concluídas!
```

Durante a implementação, se você descobrir que o design precisa de ajuste, basta atualizar o artefato e continuar.

### 4. Arquivar

```
Você: /opsx:archive

IA:   Arquivando add-dark-mode...
      ✓ Specs mescladas em openspec/specs/ui/spec.md
      ✓ Movido para openspec/changes/archive/2025-01-24-add-dark-mode/
      Concluído! Pronto para o próximo recurso.
```

Suas delta specs agora fazem parte das specs principais, documentando como o seu sistema funciona.

## Verificando e Revisando

Use a CLI para conferir suas mudanças:

```bash
# Listar mudanças ativas
openspec list

# Ver detalhes de uma mudança
openspec show add-dark-mode

# Validar a formatação das specs
openspec validate add-dark-mode

# Dashboard interativo
openspec view
```

## Próximos Passos

- [Fluxos de Trabalho](workflows.md) — Padrões comuns e quando usar cada comando
- [Comandos](commands.md) — Referência completa de todos os comandos slash
- [Conceitos](concepts.md) — Compreensão mais profunda de specs, mudanças e schemas
- [Personalização](customization.md) — Faça o OpenSpec funcionar do seu jeito
