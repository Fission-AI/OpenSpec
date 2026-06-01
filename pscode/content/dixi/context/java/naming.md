# Convenções de Nomenclatura — Java/Spring

## Regra geral

O nome deve revelar o papel da classe na arquitetura hexagonal. Evite sufixos técnicos no domínio; use sufixos técnicos apenas na infraestrutura.

## Domain

Substantivos sem sufixo técnico. Nomes de negócio, não de tecnologia.

| Tipo             | Padrão               | Exemplos válidos                       | Inválidos                          |
|------------------|----------------------|----------------------------------------|------------------------------------|
| Entidade         | `NomeDominio`        | `Pedido`, `Usuario`, `Produto`         | `PedidoEntity`, `UsuarioModel`     |
| Value Object     | `NomeDominio`        | `Email`, `CPF`, `PedidoId`             | `EmailVO`, `CPFValue`              |
| Exceção domínio  | `Motivo + Exception` | `PedidoVazioException`, `SaldoInsuficienteException` | `PedidoError`, `InvalidPedido` |
| Porta de entrada | `Verbo + UseCase`    | `ConfirmarPedidoUseCase`, `BuscarUsuarioUseCase` | `PedidoService`, `PedidoPort` |
| Porta de saída   | `NomeDominio + Repository/Gateway` | `PedidoRepository`, `NotificacaoGateway` | `IPedidoRepo`, `PedidoDAO` |

## Application

Implementações dos use cases. Verbo + sufixo `Service`.

| Tipo        | Padrão              | Exemplos válidos                          | Inválidos                        |
|-------------|---------------------|-------------------------------------------|----------------------------------|
| Use Case impl | `Verbo + Service` | `ConfirmarPedidoService`, `CadastrarUsuarioService` | `PedidoServiceImpl`, `OrderManager` |

## Infrastructure

Sufixos técnicos que revelam o mecanismo de implementação.

| Tipo                   | Padrão                    | Exemplos válidos                              |
|------------------------|---------------------------|-----------------------------------------------|
| Controller REST        | `Dominio + Controller`    | `PedidoController`, `UsuarioController`       |
| JPA Entity             | `Dominio + JpaEntity`     | `PedidoJpaEntity`, `UsuarioJpaEntity`         |
| JPA Repository impl    | `Dominio + JpaRepository` | `PedidoJpaRepository`                         |
| Spring Data interface  | `Dominio + JpaEntityRepository` | `PedidoJpaEntityRepository`             |
| HTTP Client            | `Servico + Client`        | `PagamentoClient`, `NotificacaoClient`        |
| Message Consumer       | `Evento + Consumer`       | `PedidoCriadoConsumer`                        |
| Message Producer       | `Evento + Producer`       | `PedidoConfirmadoProducer`                    |
| Mapper                 | `Dominio + Mapper`        | `PedidoMapper`, `UsuarioMapper`               |
| DTO de entrada         | `Acao + Request`          | `ConfirmarPedidoRequest`, `CadastrarUsuarioRequest` |
| DTO de saída           | `Dominio + Response`      | `PedidoResponse`, `UsuarioResponse`           |

## Packages

Siga a estrutura hexagonal. Use nomes de domínio em lowercase, sem underscores.

```
com.empresa.produto.pedido.domain.model
com.empresa.produto.pedido.domain.port.in
com.empresa.produto.pedido.application.usecase
com.empresa.produto.pedido.infrastructure.adapter.in
```

## Métodos

| Tipo                   | Padrão                | Exemplos                                         |
|------------------------|-----------------------|--------------------------------------------------|
| Use case (comando)     | verbo no infinitivo   | `confirmar()`, `cancelar()`, `processar()`       |
| Use case (query)       | `buscar/listar/obter` | `buscarPorId()`, `listarAtivos()`, `obterSaldo()`|
| Domain action          | verbo de negócio      | `ativar()`, `debitar()`, `aplicarDesconto()`     |
| Factory method         | `criar/novo`          | `criar()`, `criarVazio()`, `novaInstancia()`     |
