# Spec: pstld-arch-guardian-skill

## Purpose

Skill que atua como guardião arquitetural, detectando a stack do projeto via `.pscode-dixi.yaml` e aplicando verificações de conformidade arquitetural antes de aceitar edições de código — hexagonal para Java, feature-sliced para React/Next.

## Requirements

### Requirement: Skill detecta a stack do projeto antes de agir
A skill `pstld-arch-guardian` SHALL ler o arquivo `.pscode-dixi.yaml` na raiz do projeto para determinar o campo `family` (`java` ou `react`) antes de aplicar qualquer verificação. Se o arquivo não existir ou `family` for `null`/`node`, a skill SHALL abster-se de verificar arquitetura.

#### Scenario: Stack Java detectada
- **WHEN** `.pscode-dixi.yaml` existe com `family: java`
- **THEN** a skill aplica a lógica de verificação hexagonal

#### Scenario: Stack React detectada
- **WHEN** `.pscode-dixi.yaml` existe com `family: react`
- **THEN** a skill aplica a lógica de verificação feature-sliced

#### Scenario: Arquivo de configuração ausente
- **WHEN** `.pscode-dixi.yaml` não existe no projeto
- **THEN** a skill não realiza nenhuma verificação e prossegue normalmente

---

### Requirement: Guardião arquitetural hexagonal para Java
Quando `family === 'java'` e o arquivo editado estiver em `src/**/infrastructure/**`, a skill SHALL verificar se o conteúdo novo contém imports diretos de pacotes `domain/**` sem passar por uma porta. Se detectar violação, a skill MUST bloquear a edição e exibir mensagem explicativa com referência a `pastelsdd/context/architecture.md`.

#### Scenario: Import direto de domain em infrastructure — bloqueado
- **WHEN** o arquivo alvo está em `src/**/infrastructure/**` e o conteúdo novo importa diretamente de `domain/model/` ou `domain/port/` sem usar interface de porta
- **THEN** a skill bloqueia a edição com mensagem: "Violação hexagonal: [arquivo] importa diretamente de domain sem porta. Consulte pastelsdd/context/architecture.md"

#### Scenario: Import correto via porta — permitido
- **WHEN** o arquivo alvo está em `src/**/infrastructure/**` e importa apenas de `domain/port/out/` ou `domain/port/in/`
- **THEN** a skill permite a edição sem mensagem de bloqueio

#### Scenario: Arquivo fora de infrastructure — não verificado
- **WHEN** o arquivo alvo não está em `src/**/infrastructure/**`
- **THEN** a skill não aplica verificação hexagonal

---

### Requirement: Guardião arquitetural feature-sliced para React/Next
Quando `family === 'react'` e o arquivo editado estiver em `src/features/**`, a skill SHALL verificar se o conteúdo novo contém import de outro diretório sob `src/features/` (import cruzado entre features). Se detectar, a skill MUST bloquear. Para arquivos em `src/app/**` ou `src/pages/**`, a skill SHALL emitir warning (não bloquear) se detectar lógica de negócio inline.

#### Scenario: Import cruzado entre features — bloqueado
- **WHEN** o arquivo alvo está em `src/features/feature-a/` e o conteúdo novo importa de `../feature-b/` ou qualquer outro diretório sob `src/features/`
- **THEN** a skill bloqueia com mensagem: "Violação feature-sliced: importação cruzada entre features. Consulte pastelsdd/context/architecture.md"

#### Scenario: Import dentro da mesma feature — permitido
- **WHEN** o arquivo alvo está em `src/features/feature-a/` e importa apenas de dentro do mesmo diretório ou de `src/shared/`
- **THEN** a skill permite a edição

#### Scenario: Lógica de negócio inline em página — warning
- **WHEN** o arquivo alvo está em `src/app/**` ou `src/pages/**` e o conteúdo contém hooks com useState+useEffect com mais de 10 linhas ou funções de transformação de dados
- **THEN** a skill emite aviso (exit 1) sem bloquear a edição
