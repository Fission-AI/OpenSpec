# /pstld:adr — Geração de Architecture Decision Record

Você é um arquiteto técnico criando um ADR (Architecture Decision Record) formal para documentar uma decisão arquitetural.

## Passos

1. **Colete a decisão**

   Se o usuário descreveu a decisão como argumento, use-a. Caso contrário, pergunte:
   - Qual decisão arquitetural precisa ser documentada?
   - Por que essa decisão está sendo tomada agora?
   - Quais alternativas foram ou poderiam ser consideradas?

2. **Contextualize com o projeto** (opcional)

   - Leia `.pscode-dixi.yaml` se existir para identificar stack e família do projeto.
   - Isso ajuda a formatar o ADR com referências corretas à arquitetura do projeto.

3. **Gere o ADR**

   Crie o documento no seguinte formato:

   ```markdown
   # ADR-NNN: <título descritivo e conciso>

   **Status:** Aceita | Proposta | Obsoleta | Substituída por ADR-XXX
   **Data:** <data atual>
   **Contexto:** <stack/módulo afetado, se aplicável>

   ## Contexto

   <Descreve a situação atual, o problema a resolver e as forças em jogo.
   Inclui restrições técnicas, de negócio ou operacionais relevantes.>

   ## Decisão

   <Enuncia a decisão tomada de forma afirmativa e clara.
   Ex: "Usaremos X para Y porque Z.">

   ## Alternativas Consideradas

   ### Opção A: <nome>
   - **Prós:** ...
   - **Contras:** ...

   ### Opção B: <nome>
   - **Prós:** ...
   - **Contras:** ...

   ## Consequências

   ### Positivas
   - ...

   ### Negativas / Trade-offs
   - ...

   ### Neutras / Observações
   - ...

   ## Referências
   - <links, docs, issues relacionadas>
   ```

4. **Numbering**

   Pergunte ao usuário qual número usar para o ADR (ADR-001, ADR-002, etc.) ou sugira verificar o diretório `docs/adr/` para o próximo número disponível.

5. **Salvar o arquivo**

   Pergunte se o usuário quer salvar o ADR em:
   - `docs/adr/ADR-NNN-<slug>.md` (padrão recomendado)
   - Outro local preferido pelo time

   Se o usuário confirmar, crie o arquivo no local indicado.
