## Context

O pscode suporta profiles via `pscode init --profile <name>`. O profile `standard` instala workflows padrão; o profile `dixi` deve instalar conteúdo adicional (CLAUDE.md, context docs, commands, skills, hooks) de forma stack-específica. Atualmente `InitCommand` trata `dixi` como `standard` — sem branch de execução próprio.

Os batches C–J dependem de dois contratos estabelecidos neste batch:
1. **`.pscode-dixi.yaml`** — arquivo gerado na raiz do cliente contendo `stack`, `family` e `detectedAt`. Lido em runtime pelos hooks (Batch G) e skills (Batch F).
2. **`installDixiExtras(projectDir, stack)`** — função chamada por `init.ts` que, neste batch, é um placeholder; batches posteriores a preenchem.

Stack de detecção é file-based e síncrona, rodando na inicialização (processo de setup, não hot path de execução).

## Goals / Non-Goals

**Goals:**
- Criar `src/core/presets/dixi.ts` com tipos `DixiStack`/`DixiStackFamily` e funções `detectDixiStack`, `getDixiStackFamily`, `getDixiStackLabel`
- Integrar detecção em `src/core/init.ts` sob `profile === 'dixi'`
- Gravar `.pscode-dixi.yaml` na raiz do projeto cliente após detecção
- Fornecer `installDixiExtras` como placeholder extensível
- Cobrir detecção com testes unitários em `test/core/presets/dixi.test.ts`

**Non-Goals:**
- Instalar qualquer conteúdo real (CLAUDE.md, context docs, hooks, commands, skills) — escopo dos batches C–J
- Detecção de versões específicas de Java ou React
- Suporte a mono-repos com múltiplas stacks no mesmo `projectDir`
- Redetecção automática em mudanças posteriores do projeto

## Decisions

### 1. Módulo `src/core/presets/dixi.ts` separado de `init.ts`
**Decisão**: toda a lógica de detecção fica em `presets/dixi.ts`, não em `init.ts`.
**Rationale**: `init.ts` já é extenso e os batches F, G e outros precisarão importar `DixiStack` e `getDixiStackFamily` diretamente, sem passar pelo init. Um módulo dedicado também permite testar detecção de forma isolada sem instanciar `InitCommand`.
**Alternativa descartada**: colocar em `init.ts` — aumentaria o acoplamento e dificultaria o uso pelos hooks de runtime.

### 2. Detecção síncrona via `fs.existsSync` e `JSON.parse`
**Decisão**: usar `fs.existsSync` para verificar arquivos e `fs.readFileSync` + `JSON.parse` para inspecionar `package.json`. Nenhuma I/O assíncrona.
**Rationale**: o init é um processo de setup one-shot; a simplicidade síncrona reduz surface de erro (sem races, sem `await` esquecido). `package.json` é tipicamente pequeno (<50 KB), sem risco de performance.
**Alternativa descartada**: `fs.promises` — adicionaria complexidade sem benefício real para esse contexto.

### 3. Ordem de detecção por prioridade explícita
**Decisão**: a ordem é `pom.xml` → `build.gradle` → `next.config.*` → `package.json[next]` → `package.json[react]` → `package.json` → `pyproject.toml` → `null`.
**Rationale**: projetos Java/Maven raramente têm `package.json`; priorizar `pom.xml` evita falsos positivos. `next.config.*` tem prioridade sobre `package.json` por ser mais canônico. Em caso de coexistência rara (ex: fullstack mono-repo), Java vence — a descrição do batch não cobre esse cenário.

### 4. `.pscode-dixi.yaml` sobrescreve sempre
**Decisão**: `installDixiExtras` sempre regrava `.pscode-dixi.yaml`, mesmo se já existir.
**Rationale**: `pscode init` é idempotente por convenção; redetectar a stack a cada run garante que mudanças no projeto (ex: migração de Maven para Gradle) sejam refletidas. O arquivo é pequeno e barato de sobrescrever.
**Alternativa descartada**: só gravar se não existir — ocultaria divergência entre stack atual e arquivo existente.

### 5. `installDixiExtras` como placeholder neste batch
**Decisão**: `installDixiExtras(projectDir, stack)` neste batch apenas loga uma mensagem descritiva e retorna sem criar arquivos.
**Rationale**: o contrato da função (assinatura + localização) precisa existir para que os batches C–J façam `import { installDixiExtras }` sem quebrar. Implementar o conteúdo real aqui misturaria responsabilidades.

## Risks / Trade-offs

- **Projetos brownfield com múltiplos indicadores** (ex: Java + `package.json` para ferramentas de build frontend): a ordem de prioridade escolhe Java — pode não refletir a stack principal do ponto de vista do dev. → Mitigação: documentar a ordem no log; o usuário pode editar `.pscode-dixi.yaml` manualmente.
- **`package.json` malformado**: `JSON.parse` lança exceção. → Mitigação: envolver em `try/catch`; se falhar, tratar como `package.json` existente sem dependências (retornar `'node'`).
- **`.pscode-dixi.yaml` comitado por acidente**: contém timestamp, o que gera diffs desnecessários. → Mitigação: instrução na saída do init para adicionar ao `.gitignore`; batches posteriores podem automatizar isso.

## Open Questions

- O log de `installDixiExtras` deve usar o logger existente do pscode ou `console.log`? → Usar o mesmo mecanismo de log já adotado em `init.ts` para consistência.
- `.pscode-dixi.yaml` deve ser adicionado ao `.gitignore` automaticamente pelo init? → Escopo de um batch futuro (não deste); registrar como TODO no placeholder.
