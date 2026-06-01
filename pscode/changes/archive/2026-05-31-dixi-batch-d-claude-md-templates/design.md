## Context

O Batch B estabeleceu `installDixiExtras(projectDir, stack)` como placeholder extensível em `src/core/presets/dixi.ts`. O Batch C instalou os context docs de referência em `pscode/content/dixi/context/`. Este Batch D adiciona a etapa de instalação do `CLAUDE.md` ao `installDixiExtras`.

O `CLAUDE.md` constitucional é o primeiro ponto de contato do Claude Code com as regras do projeto — precisa ser curto, direto e conter apenas o inviolável. Os detalhes técnicos completos ficam nos docs de referência instalados pelo Batch C (em `pastelsdd/context/`), que o CLAUDE.md aponta.

## Goals / Non-Goals

**Goals:**
- Criar `pscode/content/dixi/claude-runtime/CLAUDE.md.java.template` (~100 linhas)
- Criar `pscode/content/dixi/claude-runtime/CLAUDE.md.react.template` (~100 linhas)
- Implementar lógica de instalação em `installDixiExtras`: seleção por `family`, merge com CLAUDE.md existente, fallback Java
- Adicionar changeset `minor`

**Non-Goals:**
- Detectar stack (responsabilidade do Batch B)
- Instalar context docs (`pastelsdd/context/`) (responsabilidade do Batch C)
- Instalar hooks, skills ou commands (responsabilidade dos Batches E–G)
- Suporte a CLAUDE.md em subdiretórios ou multi-repo

## Decisions

### 1. Dois arquivos de template distintos, não um template paramétrico
**Decisão**: dois arquivos estáticos (`CLAUDE.md.java.template`, `CLAUDE.md.react.template`) em vez de um único template com variáveis (`{{stack}}`).
**Rationale**: o conteúdo das duas stacks é suficientemente diferente (arquitetura hexagonal vs feature-sliced design) para justificar arquivos separados. Templates paramétricos adicionariam um engine de substituição sem ganho real — os arquivos são estáticos e lidos inteiros.
**Alternativa descartada**: template único com seções condicionais via comentários — menos legível e mais difícil de manter à medida que o conteúdo cresce.

### 2. Merge via separador `<!-- dixi-constitutional -->`
**Decisão**: ao instalar em projeto com `CLAUDE.md` existente, o sistema appenda o bloco dixi precedido pelo marcador HTML-comment `<!-- dixi-constitutional -->`. Na re-execução, verifica a presença do marcador antes de qualquer ação.
**Rationale**: CLAUDE.md é frequentemente customizado pelo time do cliente — sobrescrever apagaria regras importantes. O marcador é legível em Markdown renderizado (comentário HTML invisível), idempotente e fácil de buscar (`indexOf` ou `includes`).
**Alternativa descartada**: comparar o conteúdo completo do arquivo — frágil (qualquer edição do cliente impede a detecção).

### 3. Fallback para Java quando `family` é null
**Decisão**: se `family` não for `'java'` nem `'react'`, usar `CLAUDE.md.java.template` com log de aviso.
**Rationale**: em times consultoria a stack Java/Spring é a mais comum na Dixi; um CLAUDE.md parcialmente correto é preferível a nenhum CLAUDE.md. O aviso orienta o dev a corrigir `.pscode-dixi.yaml`.
**Alternativa descartada**: não instalar CLAUDE.md quando `family` é null — deixaria o projeto sem guardrails, que é pior que um fallback subótimo.

### 4. Localização dos templates em `pscode/content/dixi/claude-runtime/`
**Decisão**: templates ficam em `pscode/content/dixi/claude-runtime/`, mesmo subdiretório que os comandos (Batch E) e skills (Batch F).
**Rationale**: agrupa tudo que é "conteúdo runtime do Claude Code para Dixi" em um único lugar, facilitando o empacotamento e os testes de integração.

### 5. Leitura do `family` direto do parâmetro `stack`, não relendo `.pscode-dixi.yaml`
**Decisão**: `installDixiExtras(projectDir, stack)` já recebe o objeto `stack` com `family`; usar esse valor diretamente sem re-ler o arquivo YAML.
**Rationale**: evita I/O redundante; `family` já foi computado e gravado pelo Batch B antes da chamada.

## Risks / Trade-offs

- **CLAUDE.md do cliente cresce a cada batch**: Batch D appenda seção Dixi; futuros batches podem adicionar mais seções. → Mitigação: cada batch usa seu próprio marcador (`<!-- dixi-hooks -->`, etc.) e verifica antes de appendar.
- **Templates ficam desatualizados se o projeto evoluir**: o conteúdo do template é fixo em código, não sincronizado com o CLAUDE.md já instalado. → Mitigação: explícito na documentação — o CLAUDE.md instalado é ponto de partida, não atualizado automaticamente.
- **Encoding/line endings em Windows**: templates escritos com `\n`; `fs.writeFileSync` pode produzir `\r\n` em Windows. → Mitigação: usar `{ encoding: 'utf8' }` e normalizar line endings ao escrever.

## Open Questions

- Os templates devem ser incluídos no bundle npm (campo `files` em `package.json`) ou gerados em tempo de build? → Incluir diretamente em `pscode/content/` e listar no `files`; sem geração — são arquivos estáticos simples.
