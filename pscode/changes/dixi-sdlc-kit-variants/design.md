## Context

O perfil `dixi` do pscode instala conteúdo no repo do cliente via `pscode init --profile dixi`. Os Batches anteriores adicionaram templates de documentação (C/D) e hooks de arquitetura (G). Este Batch H completa o kit SDLC com arquivos de qualidade (commitlint, editorconfig, PR template) e pipelines CI/CD adaptados por stack.

O `installDixiExtras` já existe (Batch B) e lê `.pscode-dixi.yaml` para detectar `family: java | react`. A lógica de instalação é extensível por adição de novos blocos condicionais.

## Goals / Non-Goals

**Goals:**
- Definir a estrutura de diretórios `pscode/content/dixi/kit/shared|java|react/` com arquivos estáticos de template
- Estender `installDixiExtras` para copiar `shared/` incondicionalmente e `java/` ou `react/` por `family`
- Garantir brownfield-safety: nenhum arquivo existente é sobrescrito (exceto `pull_request_template.md` que é sempre atualizado)
- Exibir instrução pós-instalação com dependências npm/Maven necessárias

**Non-Goals:**
- Instalar `node_modules` ou executar `npm install` / `mvn install` automaticamente
- Modificar `pom.xml` ou `package.json` do projeto do cliente
- Detectar stack automaticamente sem `.pscode-dixi.yaml` (detecção automática é responsabilidade do Batch B)
- Geração de conteúdo dinâmico — todos os arquivos são templates estáticos

## Decisions

### D1 — Estrutura de diretórios `shared/java/react/`

Opção adotada: três subdiretórios dentro de `pscode/content/dixi/kit/`:
- `shared/` — arquivos copiados para todas as stacks
- `java/` — arquivos copiados apenas quando `family: java`
- `react/` — arquivos copiados apenas quando `family: react`

Alternativa descartada: um único diretório com sufixos (`ci-java.yml`, `ci-react.yml`) e lógica de seleção no instalador. Rejeitada porque acoplaria nomes de arquivo à lógica de detecção, tornando mais difícil adicionar stacks futuras.

### D2 — PR template sempre sobrescreve

O `.github/pull_request_template.md` é sempre instalado/atualizado, diferentemente dos outros arquivos que respeitam brownfield-safety. Razão: o template é um artefato de processo da Dixi, não de configuração do projeto — deve estar sempre na versão mais recente.

Alternativa descartada: tratar PR template como os demais (não sobrescrever). Rejeitada porque o template evoluirá e projetos existentes precisam da versão atualizada automaticamente.

### D3 — `ci-java.yml` inclui job ArchUnit que pode falhar

O job `archunit` executa `mvn test -Dtest=ArchitectureTest`. Se o projeto não tiver `ArchitectureTest.java` (gerado pelo Batch I), o job falha com `No tests found`. Decisão: aceitar a falha como sinal de que o Batch I ainda não foi aplicado. O Batch I (skeleton hexagonal) deve ser aplicado antes de habilitar o workflow em CI.

Alternativa descartada: tornar o job `archunit` condicional no YAML (verificar se o arquivo existe). Rejeitada porque YAML de workflows GitHub não suporta condicionais baseadas em arquivos do repo de forma simples.

### D4 — e2e job no `ci-react.yml` usa condição `if`

O job `e2e` usa `if: ${{ hashFiles('playwright.config.ts') != '' }}` para ser skipado se Playwright não estiver configurado. Isso evita falhas em projetos React sem testes E2E.

## Risks / Trade-offs

- **[Risco] Batch I não aplicado + CI ativo** → job `archunit` falha em projetos Java. Mitigação: documentar no post-install message que o workflow CI Java requer Batch I (skeleton hexagonal + ArchitectureTest.java).
- **[Risco] Husky não inicializado** → hooks `.husky/` existem mas não rodam se `npx husky install` não foi executado. Mitigação: post-install message instrui a rodar `npx husky install` e adicionar ao `prepare` script do `package.json`.
- **[Trade-off] PR template sempre sobrescreve** → times com customizações locais no template perderão alterações. Mitigação: documentar o comportamento; teams que customizam devem manter fork do template fora do `.github/`.

## Migration Plan

1. Criar arquivos de conteúdo estático em `pscode/content/dixi/kit/`
2. Estender `installDixiExtras` com bloco de cópia do kit (após instalação de hooks)
3. Adicionar testes de integração cobrindo: java kit instalado, react kit instalado, only-shared quando family ausente
4. Rollback: remover os arquivos copiados manualmente do repo do cliente (não há estado persistente no pscode)

## Open Questions

- O Batch B tem a assinatura de `installDixiExtras` já exposta para extensão ou requer refatoração da função? (Depende do estado atual da implementação do Batch B.)
