# Testes — Java/Spring

## Pirâmide de testes

```
        [E2E — RestAssured]          ← poucos, fluxos críticos
      [Integração — Testcontainers]  ← adapters de saída, APIs
    [Unitários — JUnit 5 + Mockito]  ← domain e application (maioria)
```

## Nível 1 — Testes unitários (domain e application)

Testam lógica pura sem Spring, sem banco, sem rede.

**Ferramentas:** JUnit 5, Mockito

**Onde ficam:** `test/java/.../domain/` e `test/java/.../application/`

```java
// Teste de domain
class PedidoTest {
    @Test
    void dado_pedido_com_itens_quando_confirmar_entao_status_confirmado() {
        // Given
        Pedido pedido = PedidoTestFactory.comUmItem();

        // When
        pedido.confirmar();

        // Then
        assertThat(pedido.getStatus()).isEqualTo(StatusPedido.CONFIRMADO);
    }

    @Test
    void dado_pedido_vazio_quando_confirmar_entao_lanca_excecao() {
        Pedido pedido = PedidoTestFactory.vazio();
        assertThatThrownBy(pedido::confirmar)
            .isInstanceOf(PedidoVazioException.class);
    }
}
```

```java
// Teste de application (use case)
class ConfirmarPedidoServiceTest {
    @Mock PedidoRepository repository;
    @InjectMocks ConfirmarPedidoService service;

    @Test
    void dado_pedido_existente_quando_confirmar_entao_salva_e_retorna() {
        // Given
        Pedido pedido = PedidoTestFactory.comUmItem();
        when(repository.findById(pedido.getId())).thenReturn(Optional.of(pedido));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // When
        Pedido resultado = service.confirmar(pedido.getId());

        // Then
        assertThat(resultado.getStatus()).isEqualTo(StatusPedido.CONFIRMADO);
        verify(repository).save(pedido);
    }
}
```

## Nível 2 — Testes de integração (infrastructure)

Testam adapters com dependências reais (banco, mensageria, APIs externas).

**Ferramentas:** Testcontainers, `@SpringBootTest` com perfil de teste

**Onde ficam:** `test/java/.../infrastructure/`

```java
@SpringBootTest
@Testcontainers
class PedidoJpaRepositoryIT {
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
    }

    @Autowired PedidoRepository repository;

    @Test
    void dado_pedido_salvo_quando_buscar_por_id_entao_retorna() {
        Pedido pedido = repository.save(PedidoTestFactory.comUmItem());
        assertThat(repository.findById(pedido.getId())).isPresent();
    }
}
```

## Nível 3 — Testes E2E (fluxos críticos)

Testam a API completa via HTTP, do controller ao banco.

**Ferramentas:** RestAssured, Testcontainers (banco real)

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class ConfirmarPedidoE2ETest {
    @LocalServerPort int port;

    @Test
    void confirmar_pedido_retorna_200_com_status_confirmado() {
        String pedidoId = criarPedidoViaApi();

        given()
            .port(port)
            .contentType(ContentType.JSON)
        .when()
            .post("/pedidos/{id}/confirmar", pedidoId)
        .then()
            .statusCode(200)
            .body("status", equalTo("CONFIRMADO"));
    }
}
```

## Nomenclatura

Padrão: `dado_[contexto]_quando_[acao]_entao_[resultado]`

```
dado_pedido_com_itens_quando_confirmar_entao_status_confirmado
dado_usuario_inativo_quando_autenticar_entao_lanca_UsuarioInativoException
dado_estoque_zerado_quando_reservar_entao_retorna_false
```

## Cobertura mínima

| Camada          | Cobertura mínima |
|-----------------|-----------------|
| `domain`        | 90%             |
| `application`   | 80%             |
| `infrastructure`| 60% (integração complementa) |

Configure no `pom.xml` com JaCoCo:

```xml
<configuration>
    <rules>
        <rule>
            <element>PACKAGE</element>
            <includes>
                <include>**.domain.**</include>
                <include>**.application.**</include>
            </includes>
            <limits>
                <limit>
                    <counter>LINE</counter>
                    <minimum>0.80</minimum>
                </limit>
            </limits>
        </rule>
    </rules>
</configuration>
```
