# Referência da CLI

A CLI do OpenSpec (`openspec`) fornece comandos de terminal para configuração de projetos, validação, inspeção de status e gerenciamento. Esses comandos complementam os comandos AI com barra (como `/opsx:propose`) documentados em [Comandos](commands.md).

## Resumo

| Categoria | Comandos | Finalidade |
|-----------|----------|------------|
| **Configuração** | `init`, `update` | Inicializar e atualizar o OpenSpec no seu projeto |
| **Navegação** | `list`, `view`, `show` | Explorar mudanças e specs |
| **Validação** | `validate` | Verificar mudanças e specs em busca de problemas |
| **Ciclo de vida** | `archive` | Finalizar mudanças concluídas |
| **Fluxo de trabalho** | `status`, `instructions`, `templates`, `schemas` | Suporte ao fluxo de trabalho orientado a artefatos |
| **Schemas** | `schema init`, `schema fork`, `schema validate`, `schema which` | Criar e gerenciar fluxos de trabalho personalizados |
| **Configuração** | `config` | Visualizar e modificar configurações |
| **Utilitários** | `feedback`, `completion` | Feedback e integração com o shell |

---

## Comandos Humanos vs Comandos de Agente

A maioria dos comandos da CLI é projetada para **uso humano** em um terminal. Alguns comandos também suportam **uso por agentes/scripts** via saída JSON.

### Comandos Exclusivos para Humanos

Estes comandos são interativos e projetados para uso no terminal:

| Comando | Finalidade |
|---------|------------|
| `openspec init` | Inicializar projeto (prompts interativos) |
| `openspec view` | Painel interativo |
| `openspec config edit` | Abrir configuração no editor |
| `openspec feedback` | Enviar feedback via GitHub |
| `openspec completion install` | Instalar completions do shell |

### Comandos Compatíveis com Agentes

Estes comandos suportam saída `--json` para uso programático por agentes de IA e scripts:

| Comando | Uso Humano | Uso por Agente |
|---------|------------|----------------|
| `openspec list` | Navegar mudanças/specs | `--json` para dados estruturados |
| `openspec show <item>` | Ler conteúdo | `--json` para parsing |
| `openspec validate` | Verificar problemas | `--all --json` para validação em massa |
| `openspec status` | Ver progresso de artefatos | `--json` para status estruturado |
| `openspec instructions` | Obter próximos passos | `--json` para instruções do agente |
| `openspec templates` | Encontrar caminhos de templates | `--json` para resolução de caminhos |
| `openspec schemas` | Listar schemas disponíveis | `--json` para descoberta de schemas |

---

## Opções Globais

Estas opções funcionam com todos os comandos:

| Opção | Descrição |
|-------|-----------|
| `--version`, `-V` | Exibir número da versão |
| `--no-color` | Desabilitar saída colorida |
| `--help`, `-h` | Exibir ajuda para o comando |

---

## Comandos de Configuração

### `openspec init`

Inicializar o OpenSpec no seu projeto. Cria a estrutura de pastas e configura as integrações com ferramentas de IA.

O comportamento padrão usa os valores globais de configuração: perfil `core`, entrega `both`, fluxos de trabalho `propose, explore, apply, archive`.

```
openspec init [path] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `path` | Não | Diretório de destino (padrão: diretório atual) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--tools <list>` | Configurar ferramentas de IA de forma não interativa. Use `all`, `none` ou lista separada por vírgulas |
| `--force` | Limpar arquivos legados automaticamente sem solicitar confirmação |
| `--profile <profile>` | Substituir o perfil global para esta execução do init (`core` ou `custom`) |

`--profile custom` usa os fluxos de trabalho atualmente selecionados na configuração global (`openspec config profile`).

