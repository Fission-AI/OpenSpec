## Why

O perfil Dixi do pscode precisa instruir o Claude Code sobre as regras invioláveis de cada stack logo no início de qualquer sessão. Sem um `CLAUDE.md` constitucional instalado, o agente opera sem guardrails de arquitetura, nomenclatura e workflow — tornando os hooks e skills do Batch G e Batch F reativos em vez de preventivos.

## What Changes

- Novo arquivo `pscode/content/dixi/claude-runtime/CLAUDE.md.java.template` (~100 linhas): regras constitucionais para Java/Spring com arquitetura hexagonal.
- Novo arquivo `pscode/content/dixi/claude-runtime/CLAUDE.md.react.template` (~100 linhas): regras constitucionais para React/Next.js + TypeScript com feature-sliced design.
- Atualização em `installDixiExtras` (src/core/profiles/dixi/install.ts): detectar `family` via `.pscode-dixi.yaml`, copiar o template correto, fazer **merge** se `CLAUDE.md` já existir no projeto alvo — nunca sobrescrever conteúdo existente.
- Fallback: se `family` for `null` ou desconhecido, instalar o template Java com aviso no console.
- Changeset: `minor`.

## Capabilities

### New Capabilities

- `dixi-claude-md-java`: Template CLAUDE.md constitucional para stack Java/Spring — arquitetura hexagonal, 3 camadas (domain/application/infrastructure), regras de imports, nomenclatura por camada, commits com ticket JIRA, ponteiros para `pastelsdd/context/`.
- `dixi-claude-md-react`: Template CLAUDE.md constitucional para stack React/Next.js + TypeScript — feature-sliced design, regras de imports entre features, nomenclatura de componentes/hooks/services, commits com ticket JIRA, ponteiros para `pastelsdd/context/`.
- `dixi-claude-md-install`: Lógica de instalação em `installDixiExtras` — detecção de stack, seleção de template, merge com CLAUDE.md existente, fallback para Java com aviso.

### Modified Capabilities

## Impact

- `src/core/profiles/dixi/install.ts` (ou equivalente onde `installDixiExtras` está definido) — adicionar etapa de instalação do CLAUDE.md.
- `pscode/content/dixi/claude-runtime/` — novo subdiretório com os dois templates.
- Projetos clientes que rodam `pscode init --profile dixi` — recebem um `CLAUDE.md` apropriado para sua stack.
- Sem breaking changes; adição pura.
