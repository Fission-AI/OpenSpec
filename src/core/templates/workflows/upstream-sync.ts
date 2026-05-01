/**
 * Upstream Sync Workflow Template
 *
 * Guides the process of syncing the BR-OpenSpec fork with the upstream
 * OpenSpec repository, translating new content to Brazilian Portuguese.
 */

import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getUpstreamSyncSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-upstream-sync',
    description: 'Sincroniza o BR-OpenSpec com o upstream e traduz novas mensagens para português brasileiro. Use quando houver atualizações no repositório original que precisem ser incorporadas ao fork.',
    instructions: `Sincronize o BR-OpenSpec com o repositório upstream e traduza o conteúdo novo para português brasileiro.

**Entrada**: O usuário indica que há atualizações no upstream ou pede para sincronizar.

**Pré-requisitos**
- O remote upstream deve estar configurado: 
  \`git remote add upstream https://github.com/original/openspec.git\` (se ainda não estiver)

**Passos**

1. **Verifique o estado atual**
   \`\`\`bash
   git fetch upstream
   git log --oneline HEAD..upstream/main --no-merges | head -20
   \`\`\`
   Isso mostra os commits que serão incorporados.

2. **Crie uma branch para o sync**
   \`\`\`bash
   git checkout -b sync/upstream-$(date +%Y%m%d)
   \`\`\`

3. **Faça o merge do upstream**
   \`\`\`bash
   git merge upstream/main --no-edit
   \`\`\`
   - Se houver conflitos em \`src/messages/index.ts\`, resolva mantendo as mensagens em português brasileiro e incorporando as novas chaves em inglês.
   - Para outros arquivos, resolva normalmente preservando as adaptações do BR-OpenSpec.

4. **Identifique novas strings de usuário**
   Após o merge, encontre strings hardcoded em inglês que ainda não estão no catálogo:
   \`\`\`bash
   git diff upstream/main..HEAD --name-only | grep "^src/"
   \`\`\`
   Busque por novas ocorrências de \`console.log\`, \`console.error\`, \`console.warn\`, \`.description(\`, \`message:\` em arquivos modificados.

5. **Atualize o catálogo de mensagens**
   - Adicione novas chaves em \`src/messages/index.ts\` na seção apropriada
   - Traduza os valores para português brasileiro
   - Mantenha a organização por domínio (CLI_DESCRIPTIONS, CLI_MESSAGES, CHANGE_MESSAGES, etc.)
   - Se uma seção nova for necessária, crie-a com o padrão existente

6. **Substitua strings hardcoded nos arquivos fonte**
   - Substitua cada string em inglês recém-adicionada pela referência ao catálogo
   - Adicione o import necessário de \`../messages/index.js\` (ou caminho relativo apropriado)
   - NÃO traduza: nomes de variáveis, comentários de código, identificadores técnicos, nomes de comandos CLI

7. **Atualize menções ao nome do projeto**
   - Novos textos podem referenciar "OpenSpec" em vez de "BR-OpenSpec"
   - Substitua referências ao nome do projeto em mensagens de usuário: \`s/\\bOpenSpec\\b/BR-OpenSpec/g\`
   - NÃO altere: \`openspec\` (comando), \`openspec-\` (prefixos), \`OPENSPEC_\` (constantes), URLs

8. **Atualize os testes**
   - Rode \`pnpm test\` para identificar testes que quebraram devido às traduções
   - Atualize as expectativas de strings de \`test/\` para refletir as mensagens em português
   - NÃO altere a lógica dos testes — apenas as strings de comparação

9. **Valide o build**
   \`\`\`bash
   pnpm run build
   pnpm exec tsc --noEmit
   pnpm lint
   \`\`\`

10. **Resumo do sync**
    Informe ao usuário:
    - Quais commits foram incorporados
    - Quais arquivos foram modificados
    - Quantas novas mensagens foram traduzidas
    - Se há testes ainda falhando (e por quê)

**IMPORTANTE**: NUNCA traduza código técnico (nomes de variáveis, funções, constantes) ou comentários de documentação de API. Apenas mensagens exibidas ao usuário final.
`,
  };
}

export function getOpsxUpstreamSyncCommandTemplate(): CommandTemplate {
  return {
    name: 'upstream-sync',
    description: 'Sincroniza com upstream e traduz novidades',
    category: 'maintenance',
    tags: ['sync', 'upstream', 'i18n'],
    content: `Sincronize o BR-OpenSpec com o upstream.

1. Verifique atualizações: \`git fetch upstream && git log --oneline HEAD..upstream/main | head -10\`
2. Se houver commits, crie branch e faça merge
3. Identifique e traduza novas strings de usuário
4. Atualize o catálogo em \`src/messages/index.ts\`
5. Valide: \`pnpm run build && pnpm test\`
6. Resuma as mudanças para o usuário`,
  };
}
