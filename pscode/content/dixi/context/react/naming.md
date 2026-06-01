# Convenções de Nomenclatura — React/Next.js

## Resumo rápido

| Tipo                  | Convenção          | Exemplos                                     |
|-----------------------|--------------------|----------------------------------------------|
| Componente React      | `PascalCase`       | `CheckoutForm`, `UserAvatar`, `ProductCard`  |
| Hook                  | `use` + PascalCase | `useCheckoutForm`, `useAuth`, `useProductList`|
| Service / função util | `camelCase`        | `submitCheckout`, `formatCurrency`, `parseDate`|
| Arquivo de componente | `kebab-case.tsx`   | `checkout-form.tsx`, `user-avatar.tsx`       |
| Arquivo de hook       | `use-*.ts`         | `use-checkout-form.ts`, `use-auth.ts`        |
| Arquivo de service    | `*-service.ts`     | `checkout-service.ts`, `auth-service.ts`     |
| Constante             | `SCREAMING_SNAKE`  | `MAX_ITEMS`, `API_BASE_URL`, `DEFAULT_TIMEOUT`|
| Tipo / Interface      | `PascalCase`       | `CheckoutFormData`, `UserProfile`, `ApiError`|
| Enum                  | `PascalCase` (valor `SCREAMING_SNAKE`) | `enum Status { ACTIVE = 'ACTIVE' }` |

## Componentes React

**PascalCase** — sempre.

```typescript
// ✅ Correto
export function CheckoutForm() { ... }
export const UserAvatar: React.FC<Props> = () => { ... }

// ❌ Errado
export function checkoutForm() { ... }
export function checkout_form() { ... }
```

Arquivos de componente em **kebab-case**:
```
checkout-form.tsx     ✅
CheckoutForm.tsx      ❌ (exceto se a convenção do projeto usar PascalCase em arquivos)
```

## Hooks

`use` + PascalCase. O nome deve descrever o que o hook faz ou gerencia.

```typescript
// ✅ Correto
function useCheckoutForm() { ... }
function useProductList(categoryId: string) { ... }
function useAuth() { ... }

// ❌ Errado
function checkoutFormHook() { ... }
function UseCheckoutForm() { ... }    // PascalCase não é hook
function useGetProductList() { ... }  // evite "get" — já está implícito
```

## Services (funções de acesso a API ou lógica assíncrona)

**camelCase** para a função, arquivo em **kebab-case**:

```typescript
// checkout-service.ts
export async function submitCheckout(data: CheckoutData): Promise<OrderResponse> { ... }
export async function fetchCheckoutSummary(cartId: string): Promise<Summary> { ... }

// ❌ Errado
export async function SubmitCheckout() { ... }     // PascalCase é componente
export async function submit_checkout() { ... }    // snake_case não é JS/TS
```

## Constantes

**SCREAMING_SNAKE_CASE** para valores imutáveis de escopo global ou de módulo:

```typescript
// ✅ Correto
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_PAGE_SIZE = 20;

// ❌ Errado
const maxRetryAttempts = 3;    // parece variável local mutável
const MaxRetryAttempts = 3;    // PascalCase é componente ou tipo
```

## Tipos e Interfaces

**PascalCase**, com sufixo descritivo quando necessário para clareza:

```typescript
// ✅ Correto
type CheckoutFormData = { email: string; items: CartItem[] };
interface UserProfile { id: string; name: string }
type ApiError = { code: string; message: string };

// Use sufixos quando o nome base é ambíguo
type CheckoutRequest = { ... };   // DTO de entrada
type CheckoutResponse = { ... };  // DTO de saída
type CheckoutState = { ... };     // estado do componente/hook
```

## Props de componentes

Sufixo `Props` no tipo:

```typescript
type CheckoutFormProps = {
  onSubmit: (data: CheckoutFormData) => void;
  initialValues?: Partial<CheckoutFormData>;
};

function CheckoutForm({ onSubmit, initialValues }: CheckoutFormProps) { ... }
```

## Handlers de eventos

Prefixo `handle` para funções internas; prefixo `on` para props de callback:

```typescript
// Props (contrato externo)
type CardProps = {
  onSelect: (id: string) => void;    // prefixo "on"
  onDelete: () => void;
};

// Handlers internos
function ProductCard({ onSelect }: CardProps) {
  function handleClick() {           // prefixo "handle"
    onSelect(product.id);
  }
  return <div onClick={handleClick} />;
}
```
