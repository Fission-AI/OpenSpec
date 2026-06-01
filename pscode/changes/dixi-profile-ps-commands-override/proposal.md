## Why

Desenvolvedores usando o profile `dixi` precisam aprender dois vocabulários de comandos: `/ps:*` para as operações padrão do pscode e `/pstld:*` para as versões Dixi-específicas. Isso gera fricção desnecessária — o `pscode init --profile dixi` deveria instalar versões Dixi-aware dos comandos padrão nos mesmos slots `/ps:*`, de modo que o dev use sempre o mesmo vocabulário e o comportamento interno seja que muda conforme a stack.

## What Changes

- `installDixiExtras` passa a copiar arquivos de skill Dixi-específicos (ex: `propose.md`, `explore.md`, `apply.md`, `archive.md`) para o diretório do adapter Claude (`.claude/commands/ps/`), **sobrescrevendo** os arquivos padrão instalados pela geração de comandos padrão
- Comandos que têm equivalente no standard (`propose`, `explore`, `apply`, `archive`, `sync`) recebem versões Dixi-aware no namespace `/ps:*`
- Comandos exclusivos do Dixi (`arch-check`, `adr`, `dod`, `jira-draft`) **continuam** no namespace `/pstld:*` e são instalados como comandos adicionais
- O conteúdo dos arquivos Dixi-specific `propose.md`, `explore.md`, `apply.md`, `archive.md` é a versão stack-aware dos respectivos skills padrão (com instruções extras de ADR, DoD, Jira, etc.)
- A instalação dos overrides ocorre **após** `generateSkillsAndCommands` no fluxo do `InitCommand`, garantindo que os arquivos Dixi sobrescrevam os padrão

## Capabilities

### New Capabilities

- `dixi-ps-command-overrides`: Mecanismo pelo qual `installDixiExtras` instala versões Dixi-aware dos comandos `/ps:*` para o adapter Claude, sobrescrevendo os arquivos padrão gerados por `generateSkillsAndCommands`

### Modified Capabilities

- `dixi-init-extras`: A função `installDixiExtras` passa a instalar os overrides de comandos `/ps:*` para o Claude adapter, além de copiar context docs (comportamento já existente)

## Impact

- `src/core/presets/dixi.ts` — `installDixiExtras` ganha lógica de cópia de comandos Claude
- `pscode/content/dixi/commands/` — novo diretório com os arquivos de skill Dixi-aware (`propose.md`, `explore.md`, `apply.md`, `archive.md`, mais `/pstld:*` exclusivos)
- `.claude/commands/ps/` no projeto do cliente — arquivos sobrescritos pelo `installDixiExtras`
- Sem breaking changes na API pública do pscode; mudança é exclusiva ao profile `dixi`
