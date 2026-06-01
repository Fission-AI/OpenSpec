# Convenção de Commits

## Formato obrigatório

```
tipo(escopo): descrição imperativa [PROJ-123]
```

**Exemplos válidos:**
```
feat(pagamento): adicionar integração com gateway PIX [PAY-456]
fix(auth): corrigir expiração de token JWT [AUTH-789]
refactor(pedido): extrair lógica de cálculo de frete [ORD-321]
test(usuario): adicionar testes de integração para cadastro [USR-100]
docs(readme): atualizar instruções de setup local
chore(deps): atualizar Spring Boot para 3.2.0
```

## Tipos válidos

| Tipo       | Quando usar                                        |
|------------|----------------------------------------------------|
| `feat`     | Nova funcionalidade                                |
| `fix`      | Correção de bug                                    |
| `refactor` | Mudança de código sem alterar comportamento externo|
| `test`     | Adição ou modificação de testes                    |
| `docs`     | Documentação apenas                                |
| `chore`    | Tarefas de manutenção, deps, build, CI             |

## Regras de escopo

O escopo deve corresponder ao módulo, bounded context ou feature afetada.

- Java/Spring: nome do bounded context ou pacote de domínio (ex: `pagamento`, `pedido`, `usuario`)
- React/Next.js: nome da feature ou camada (ex: `checkout`, `auth`, `shared`)

## Ticket JIRA obrigatório

- **Obrigatório** em todos os commits **exceto** `docs` e `chore`
- Formato: `[PROJ-NNN]` ao final da primeira linha
- O ticket deve estar em estado "Em Desenvolvimento" ou "Em Revisão" antes do commit

## Mensagem no imperativo

Use verbos no imperativo: "adicionar", "corrigir", "remover", "atualizar" (não "adicionado", "corrigido").

A mensagem deve completar a frase: *"Se aplicado, este commit vai [mensagem]"*
