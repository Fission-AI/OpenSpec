# /pstld:arch-check — Verificação de conformidade arquitetural

Você é um guardião de arquitetura verificando se o código atual respeita as regras definidas para o projeto.

## Passos

1. **Leia o contexto do projeto**

   - Leia `.pscode-dixi.yaml` na raiz do projeto para determinar `stack` e `family`.
   - Leia `pastelsdd/context/architecture.md` para carregar as regras arquiteturais vigentes.
   - Se `pastelsdd/context/architecture.md` não existir, informe o usuário e sugira `pscode init --profile dixi` para instalar os context docs.

2. **Determine o escopo da verificação**

   Se o usuário especificou um escopo (arquivo, módulo, camada), foque nele.
   Caso contrário, pergunte: verificação pontual (mudança atual) ou varredura ampla (módulo/serviço)?

3. **Execute a verificação de acordo com a stack**

   ### Java / Spring (Arquitetura Hexagonal)

   Verifique as seguintes regras (conforme `pastelsdd/context/architecture.md`):

   - **Regra de dependência:** `infrastructure → application → domain`. Imports proibidos:
     - `domain.*` importando `application.*` ou `infrastructure.*`
     - `application.*` importando `infrastructure.*`
   - **Nomenclatura por camada:** entidades sem sufixo em `domain/entity/`, use cases em `application/usecase/`, ports em `application/port/in/` e `application/port/out/`, adapters em `infrastructure/adapter/`
   - **Pureza do domínio:** `domain/` sem anotações de framework (Spring, JPA, etc.)
   - **Acesso via interfaces:** adapters acessam `application` somente via ports

   ### React / Next.js (Feature-Sliced Design)

   Verifique as seguintes regras (conforme `pastelsdd/context/architecture.md`):

   - **Isolamento de features:** imports cruzados entre features são proibidos (feature A não importa de feature B)
   - **Camadas permitidas:** `app → pages → widgets → features → entities → shared`
   - **Shared é agnóstico:** `shared/` não importa de nenhuma outra camada
   - **Lógica em pages/app:** lógica de negócio inline em `pages/` ou `app/` é um warning

   ### Stack não detectada

   Execute verificações genéricas: acoplamento excessivo, imports circulares, violações de separação de responsabilidades visíveis no código.

4. **Reporte os resultados**

   ```markdown
   ## Resultado da Verificação Arquitetural

   **Stack:** <detectada>
   **Escopo:** <arquivos/módulos analisados>

   ### Violações Encontradas
   | Arquivo | Linha | Regra Violada | Severidade |
   |---------|-------|---------------|------------|
   | ...     | ...   | ...           | ERRO/WARN  |

   ### Conformidades Verificadas ✅
   - <regra OK>

   ### Recomendações
   - <ação corretiva para cada violação>
   ```

5. **Se não houver violações**, confirme que o código está em conformidade com `pastelsdd/context/architecture.md`.
