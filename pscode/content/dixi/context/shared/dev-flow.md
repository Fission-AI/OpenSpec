# Fluxo de Desenvolvimento

## Visão geral

```
RFC → Design → Tasks → Apply → Revisão → Deploy
```

Use `/pstld:rfc` para iniciar o fluxo, `/pstld:dod` para validar antes de abrir o PR.

## Quando criar RFC

Crie uma RFC quando a mudança:

- Afeta a arquitetura de um módulo ou a interface entre módulos
- Introduz uma nova dependência externa
- Muda o contrato de uma API pública
- Demora mais de 1 dia de implementação

Vá direto para task quando:

- É um bug fix isolado com causa clara
- É uma tarefa mecânica sem impacto arquitetural (atualização de cópia, ajuste de estilo, etc.)
- É uma task de refactor de escopo delimitado aprovada previamente

## Fase RFC

1. Use `/pstld:rfc` para gerar o rascunho da RFC
2. A RFC deve conter: contexto, problema, solução proposta, alternativas consideradas, trade-offs
3. Solicite revisão dos tech leads antes de avançar
4. RFC aprovada → avançar para Design

## Fase Design

1. Use `/ps:propose` para gerar o design e as specs
2. O design deve ser revisado antes de iniciar a implementação
3. Specs descrevem comportamento esperado (não implementação)

## Fase Tasks + Apply

1. Use `/ps:apply` para iniciar a implementação
2. Marque cada task como concluída ao terminar
3. Mantenha o escopo — não adicione tarefas não planejadas sem atualizar o design

## Validação antes do PR

Execute `/pstld:dod` para verificar o DoD antes de abrir o PR.

O slash command verifica automaticamente:
- Testes passando
- Cobertura mantida
- Ticket JIRA referenciado nos commits
- Checklist de DoD completo
