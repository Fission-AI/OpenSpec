## 1. Estrutura de conteúdo Dixi commands

- [ ] 1.1 Criar diretório `pscode/content/dixi/commands/ps/` com placeholder `propose.md` (skill Dixi-aware do /ps:propose)
- [ ] 1.2 Criar `pscode/content/dixi/commands/ps/explore.md` (skill Dixi-aware do /ps:explore)
- [ ] 1.3 Criar `pscode/content/dixi/commands/ps/apply.md` (skill Dixi-aware do /ps:apply)
- [ ] 1.4 Criar `pscode/content/dixi/commands/ps/archive.md` (skill Dixi-aware do /ps:archive)
- [ ] 1.5 Criar diretório `pscode/content/dixi/commands/pstld/` com `arch-check.md`
- [ ] 1.6 Criar `pscode/content/dixi/commands/pstld/adr.md`
- [ ] 1.7 Criar `pscode/content/dixi/commands/pstld/dod.md`
- [ ] 1.8 Criar `pscode/content/dixi/commands/pstld/jira-draft.md`

## 2. Implementação de installDixiExtras

- [ ] 2.1 Adicionar helper `copyDixiCommands(destRoot, srcDir, subdir)` em `src/core/presets/dixi.ts` que copia todos os arquivos de `srcDir` para `destRoot/<subdir>/` (sobrescrevendo sempre)
- [ ] 2.2 Resolver o package root em `installDixiExtras` (já feito para context docs — reutilizar `packageRoot`)
- [ ] 2.3 Chamar `copyDixiCommands` para os overrides `/ps:*`: origem `pscode/content/dixi/commands/ps/`, destino `.claude/commands/ps/`
- [ ] 2.4 Chamar `copyDixiCommands` para exclusivos `/pstld:*`: origem `pscode/content/dixi/commands/pstld/`, destino `.claude/commands/pstld/`
- [ ] 2.5 Garantir que os diretórios `.claude/commands/ps/` e `.claude/commands/pstld/` sejam criados se não existirem

## 3. Testes

- [ ] 3.1 Adicionar teste em `test/core/presets/dixi.test.ts` — `installDixiExtras` cria arquivo em `.claude/commands/ps/propose.md`
- [ ] 3.2 Adicionar teste — `installDixiExtras` cria arquivo em `.claude/commands/pstld/arch-check.md`
- [ ] 3.3 Adicionar teste — `installDixiExtras` sobrescreve arquivo existente em `.claude/commands/ps/`
- [ ] 3.4 Adicionar teste — arquivos sem versão Dixi em `.claude/commands/ps/` não são alterados

## 4. Validação

- [ ] 4.1 Executar `pscode init --profile dixi` em projeto temporário e verificar presença de `.claude/commands/ps/propose.md` com conteúdo Dixi
- [ ] 4.2 Verificar que `.claude/commands/pstld/arch-check.md` existe após init
- [ ] 4.3 Executar `pnpm test` e garantir que todos os testes passam
- [ ] 4.4 Criar changeset entry para a change
