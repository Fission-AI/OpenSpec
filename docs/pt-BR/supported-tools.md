# Ferramentas Suportadas

O OpenSpec funciona com muitos assistentes de codificação com IA. Quando você executa `openspec init`, o OpenSpec configura as ferramentas selecionadas usando o perfil/seleção de fluxo de trabalho ativo e o modo de entrega.

## Como Funciona

Para cada ferramenta selecionada, o OpenSpec pode instalar:

1. **Skills** (se a entrega incluir skills): `.../skills/openspec-*/SKILL.md`
2. **Comandos** (se a entrega incluir comandos): arquivos de comando `opsx-*` específicos da ferramenta

Por padrão, o OpenSpec usa o perfil `core`, que inclui:
- `propose`
- `explore`
- `apply`
- `archive`

Você pode habilitar fluxos de trabalho expandidos (`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`) via `openspec config profile` e depois executar `openspec update`.

## Referência de Diretórios das Ferramentas

| Ferramenta (ID) | Padrão de caminho de skills | Padrão de caminho de comandos |
|-----------------|------------------------------|-------------------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/openspec-*/SKILL.md` | `.bob/commands/opsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex (`codex`) | `.codex/skills/openspec-*/SKILL.md` | `$CODEX_HOME/prompts/opsx-<id>.md`\* |
| ForgeCode (`forgecode`) | `.forge/skills/openspec-*/SKILL.md` | Não gerado (sem adaptador de comando; use invocações `/openspec-*` baseadas em skill) |
| Continue (`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/openspec-*/SKILL.md` | `.junie/commands/opsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kiro (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/openspec-*/SKILL.md` | Não gerado (sem adaptador de comando; use invocações `/openspec-*` baseadas em skill) |
| Windsurf (`windsurf`) | `.windsurf/skills/openspec-*/SKILL.md` | `.windsurf/workflows/opsx-<id>.md` |

\* Os comandos do Codex são instalados no diretório global do Codex (`$CODEX_HOME/prompts/` se definido, caso contrário `~/.codex/prompts/`), não no diretório do seu projeto.

\*\* Os arquivos de prompt do GitHub Copilot são reconhecidos como slash commands personalizados nas extensões de IDE (VS Code, JetBrains, Visual Studio). O Copilot CLI atualmente não consome arquivos `.github/prompts/*.prompt.md` diretamente.

## Configuração Não Interativa

Para CI/CD ou configuração via script, use `--tools` (e opcionalmente `--profile`):

```bash
# Configurar ferramentas específicas
openspec init --tools claude,cursor

# Configurar todas as ferramentas suportadas
openspec init --tools all

# Ignorar configuração de ferramentas
openspec init --tools none

# Substituir perfil para esta execução de init
openspec init --profile core
```

**IDs de ferramentas disponíveis (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `forgecode`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

## Instalação Dependente de Fluxo de Trabalho

O OpenSpec instala artefatos de fluxo de trabalho com base nos fluxos selecionados:

- **Perfil core (padrão):** `propose`, `explore`, `apply`, `archive`
- **Seleção personalizada:** qualquer subconjunto de todos os IDs de fluxo de trabalho:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

Em outras palavras, a quantidade de skills/comandos depende do perfil e do modo de entrega, não é fixa.

## Nomes de Skills Geradas

Quando selecionadas pela configuração de perfil/fluxo de trabalho, o OpenSpec gera estas skills:

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

Veja [Comandos](commands.md) para o comportamento dos comandos e [CLI](cli.md) para as opções de `init`/`update`.

## Relacionados

- [Referência da CLI](cli.md) — Comandos do terminal
- [Comandos](commands.md) — Slash commands e skills
- [Primeiros Passos](getting-started.md) — Configuração inicial
