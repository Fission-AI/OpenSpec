## ADDED Requirements

### Requirement: Hook arch-guard detecta family do projeto
O hook `arch-guard.mjs` SHALL ler `.pscode-dixi.yaml` no diretório raiz do workspace para determinar a `family` (`java` ou `react`). Se o arquivo não existir ou `family` não estiver definido, o hook SHALL retornar `exit 0` sem emitir nenhuma mensagem.

#### Scenario: Arquivo .pscode-dixi.yaml ausente
- **WHEN** `arch-guard.mjs` é invocado como hook `PreToolUse` em um workspace sem `.pscode-dixi.yaml`
- **THEN** o hook encerra com `exit 0` sem output no stdout ou stderr

#### Scenario: family java configurada
- **WHEN** `.pscode-dixi.yaml` contém `family: java`
- **THEN** o hook ativa a lógica de validação hexagonal

#### Scenario: family react configurada
- **WHEN** `.pscode-dixi.yaml` contém `family: react`
- **THEN** o hook ativa a lógica de validação feature-sliced

---

### Requirement: Bloqueio de violação hexagonal em Java
Para projetos com `family: java`, o hook SHALL bloquear edições a arquivos em `src/**/infrastructure/**` que importem diretamente de pacotes `domain/**` sem passar por uma interface de port.

#### Scenario: Import direto de domain em infrastructure — bloqueado
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/**/infrastructure/**`
- **AND** o conteúdo novo contém um import direto de `domain/` (ex: `import com.acme.domain.model.User`)
- **AND** não há import de uma interface em `domain/port/`
- **THEN** o hook encerra com `exit 2` e mensagem: `"Violação hexagonal: [arquivo] importa diretamente de domain sem porta. Consulte pastelsdd/context/architecture.md"`

#### Scenario: Import via port em infrastructure — permitido
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/**/infrastructure/**`
- **AND** o conteúdo importa apenas de `domain/port/` (interfaces de port)
- **THEN** o hook encerra com `exit 0` sem mensagem

#### Scenario: Arquivo fora de infrastructure — ignorado
- **WHEN** a tool `Edit` ou `Write` altera um arquivo fora de `src/**/infrastructure/**`
- **THEN** a lógica Java não é executada e o hook encerra com `exit 0`

---

### Requirement: Bloqueio de importação cruzada entre features em React
Para projetos com `family: react`, o hook SHALL bloquear edições a arquivos em `src/features/**` que importem de outro diretório dentro de `src/features/`.

#### Scenario: Importação cruzada entre features — bloqueada
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/features/feature-a/**`
- **AND** o conteúdo novo contém um import relativo ou absoluto originando de `src/features/feature-b/`
- **THEN** o hook encerra com `exit 2` e mensagem: `"Violação feature-sliced: importação cruzada entre features. Consulte pastelsdd/context/architecture.md"`

#### Scenario: Import dentro da mesma feature — permitido
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/features/feature-a/**`
- **AND** o import referencia outro módulo dentro de `src/features/feature-a/`
- **THEN** o hook encerra com `exit 0`

#### Scenario: Import de shared ou entities — permitido
- **WHEN** um arquivo em `src/features/**` importa de `src/shared/` ou `src/entities/`
- **THEN** o hook encerra com `exit 0`

---

### Requirement: Warning de lógica de negócio inline em pages/app React
Para projetos com `family: react`, o hook SHALL emitir um warning (não bloqueio) quando detectar lógica de negócio inline em arquivos de `src/app/**` ou `src/pages/**`.

#### Scenario: Hook useState+useEffect longo em page — warning
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/app/**` ou `src/pages/**`
- **AND** o conteúdo contém uso combinado de `useState` e `useEffect` com corpo maior que 10 linhas
- **THEN** o hook encerra com `exit 1` e mensagem de aviso sugerindo extração para hook ou service

#### Scenario: Componente simples em page — permitido
- **WHEN** a tool `Edit` ou `Write` altera um arquivo em `src/app/**` ou `src/pages/**`
- **AND** o conteúdo não contém padrão de lógica inline detectável
- **THEN** o hook encerra com `exit 0`

---

### Requirement: Hook implementado em ESM puro sem dependências externas
O arquivo `arch-guard.mjs` SHALL ser implementado usando apenas APIs nativas do Node.js (`node:fs`, `node:path`, `node:process`). Nenhuma dependência de terceiros ou do pscode poderá ser importada.

#### Scenario: Execução sem node_modules disponível
- **WHEN** o hook é executado em um workspace que não tem `node_modules`
- **THEN** o hook funciona normalmente sem erros de resolução de módulo
