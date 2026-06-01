# Testes — React/Next.js

## Pirâmide de testes

```
         [E2E — Playwright]           ← fluxos críticos de usuário
       [Componentes — RTL]            ← comportamento visível ao usuário
   [Unitários — Vitest]               ← hooks, services, utils (maioria)
```

## Nível 1 — Testes unitários (hooks, services, utils)

Testam lógica pura sem renderizar componentes.

**Ferramenta:** Vitest

**Onde ficam:** ao lado do arquivo testado (`*.test.ts`) ou em `__tests__/`

```typescript
// features/checkout/hooks/useCheckoutForm.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCheckoutForm } from './useCheckoutForm';

describe('useCheckoutForm', () => {
  it('deve inicializar com campos vazios', () => {
    const { result } = renderHook(() => useCheckoutForm());
    expect(result.current.values.email).toBe('');
  });

  it('deve validar email inválido', async () => {
    const { result } = renderHook(() => useCheckoutForm());
    await act(async () => {
      result.current.setField('email', 'nao-e-email');
      await result.current.validate();
    });
    expect(result.current.errors.email).toBeDefined();
  });
});
```

```typescript
// features/checkout/services/checkoutService.test.ts
import { vi, describe, it, expect } from 'vitest';
import { submitCheckout } from './checkoutService';
import { apiClient } from '@/shared/api';

vi.mock('@/shared/api');

describe('submitCheckout', () => {
  it('deve chamar a API com os dados corretos', async () => {
    const mockPost = vi.mocked(apiClient.post).mockResolvedValue({ data: { orderId: '123' } });
    const result = await submitCheckout({ email: 'test@test.com', items: [] });
    expect(mockPost).toHaveBeenCalledWith('/checkout', expect.objectContaining({ email: 'test@test.com' }));
    expect(result.orderId).toBe('123');
  });
});
```

## Nível 2 — Testes de componentes (React Testing Library)

Testam o comportamento do componente do ponto de vista do usuário, não a implementação.

**Ferramenta:** React Testing Library (RTL) + Vitest

**Princípio:** Consulte elementos como o usuário os veria (por role, label, texto — não por classe CSS ou estrutura interna)

```typescript
// features/checkout/components/CheckoutForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { CheckoutForm } from './CheckoutForm';

describe('CheckoutForm', () => {
  it('deve exibir erro quando email está vazio e o form é enviado', async () => {
    render(<CheckoutForm onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
  });

  it('deve chamar onSubmit com dados corretos quando form é válido', async () => {
    const onSubmit = vi.fn();
    render(<CheckoutForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'user@example.com' }));
  });
});
```

## Nível 3 — Testes E2E (Playwright)

Testam fluxos críticos de ponta a ponta no browser real.

**Ferramenta:** Playwright

**Onde ficam:** `e2e/` na raiz do projeto

**Escopo:** apenas fluxos críticos de negócio (login, checkout, fluxo principal)

```typescript
// e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('usuário consegue completar o checkout', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('E-mail').fill('user@example.com');
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page.getByText('Pedido confirmado!')).toBeVisible();
  await expect(page).toHaveURL(/\/confirmacao/);
});
```

## Configuração

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['**/*.test.*', 'e2e/**', 'src/test/**'],
    },
  },
});
```

## O que NÃO testar

- Lógica de estilo (CSS, classes) — use Storybook para isso
- Detalhes de implementação interna (state do componente, refs)
- Snapshots de componentes complexos — ficam desatualizados rapidamente
