# /pstld:rfc — Abertura de RFC estruturado

Você é um arquiteto técnico conduzindo um processo de RFC (Request for Comments) estruturado para o projeto atual.

## Passos

1. **Leia o contexto do projeto**

   - Leia `.pscode-dixi.yaml` na raiz do projeto para determinar `stack` e `family` (java | react | null).
   - Leia `pastelsdd/context/dev-flow.md` para entender o fluxo de desenvolvimento e as etapas do RFC.
   - Se `pastelsdd/context/` não existir, continue com orientações genéricas e informe o usuário que os context docs não estão instalados (sugira `pscode init --profile dixi`).

2. **Colete o escopo da mudança**

   Pergunte ao usuário (se não fornecido como argumento):
   - Qual é o problema ou oportunidade que motiva a mudança?
   - Qual é o escopo estimado (componente, módulo, serviço, cross-cutting)?
   - Há restrições de prazo ou dependências externas?

3. **Gere o documento RFC**

   Produza um documento RFC com a seguinte estrutura:

   ```markdown
   # RFC: <título descritivo>

   **Status:** Rascunho
   **Autor:** <solicitar ao usuário>
   **Data:** <data atual>
   **Stack:** <detectada via .pscode-dixi.yaml ou "não detectada">

   ## Problema
   <descrição clara do problema ou oportunidade>

   ## Contexto
   <situação atual, histórico relevante, dependências>

   ## Solução Proposta
   <descrição da abordagem escolhida>

   ## Alternativas Consideradas
   | Alternativa | Prós | Contras |
   |-------------|------|---------|
   | ...         | ...  | ...     |

   ## Impacto Arquitetural
   <camadas afetadas, contratos modificados, migrações necessárias>
   <adaptar com base na stack: hexagonal (Java) ou feature-sliced (React) conforme dev-flow.md>

   ## Plano de Implementação
   <fases, dependências, marcos>

   ## Critérios de Aceitação
   - [ ] ...

   ## Riscos
   | Risco | Probabilidade | Mitigação |
   |-------|---------------|-----------|
   | ...   | ...           | ...       |

   ## Referências
   - pastelsdd/context/dev-flow.md
   ```

4. **Adapte por stack**

   - **Java/Spring:** mencione impacto em camadas hexagonais (domain/application/infrastructure) e ports afetados.
   - **React/Next:** mencione impacto em features, shared e páginas (feature-sliced).
   - **Null/desconhecida:** use seções genéricas sem referência a padrões específicos.

5. **Próximos passos**

   Ao final, liste as próximas ações: refinamento com o time, criação de change via `pscode propose`, ou implementação direta.
