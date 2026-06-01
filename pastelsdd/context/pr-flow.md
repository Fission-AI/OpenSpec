# Fluxo de Pull Request

## Template de PR

```markdown
## O que muda
<!-- Descreva de forma concisa o que este PR altera -->

## Por que
<!-- Explique a motivação. Referencie o ticket JIRA: [PROJ-123] -->

## Como testar
<!-- Passo a passo para o revisor validar manualmente -->
1. 
2. 
3. 

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Cobertura mantida ou melhorada
- [ ] DoD verificado (`/pstld:dod`)
- [ ] Sem TODOs temporários deixados no código
- [ ] Documentação atualizada (se aplicável)
```

## Referenciando tickets JIRA

- Inclua `[PROJ-123]` no título do PR
- Use `Closes PROJ-123` ou `Refs PROJ-123` na descrição quando a integração JIRA estiver configurada
- O ticket deve estar em "Em Revisão" quando o PR for aberto

## Processo de revisão

1. Abra o PR apontando para a branch de destino (geralmente `main` ou `develop`)
2. Solicite revisão de pelo menos 1 membro do time
3. Responda todos os comentários antes de fazer merge
4. Após aprovação, faça squash merge ou merge commit conforme a convenção do projeto

## Critérios de merge

Um PR pode ser mergeado quando:

- CI passou (build, lint, testes, cobertura)
- Pelo menos 1 aprovação de revisor
- Todos os comentários resolvidos
- Sem conflitos com a branch de destino
- DoD verificado

## Tamanho ideal de PR

Prefira PRs com menos de 400 linhas modificadas. PRs grandes aumentam o tempo de revisão e o risco de bugs passarem despercebidos.

Se o PR estiver muito grande, considere quebrá-lo em partes menores com dependência sequencial.
