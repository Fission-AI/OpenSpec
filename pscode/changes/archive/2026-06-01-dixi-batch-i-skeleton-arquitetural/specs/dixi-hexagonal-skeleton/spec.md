## ADDED Requirements

### Requirement: Skeleton hexagonal é criado em projetos Java
O sistema SHALL criar a estrutura de diretórios da arquitetura hexagonal quando `family === 'java'`, usando os caminhos definidos em `pscode/content/dixi/architectures/hexagonal-spring/skeleton.yaml`, adicionando `.gitkeep` em cada diretório criado.

#### Scenario: Projeto Maven vazio recebe skeleton completo
- **WHEN** `pscode init --profile dixi` é executado em um diretório com `pom.xml` e sem estrutura `src/` prévia
- **THEN** os seguintes diretórios são criados com `.gitkeep`:
  - `src/main/java/{basePackage}/domain/model/`
  - `src/main/java/{basePackage}/domain/port/in/`
  - `src/main/java/{basePackage}/domain/port/out/`
  - `src/main/java/{basePackage}/application/usecase/`
  - `src/main/java/{basePackage}/infrastructure/adapter/in/rest/`
  - `src/main/java/{basePackage}/infrastructure/adapter/out/persistence/`
  - `src/main/java/{basePackage}/infrastructure/config/`
  - `src/test/java/{basePackage}/domain/`
  - `src/test/java/{basePackage}/application/`
  - `src/test/java/{basePackage}/infrastructure/`

#### Scenario: Diretórios existentes não são sobrescritos (brownfield-safe)
- **WHEN** `pscode init --profile dixi` é executado em um projeto que já possui `src/main/java/`
- **THEN** os diretórios existentes são preservados sem modificação e apenas os diretórios ausentes são criados

### Requirement: `basePackage` é detectado a partir do `pom.xml`
O sistema SHALL derivar o `basePackage` lendo `<groupId>` e `<artifactId>` do `pom.xml` e concatenando-os como `<groupId>.<artifactId>` com hífens convertidos para ausência de separador (kebab-to-dot).

#### Scenario: `pom.xml` com groupId e artifactId padrão
- **WHEN** `pom.xml` contém `<groupId>com.dixi</groupId>` e `<artifactId>meu-servico</artifactId>`
- **THEN** `basePackage` é resolvido como `com.dixi.meuservico`

#### Scenario: `pom.xml` ausente ou sem groupId/artifactId
- **WHEN** `pom.xml` não existe ou não contém `<groupId>`/`<artifactId>`
- **THEN** `basePackage` usa o fallback `com.example.app` e o sistema exibe aviso solicitando ajuste manual

### Requirement: `ArchitectureTest.java` é gerado com regras ArchUnit
O sistema SHALL gerar `src/test/java/{basePackage}/ArchitectureTest.java` a partir do template em `hexagonal-spring/ArchitectureTest.java.template`, parametrizado com o `basePackage` detectado, contendo três regras ArchUnit: dependência de domínio sem infra, dependência de aplicação sem infra, e adaptador de entrada sem dependência de adaptador de saída.

#### Scenario: Arquivo gerado em projeto limpo
- **WHEN** `pscode init --profile dixi` é executado em projeto Maven sem `ArchitectureTest.java`
- **THEN** `src/test/java/{basePackage}/ArchitectureTest.java` é criado com o `package` correto e as três `@ArchTest` rules preenchidas

#### Scenario: Arquivo existente não é sobrescrito
- **WHEN** `ArchitectureTest.java` já existe no projeto
- **THEN** o arquivo existente é preservado e uma mensagem informa que o arquivo foi ignorado
