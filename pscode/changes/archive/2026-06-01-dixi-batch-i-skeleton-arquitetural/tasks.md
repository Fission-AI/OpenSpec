## 1. Conteúdo estático — Skeleton Java (hexagonal-spring)

- [x] 1.1 Criar `pscode/content/dixi/architectures/hexagonal-spring/skeleton.yaml` com a lista de 10 diretórios do skeleton hexagonal (domain/model, domain/port/in, domain/port/out, application/usecase, infrastructure/adapter/in/rest, infrastructure/adapter/out/persistence, infrastructure/config + equivalentes em test)
- [x] 1.2 Criar `pscode/content/dixi/architectures/hexagonal-spring/ArchitectureTest.java.template` com placeholder `{basePackage}`, imports ArchUnit e as três `@ArchTest` rules (domínio sem infra, aplicação sem infra, adapter-in sem adapter-out)

## 2. Conteúdo estático — Skeleton React (feature-sliced-react)

- [x] 2.1 Criar `pscode/content/dixi/architectures/feature-sliced-react/skeleton.yaml` com os 7 caminhos do skeleton feature-sliced (`shared/components/ui`, `shared/hooks`, `shared/services`, `shared/types`, `shared/utils`, `entities`, `features`)
- [x] 2.2 Criar `pscode/content/dixi/architectures/feature-sliced-react/features/README.md.template` com estrutura de feature (components, hooks, services, types, index.ts) e a regra de não importação entre features
- [x] 2.3 Criar `pscode/content/dixi/architectures/feature-sliced-react/eslint-architecture.mjs.template` com regras `no-restricted-imports` para isolar features e páginas, incluindo comentário com instrução de integração ao `eslint.config.js`

## 3. Lógica de instalação — `installDixiExtras`

- [x] 3.1 Implementar função `applyHexagonalSkeleton(projectRoot, basePackage)` que lê `skeleton.yaml`, cria cada diretório com `.gitkeep` (skip se já existe) e retorna sumário `{ created, skipped }`
- [x] 3.2 Implementar `detectBasePackage(projectRoot): string` que parseia `pom.xml` com regex/XMLParser para extrair `<groupId>` e `<artifactId>`, converte hífens do artifactId (kebab-to-camel sem separador) e retorna fallback `com.example.app` com aviso se não encontrar
- [x] 3.3 Implementar `generateArchitectureTest(projectRoot, basePackage)` que lê o template, substitui `{basePackage}` e cria o arquivo em `src/test/java/{basePackage}/ArchitectureTest.java` (skip se já existe)
- [x] 3.4 Implementar `applyFeatureSlicedSkeleton(projectRoot)` que lê `skeleton.yaml`, cria diretórios com `.gitkeep` exceto `features/` que recebe `README.md`, brownfield-safe
- [x] 3.5 Implementar `installEslintArchitectureTemplate(projectRoot)` que copia `eslint-architecture.mjs.template` para a raiz como `eslint-architecture.mjs` (skip se existe) e imprime instrução de integração ao `eslint.config.js`
- [x] 3.6 Atualizar `installDixiExtras` para chamar `applyHexagonalSkeleton` + `generateArchitectureTest` se `family === 'java'`, e `applyFeatureSlicedSkeleton` + `installEslintArchitectureTemplate` se `family === 'react'`
- [x] 3.7 Adicionar log estruturado por etapa no formato `[dixi] <etapa>: <N diretórios criados, M ignorados>`

## 4. Testes

- [x] 4.1 Teste de integração: `pscode init --profile dixi` em diretório Maven temporário com `pom.xml` mínimo → verificar que os 10 diretórios com `.gitkeep` e `ArchitectureTest.java` foram criados com o `basePackage` correto
- [x] 4.2 Teste de integração: `pscode init --profile dixi` em diretório Next.js temporário → verificar que `shared/`, `entities/`, `features/README.md` e `eslint-architecture.mjs` foram criados
- [x] 4.3 Teste brownfield Java: executar init em projeto que já tem `src/main/java/` → verificar que nenhum arquivo existente foi modificado
- [x] 4.4 Teste brownfield React: executar init em projeto que já tem `src/shared/` → verificar preservação
- [x] 4.5 Teste de fallback: `detectBasePackage` em diretório sem `pom.xml` → retorna `com.example.app` e emite aviso

## 5. Changeset e documentação

- [x] 5.1 Criar changeset `minor` descrevendo adição do skeleton hexagonal e feature-sliced ao profile dixi
- [x] 5.2 Atualizar `README` ou doc do profile dixi (se existir) mencionando os novos guardrails arquiteturais
