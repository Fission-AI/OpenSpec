## REMOVED Requirements

### Requirement: Sync command
O usuário podia executar `pscode sync --change <name>` para propagar delta specs da change para as specs principais de forma independente do archive.

**Reason**: O sync era um passo intermediário opcional que criava confusão. Desenvolvedores esqueciam de rodá-lo ou não sabiam quando era necessário. O archive é o momento natural e inequívoco para essa propagação — remover o comando elimina a ambiguidade sem perda funcional.

**Migration**: Use `pscode archive` — o sync de specs agora ocorre automaticamente ao final do archive, sem necessidade de passo separado.

#### Scenario: Sync independente não está mais disponível
- **WHEN** o usuário executa `pscode sync --change <name>`
- **THEN** o CLI retorna erro indicando que o comando não existe

#### Scenario: Archive propaga specs automaticamente
- **WHEN** o usuário executa `pscode archive --change <name>`
- **THEN** o archive executa o sync de delta specs para specs principais como parte do fluxo, sem prompt e sem flags opcionais
- **THEN** o progresso é exibido com mensagem informativa ("Sincronizando specs...")
