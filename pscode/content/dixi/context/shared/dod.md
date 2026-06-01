# Definition of Done

## Feature

Uma feature está pronta quando:

- [ ] RFC aprovada pelos tech leads (quando mudança significativa)
- [ ] Design revisado e aceito antes da implementação
- [ ] Todas as tasks do `/ps:apply` marcadas como concluídas
- [ ] Testes passando (unitários, integração e E2E conforme pirâmide)
- [ ] Cobertura de testes mantida ou melhorada
- [ ] PR aprovado por pelo menos 1 revisor
- [ ] CHANGELOG ou changeset atualizado
- [ ] Ticket JIRA movido para "Em Teste"

## Bug Fix

Um bug fix está pronto quando:

- [ ] Root cause identificado e documentado no PR ou ticket JIRA
- [ ] Teste de regressão adicionado que reproduz o bug antes da correção
- [ ] Correção implementada e testes passando
- [ ] PR aprovado por pelo menos 1 revisor
- [ ] Ticket JIRA movido para "Em Teste"

## Refactor

Um refactor está pronto quando:

- [ ] Comportamento externo preservado (testes existentes continuam passando sem modificação)
- [ ] Cobertura de testes mantida ou melhorada
- [ ] Nenhuma lógica de negócio foi alterada (se houver, deve virar um `feat` ou `fix`)
- [ ] PR aprovado por pelo menos 1 revisor
- [ ] Sem regressões em funcionalidades adjacentes

## Critério de "Em Produção"

O ciclo só fecha quando a feature ou fix está deployada e monitorada por pelo menos 24h sem alertas.
