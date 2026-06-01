# Arquitetura — Java/Spring (Hexagonal)

## Estrutura de pacotes obrigatória

```
com.example.app/
├── domain/
│   ├── model/          # Entidades, value objects, agregados
│   ├── port/
│   │   ├── in/         # Use case interfaces (portas de entrada)
│   │   └── out/        # Repository, gateway interfaces (portas de saída)
│   └── exception/      # Exceções de domínio
├── application/
│   └── usecase/        # Implementações dos use cases
└── infrastructure/
    └── adapter/
        ├── in/         # Controllers REST, consumers de mensagem
        └── out/        # Implementations de repository, clientes HTTP
```

## Regras de dependência

```
infrastructure → application → domain
```

- `domain` não importa nada externo ao próprio domínio
- `application` importa apenas `domain`
- `infrastructure` importa `application` e `domain`, mas nunca ao contrário
- Frameworks Spring (anotações, contexto) pertencem à camada `infrastructure`

## Exemplos por camada

### Domain — modelo

```java
// domain/model/Pedido.java
public class Pedido {
    private final PedidoId id;
    private final List<ItemPedido> itens;
    private StatusPedido status;

    public void confirmar() {
        if (itens.isEmpty()) throw new PedidoVazioException();
        this.status = StatusPedido.CONFIRMADO;
    }
}
```

### Domain — porta de entrada

```java
// domain/port/in/ConfirmarPedidoUseCase.java
public interface ConfirmarPedidoUseCase {
    Pedido confirmar(PedidoId pedidoId);
}
```

### Domain — porta de saída

```java
// domain/port/out/PedidoRepository.java
public interface PedidoRepository {
    Optional<Pedido> findById(PedidoId id);
    Pedido save(Pedido pedido);
}
```

### Application — use case

```java
// application/usecase/ConfirmarPedidoService.java
@Service
public class ConfirmarPedidoService implements ConfirmarPedidoUseCase {
    private final PedidoRepository repository;

    @Override
    public Pedido confirmar(PedidoId pedidoId) {
        Pedido pedido = repository.findById(pedidoId)
            .orElseThrow(() -> new PedidoNaoEncontradoException(pedidoId));
        pedido.confirmar();
        return repository.save(pedido);
    }
}
```

### Infrastructure — adapter de entrada

```java
// infrastructure/adapter/in/PedidoController.java
@RestController
@RequestMapping("/pedidos")
public class PedidoController {
    private final ConfirmarPedidoUseCase confirmarPedido;

    @PostMapping("/{id}/confirmar")
    public ResponseEntity<PedidoResponse> confirmar(@PathVariable String id) {
        Pedido pedido = confirmarPedido.confirmar(new PedidoId(id));
        return ResponseEntity.ok(PedidoMapper.toResponse(pedido));
    }
}
```

### Infrastructure — adapter de saída

```java
// infrastructure/adapter/out/PedidoJpaRepository.java
@Repository
public class PedidoJpaRepository implements PedidoRepository {
    private final PedidoJpaEntityRepository jpa;

    @Override
    public Optional<Pedido> findById(PedidoId id) {
        return jpa.findById(id.value()).map(PedidoMapper::toDomain);
    }
}
```

## Regras adicionais

- **Sem lógica de negócio em controllers ou repositories** — toda regra de negócio fica em `domain` ou `application`
- **Entidades de domínio são imutáveis por padrão** — use construtores e métodos explícitos, evite setters
- **Mappers** ficam em `infrastructure` para converter entre entidades de domínio e entidades JPA/DTOs
- **Anotações Spring** (`@Service`, `@Repository`, `@RestController`) pertencem à infraestrutura, não ao domínio

## Skeleton e guardrails automáticos (profile dixi)

`pscode init --profile dixi` cria automaticamente o skeleton de pastas hexagonal com `.gitkeep` em cada diretório e gera `src/test/java/{basePackage}/ArchitectureTest.java` com três regras ArchUnit pré-configuradas:

1. `domain` não depende de `infrastructure`
2. `application` não depende de `infrastructure`
3. `infrastructure.adapter.in` não depende de `infrastructure.adapter.out`

O `basePackage` é detectado automaticamente do `pom.xml` (`groupId` + `artifactId` sem hífens). Adicione a dependência ArchUnit ao `pom.xml` para ativar as verificações:

```xml
<dependency>
  <groupId>com.tngtech.archunit</groupId>
  <artifactId>archunit-junit5</artifactId>
  <version>1.3.0</version>
  <scope>test</scope>
</dependency>
```