**IDs de ferramentas suportados (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `kimi`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

**Exemplos:**

```bash
# Inicialização interativa
openspec init

# Inicializar em um diretório específico
openspec init ./my-project

# Não interativo: configurar para Claude e Cursor
openspec init --tools claude,cursor

# Configurar para todas as ferramentas suportadas
openspec init --tools all

# Substituir perfil para esta execução
openspec init --profile core

# Ignorar prompts e limpar arquivos legados automaticamente
openspec init --force
```

**O que é criado:**

```
openspec/
├── specs/              # Suas especificações (fonte de verdade)
├── changes/            # Mudanças propostas
└── config.yaml         # Configuração do projeto

.claude/skills/         # Skills do Claude Code (se claude selecionado)
.cursor/skills/         # Skills do Cursor (se cursor selecionado)
.cursor/commands/       # Comandos OPSX do Cursor (se entrega incluir commands)
... (outras configurações de ferramentas)
```

---

### `openspec update`

Atualizar os arquivos de instrução do OpenSpec após atualizar a CLI. Regenera os arquivos de configuração de ferramentas de IA usando seu perfil global atual, fluxos de trabalho selecionados e modo de entrega.

```
openspec update [path] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `path` | Não | Diretório de destino (padrão: diretório atual) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--force` | Forçar atualização mesmo quando os arquivos estão atualizados |

**Exemplo:**

```bash
# Atualizar arquivos de instrução após atualização via npm
npm update @fission-ai/openspec
openspec update
```

---

## Comandos de Navegação

### `openspec list`

Listar mudanças ou specs no seu projeto.

```
openspec list [options]
```

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--specs` | Listar specs em vez de mudanças |
| `--changes` | Listar mudanças (padrão) |
| `--sort <order>` | Ordenar por `recent` (padrão) ou `name` |
| `--json` | Saída em formato JSON |

**Exemplos:**

```bash
# Listar todas as mudanças ativas
openspec list

# Listar todas as specs
openspec list --specs

# Saída JSON para scripts
openspec list --json
```

**Saída (texto):**

```
Active changes:
  add-dark-mode     UI theme switching support
  fix-login-bug     Session timeout handling
```

---

### `openspec view`

Exibir um painel interativo para explorar specs e mudanças.

```
openspec view
```

Abre uma interface baseada em terminal para navegar pelas especificações e mudanças do seu projeto.

---

### `openspec show`

Exibir detalhes de uma mudança ou spec.

```
openspec show [item-name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `item-name` | Não | Nome da mudança ou spec (solicita se omitido) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--type <type>` | Especificar tipo: `change` ou `spec` (detectado automaticamente se não houver ambiguidade) |
| `--json` | Saída em formato JSON |
| `--no-interactive` | Desabilitar prompts |

**Opções específicas para mudanças:**

| Opção | Descrição |
|-------|-----------|
| `--deltas-only` | Exibir apenas specs delta (modo JSON) |

**Opções específicas para specs:**

| Opção | Descrição |
|-------|-----------|
| `--requirements` | Exibir apenas requisitos, excluir cenários (modo JSON) |
| `--no-scenarios` | Excluir conteúdo de cenários (modo JSON) |
| `-r, --requirement <id>` | Exibir requisito específico por índice base 1 (modo JSON) |

**Exemplos:**

```bash
# Seleção interativa
openspec show

# Exibir uma mudança específica
openspec show add-dark-mode

# Exibir uma spec específica
openspec show auth --type spec

# Saída JSON para parsing
openspec show add-dark-mode --json
```

---

## Comandos de Validação

### `openspec validate`

Validar mudanças e specs em busca de problemas estruturais.

```
openspec validate [item-name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `item-name` | Não | Item específico a validar (solicita se omitido) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--all` | Validar todas as mudanças e specs |
| `--changes` | Validar todas as mudanças |
| `--specs` | Validar todas as specs |
| `--type <type>` | Especificar tipo quando o nome for ambíguo: `change` ou `spec` |
| `--strict` | Habilitar modo de validação estrita |
| `--json` | Saída em formato JSON |
| `--concurrency <n>` | Máximo de validações paralelas (padrão: 6, ou variável de ambiente `OPENSPEC_CONCURRENCY`) |
| `--no-interactive` | Desabilitar prompts |

**Exemplos:**

```bash
# Validação interativa
openspec validate

# Validar uma mudança específica
openspec validate add-dark-mode

# Validar todas as mudanças
openspec validate --changes

# Validar tudo com saída JSON (para CI/scripts)
openspec validate --all --json

# Validação estrita com paralelismo aumentado
openspec validate --all --strict --concurrency 12
```

**Saída (texto):**

```
Validating add-dark-mode...
  ✓ proposal.md valid
  ✓ specs/ui/spec.md valid
  ⚠ design.md: missing "Technical Approach" section

1 warning found
```

**Saída (JSON):**

```json
{
  "version": "1.0.0",
  "results": {
    "changes": [
      {
        "name": "add-dark-mode",
        "valid": true,
        "warnings": ["design.md: missing 'Technical Approach' section"]
      }
    ]
  },
  "summary": {
    "total": 1,
    "valid": 1,
    "invalid": 0
  }
}
```

---

## Comandos de Ciclo de Vida

### `openspec archive`

Arquivar uma mudança concluída e mesclar as specs delta nas specs principais.

```
openspec archive [change-name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `change-name` | Não | Mudança a arquivar (solicita se omitido) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `-y, --yes` | Ignorar prompts de confirmação |
| `--skip-specs` | Ignorar atualizações de specs (para mudanças de infraestrutura/ferramental/apenas documentação) |
| `--no-validate` | Ignorar validação (requer confirmação) |

**Exemplos:**

```bash
# Arquivamento interativo
openspec archive

# Arquivar mudança específica
openspec archive add-dark-mode

# Arquivar sem prompts (CI/scripts)
openspec archive add-dark-mode --yes

# Arquivar uma mudança de ferramental que não afeta specs
openspec archive update-ci-config --skip-specs
```

**O que é feito:**

1. Valida a mudança (a menos que `--no-validate` seja informado)
2. Solicita confirmação (a menos que `--yes` seja informado)
3. Mescla as specs delta em `openspec/specs/`
4. Move a pasta da mudança para `openspec/changes/archive/YYYY-MM-DD-<name>/`

---

## Comandos de Fluxo de Trabalho

Esses comandos suportam o fluxo de trabalho OPSX orientado a artefatos. São úteis tanto para humanos verificarem o progresso quanto para agentes determinarem os próximos passos.

### `openspec status`

Exibir o status de conclusão dos artefatos de uma mudança.

```
openspec status [options]
```

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--change <id>` | Nome da mudança (solicita se omitido) |
| `--schema <name>` | Substituição de schema (detectado automaticamente a partir da configuração da mudança) |
| `--json` | Saída em formato JSON |

**Exemplos:**

```bash
# Verificação interativa de status
openspec status

# Status para mudança específica
openspec status --change add-dark-mode

# JSON para uso por agente
openspec status --change add-dark-mode --json
```

**Saída (texto):**

```
Change: add-dark-mode
Schema: spec-driven
Progress: 2/4 artifacts complete

[x] proposal
[ ] design
[x] specs
[-] tasks (blocked by: design)
```

**Saída (JSON):**

```json
{
  "changeName": "add-dark-mode",
  "schemaName": "spec-driven",
  "isComplete": false,
  "applyRequires": ["tasks"],
  "artifacts": [
    {"id": "proposal", "outputPath": "proposal.md", "status": "done"},
    {"id": "design", "outputPath": "design.md", "status": "ready"},
    {"id": "specs", "outputPath": "specs/**/*.md", "status": "done"},
    {"id": "tasks", "outputPath": "tasks.md", "status": "blocked", "missingDeps": ["design"]}
  ]
}
```

---

### `openspec instructions`

Obter instruções enriquecidas para criar um artefato ou aplicar tarefas. Usado por agentes de IA para entender o que criar a seguir.

```
openspec instructions [artifact] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `artifact` | Não | ID do artefato: `proposal`, `specs`, `design`, `tasks` ou `apply` |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--change <id>` | Nome da mudança (obrigatório no modo não interativo) |
| `--schema <name>` | Substituição de schema |
| `--json` | Saída em formato JSON |

**Caso especial:** Use `apply` como artefato para obter instruções de implementação de tarefas.

**Exemplos:**

```bash
# Obter instruções para o próximo artefato
openspec instructions --change add-dark-mode

# Obter instruções para um artefato específico
openspec instructions design --change add-dark-mode

# Obter instruções de aplicação/implementação
openspec instructions apply --change add-dark-mode

# JSON para consumo pelo agente
openspec instructions design --change add-dark-mode --json
```

**A saída inclui:**

- Conteúdo do template para o artefato
- Contexto do projeto a partir da configuração
- Conteúdo dos artefatos de dependência
- Regras por artefato definidas na configuração

---

### `openspec templates`

Exibir os caminhos de templates resolvidos para todos os artefatos em um schema.

```
openspec templates [options]
```

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--schema <name>` | Schema a inspecionar (padrão: `spec-driven`) |
| `--json` | Saída em formato JSON |

**Exemplos:**

```bash
# Exibir caminhos de templates para o schema padrão
openspec templates

# Exibir templates para schema personalizado
openspec templates --schema my-workflow

# JSON para uso programático
openspec templates --json
```

**Saída (texto):**

```
Schema: spec-driven

Templates:
  proposal  → ~/.openspec/schemas/spec-driven/templates/proposal.md
  specs     → ~/.openspec/schemas/spec-driven/templates/specs.md
  design    → ~/.openspec/schemas/spec-driven/templates/design.md
  tasks     → ~/.openspec/schemas/spec-driven/templates/tasks.md
```

---

### `openspec schemas`

Listar os schemas de fluxo de trabalho disponíveis com suas descrições e fluxos de artefatos.

```
openspec schemas [options]
```

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--json` | Saída em formato JSON |

**Exemplo:**

```bash
openspec schemas
```

**Saída:**

```
Available schemas:

  spec-driven (package)
    The default spec-driven development workflow
    Flow: proposal → specs → design → tasks

  my-custom (project)
    Custom workflow for this project
    Flow: research → proposal → tasks
```

---

## Comandos de Schema

Comandos para criar e gerenciar schemas de fluxo de trabalho personalizados.

### `openspec schema init`

Criar um novo schema local de projeto.

```
openspec schema init <name> [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `name` | Sim | Nome do schema (kebab-case) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--description <text>` | Descrição do schema |
| `--artifacts <list>` | IDs de artefatos separados por vírgula (padrão: `proposal,specs,design,tasks`) |
| `--default` | Definir como schema padrão do projeto |
| `--no-default` | Não solicitar para definir como padrão |
| `--force` | Sobrescrever schema existente |
| `--json` | Saída em formato JSON |

**Exemplos:**

```bash
# Criação interativa de schema
openspec schema init research-first

# Não interativo com artefatos específicos
openspec schema init rapid \
  --description "Rapid iteration workflow" \
  --artifacts "proposal,tasks" \
  --default
```

**O que é criado:**

```
openspec/schemas/<name>/
├── schema.yaml           # Definição do schema
└── templates/
    ├── proposal.md       # Template para cada artefato
    ├── specs.md
    ├── design.md
    └── tasks.md
```

---

### `openspec schema fork`

Copiar um schema existente para o seu projeto para personalização.

```
openspec schema fork <source> [name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `source` | Sim | Schema a copiar |
| `name` | Não | Novo nome do schema (padrão: `<source>-custom`) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--force` | Sobrescrever destino existente |
| `--json` | Saída em formato JSON |

**Exemplo:**

```bash
# Fazer fork do schema spec-driven embutido
openspec schema fork spec-driven my-workflow
```

---

### `openspec schema validate`

Validar a estrutura e os templates de um schema.

```
openspec schema validate [name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `name` | Não | Schema a validar (valida todos se omitido) |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--verbose` | Exibir etapas detalhadas de validação |
| `--json` | Saída em formato JSON |

**Exemplo:**

```bash
# Validar um schema específico
openspec schema validate my-workflow

# Validar todos os schemas
openspec schema validate
```

---

### `openspec schema which`

Mostrar de onde um schema é resolvido (útil para depurar precedência).

```
openspec schema which [name] [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `name` | Não | Nome do schema |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--all` | Listar todos os schemas com suas origens |
| `--json` | Saída em formato JSON |

**Exemplo:**

```bash
# Verificar de onde um schema vem
openspec schema which spec-driven
```

**Saída:**

```
spec-driven resolves from: package
  Source: /usr/local/lib/node_modules/@fission-ai/openspec/schemas/spec-driven
```

**Precedência de schemas:**

1. Projeto: `openspec/schemas/<name>/`
2. Usuário: `~/.local/share/openspec/schemas/<name>/`
3. Pacote: Schemas embutidos

---

## Comandos de Configuração

### `openspec config`

Visualizar e modificar a configuração global do OpenSpec.

```
openspec config <subcommand> [options]
```

**Subcomandos:**

| Subcomando | Descrição |
|------------|-----------|
| `path` | Exibir localização do arquivo de configuração |
| `list` | Exibir todas as configurações atuais |
| `get <key>` | Obter um valor específico |
| `set <key> <value>` | Definir um valor |
| `unset <key>` | Remover uma chave |
| `reset` | Redefinir para os padrões |
| `edit` | Abrir no `$EDITOR` |
| `profile [preset]` | Configurar perfil de fluxo de trabalho interativamente ou via preset |

**Exemplos:**

```bash
# Exibir caminho do arquivo de configuração
openspec config path

# Listar todas as configurações
openspec config list

# Obter um valor específico
openspec config get telemetry.enabled

# Definir um valor
openspec config set telemetry.enabled false

# Definir um valor de string explicitamente
openspec config set user.name "My Name" --string

# Remover uma configuração personalizada
openspec config unset user.name

# Redefinir toda a configuração
openspec config reset --all --yes

# Editar configuração no seu editor
openspec config edit

# Configurar perfil com assistente baseado em ações
openspec config profile

# Preset rápido: alternar fluxos de trabalho para core (mantém o modo de entrega)
openspec config profile core
```

`openspec config profile` começa com um resumo do estado atual e permite que você escolha:
- Alterar entrega + fluxos de trabalho
- Alterar apenas a entrega
- Alterar apenas os fluxos de trabalho
- Manter as configurações atuais (sair)

Se você mantiver as configurações atuais, nenhuma alteração é salva e nenhum prompt de atualização é exibido.
Se não houver alterações de configuração, mas os arquivos do projeto atual estiverem fora de sincronia com o seu perfil/entrega global, o OpenSpec exibirá um aviso e sugerirá executar `openspec update`.
Pressionar `Ctrl+C` também cancela o fluxo de forma limpa (sem rastreamento de pilha) e sai com o código `130`.
Na lista de verificação de fluxos de trabalho, `[x]` significa que o fluxo de trabalho está selecionado na configuração global. Para aplicar essas seleções aos arquivos do projeto, execute `openspec update` (ou escolha `Apply changes to this project now?` quando solicitado dentro de um projeto).

**Exemplos interativos:**

```bash
# Atualização apenas de entrega
openspec config profile
# escolha: Change delivery only
# escolha a entrega: Skills only

# Atualização apenas de fluxos de trabalho
openspec config profile
# escolha: Change workflows only
# alterne os fluxos de trabalho na lista de verificação e confirme
```

---

## Comandos Utilitários

### `openspec feedback`

Enviar feedback sobre o OpenSpec. Cria uma issue no GitHub.

```
openspec feedback <message> [options]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `message` | Sim | Mensagem de feedback |

**Opções:**

| Opção | Descrição |
|-------|-----------|
| `--body <text>` | Descrição detalhada |

**Requisitos:** A CLI do GitHub (`gh`) deve estar instalada e autenticada.

**Exemplo:**

```bash
openspec feedback "Add support for custom artifact types" \
  --body "I'd like to define my own artifact types beyond the built-in ones."
```

---

### `openspec completion`

Gerenciar completions do shell para a CLI do OpenSpec.

```
openspec completion <subcommand> [shell]
```

**Subcomandos:**

| Subcomando | Descrição |
|------------|-----------|
| `generate [shell]` | Exibir script de completion no stdout |
| `install [shell]` | Instalar completion para o seu shell |
| `uninstall [shell]` | Remover completions instaladas |

**Shells suportados:** `bash`, `zsh`, `fish`, `powershell`

**Exemplos:**

```bash
# Instalar completions (detecta o shell automaticamente)
openspec completion install

# Instalar para um shell específico
openspec completion install zsh

# Gerar script para instalação manual
openspec completion generate bash > ~/.bash_completion.d/openspec

# Desinstalar
openspec completion uninstall
```

---

## Códigos de Saída

| Código | Significado |
|--------|-------------|
| `0` | Sucesso |
| `1` | Erro (falha de validação, arquivos ausentes, etc.) |

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `OPENSPEC_TELEMETRY` | Definir como `0` para desabilitar telemetria |
| `DO_NOT_TRACK` | Definir como `1` para desabilitar telemetria (sinal DNT padrão) |
| `OPENSPEC_CONCURRENCY` | Concorrência padrão para validação em massa (padrão: 6) |
| `EDITOR` ou `VISUAL` | Editor para `openspec config edit` |
| `NO_COLOR` | Desabilitar saída colorida quando definido |

---

## Documentação Relacionada

- [Comandos](commands.md) - Comandos AI com barra (`/opsx:propose`, `/opsx:apply`, etc.)
- [Fluxos de Trabalho](workflows.md) - Padrões comuns e quando usar cada comando
- [Personalização](customization.md) - Criar schemas e templates personalizados
- [Primeiros Passos](getting-started.md) - Guia de configuração inicial
