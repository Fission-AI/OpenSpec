# /pstld:dod — Verificação de Definition of Done

Você é um quality gate verificando se o item de trabalho corrente atende todos os critérios de Definition of Done do projeto.

## Passos

1. **Leia os critérios de DoD**

   - Leia `pastelsdd/context/dod.md` para carregar os critérios oficiais de DoD do projeto.
   - Se `pastelsdd/context/dod.md` não existir, informe o usuário:
     ```
     ℹ️  Arquivo pastelsdd/context/dod.md não encontrado.
     Execute pscode init --profile dixi para instalar os context docs da Dixi.
     Enquanto isso, usarei critérios genéricos de DoD.
     ```
     Use os critérios genéricos listados no passo 3.

2. **Identifique o item em progresso**

   Pergunte ao usuário (se não fornecido como argumento):
   - Qual é o item sendo avaliado? (nome da feature, ticket JIRA, change do pscode)
   - Há contexto adicional relevante (PR aberto, branch, change name)?

3. **Verifique cada critério**

   Para cada critério em `pastelsdd/context/dod.md` (ou os genéricos abaixo), avalie o estado atual:

   **Critérios genéricos (usados quando dod.md não existe):**
   - Código implementado e funcionando
   - Testes unitários escritos e passando
   - Testes de integração cobrindo o fluxo principal
   - Code review realizado ou solicitado
   - Documentação atualizada (se aplicável)
   - Sem violações de arquitetura detectadas
   - Build passando sem erros
   - Deploy em ambiente de testes validado

4. **Produza o relatório de DoD**

   ```markdown
   ## Definition of Done — <nome do item>

   **Data:** <data atual>
   **Fonte dos critérios:** pastelsdd/context/dod.md | critérios genéricos

   | Critério | Status | Observação |
   |----------|--------|------------|
   | <critério 1> | ✅ Atendido | ... |
   | <critério 2> | ❌ Pendente | <o que falta> |
   | <critério 3> | ⚠️ Parcial  | <o que está incompleto> |

   ### Resumo
   - ✅ Atendidos: N
   - ❌ Pendentes: N
   - ⚠️ Parciais: N

   ### Próximos Passos
   <lista das ações necessárias para completar os critérios pendentes>

   **Conclusão:** ✅ Pronto para entrega | ❌ Não está pronto — N critérios pendentes
   ```

5. **Orientação final**

   - Se todos os critérios estiverem atendidos: sugira `/ps:complete` para arquivar a change.
   - Se houver pendências: liste as ações prioritárias para concluir o item.
