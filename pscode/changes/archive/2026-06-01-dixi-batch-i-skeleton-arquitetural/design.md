## Context

O profile `dixi` é instalado via `pscode init --profile dixi` e já detecta a stack (`family === 'java'` | `'react'`) através do Batch B (`installDixiExtras`). Atualmente, a instalação copia apenas arquivos de qualidade (kit SDLC do Batch H) mas não impõe estrutura de pastas nem guardrails arquiteturais.

Sem o skeleton inicial, ArchUnit (Java) não encontra os pacotes que tenta verificar, e as regras ESLint de `no-restricted-imports` (React) não têm os diretórios-alvo para aplicar as restrições. O resultado é que os guardrails ficam instalados mas silenciosos.

O conteúdo estático já tem um padrão no repositório: arquivos em `pscode/content/dixi/` organizados por categoria. Batch H adicionou `kit/shared/`, `kit/java/` e `kit/react/`. Este Batch I adiciona `architectures/hexagonal-spring/` e `architectures/feature-sliced-react/`.

## Goals / Non-Goals

**Goals:**
- Criar os templates e YAMLs de skeleton para ambas as stacks sob `pscode/content/dixi/architectures/`
- Estender `installDixiExtras` para invocar o skeleton correto, brownfield-safe
- Parametrizar `ArchitectureTest.java` com o `basePackage` lido do `pom.xml`
- Fornecer `features/README.md` e instrução (não instalação automática) das regras ESLint para React

**Non-Goals:**
- Instalar dependências npm (`eslint-plugin-*`) ou Maven (`archunit`) automaticamente — apenas instruir
- Modificar projetos que já possuem os diretórios (garantia brownfield: skip silencioso)
- Suportar stacks além de Java/Maven e React/Next.js neste Batch

## Decisions

### D1 — Formato do skeleton: YAML declarativo vs código imperativo

**Escolha:** `skeleton.yaml` declarativo com lista de caminhos a criar.

**Rationale:** Manter consistência com o padrão de conteúdo estático já adotado no repo (YAMLs de configuração, templates de texto). Um YAML é auditável, versionável e legível sem executar código. A lógica de criação de diretórios já existe (ou é trivial de adicionar) em `installDixiExtras`.

**Alternativa rejeitada:** Função TypeScript específica por stack — acoplaria lógica de criação ao código da ferramenta em vez de mantê-la como dado.

---

### D2 — Detecção de `basePackage` para Java

**Escolha:** Ler `pom.xml` → concatenar `<groupId>` + versão kebab-to-dot do `<artifactId>`.

Exemplo: `com.dixi` + `meu-servico` → `com.dixi.meuservico`

**Rationale:** O `pom.xml` é o arquivo canônico de identidade de um projeto Maven. A combinação groupId+artifactId segue a convenção de pacote Java mais difundida.

**Fallback:** Se `pom.xml` não existir ou não tiver `<groupId>`/`<artifactId>`, usar `com.example.app` e emitir aviso para o usuário ajustar manualmente.

---

### D3 — ESLint para React: template vs instalação automática

**Escolha:** Gerar `eslint-architecture.mjs` como template e imprimir instrução de integração; não modificar `eslint.config.js` existente.

**Rationale:** `eslint.config.js` é um arquivo de projeto com alto risco de conflito (flat config vs legacy, plugins já configurados). Sobrescrever causaria regressões brownfield. O template com instrução preserva a autonomia do desenvolvedor e é reversível.

**Alternativa rejeitada:** Merge automático no `eslint.config.js` — muito frágil, parsear ESLint configs é propenso a erros.

## Risks / Trade-offs

- **[Risk] `pom.xml` com estrutura não-padrão** → Fallback para `com.example.app` + aviso explícito. Mitigation: documentar convenção esperada no `ArchitectureTest.java` gerado.
- **[Risk] Projeto React sem `src/`** → `skeleton.yaml` usa caminhos relativos a partir da raiz; `installDixiExtras` deve verificar se `src/` existe antes de criar subdiretórios, criando `src/` se necessário.
- **[Risk] Conflito entre Batch H e Batch I na ordem de instalação** → Batch I depende que Batch H já tenha sido aplicado (ou seja aplicado em conjunto). Documentar dependência no `skeleton.yaml` ou no próprio `installDixiExtras`.
- **[Trade-off] `.gitkeep` em diretórios** → Mantém o skeleton rastreável no git, mas gera arquivos "vazios" no projeto. Alternativa seria não commitar os diretórios vazios — escolhemos `.gitkeep` para garantir que a estrutura seja explicitamente versionada desde o início.

## Migration Plan

1. Adicionar arquivos estáticos em `pscode/content/dixi/architectures/` (sem breaking change)
2. Estender `installDixiExtras` com chamada ao skeleton (adição de comportamento condicional)
3. Executar testes de integração para validar os dois caminhos (java / react)
4. Changeset `minor` — nova funcionalidade sem quebra de API existente

**Rollback:** Remover a chamada ao skeleton de `installDixiExtras` e deletar o diretório `architectures/`. Projetos já inicializados não são afetados (brownfield-safe por design).

## Open Questions

- O método de leitura do `pom.xml` deve usar um parser XML completo ou regex/grep simples? (Impacto: robustez vs dependência extra)
- Para o `eslint-architecture.mjs`, deve ser instalado em `.eslint/` ou na raiz do projeto? (Convenção varia entre projetos Next.js)
