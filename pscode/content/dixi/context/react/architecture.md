# Arquitetura — React/Next.js (Feature-Sliced Design)

## Camadas (de baixo para cima)

```
pages / app          ← Next.js routes, composição de features
features             ← unidades funcionais independentes
entities             ← modelos de negócio reutilizáveis
shared               ← utilitários, UI base, types globais
```

Camadas superiores podem importar das inferiores. **Camadas inferiores nunca importam das superiores.**

## Estrutura de pastas

```
src/
├── app/                    # Next.js App Router (ou pages/)
│   ├── layout.tsx
│   └── checkout/
│       └── page.tsx        # Apenas composição de features
├── features/
│   ├── checkout/           # Feature autocontida
│   │   ├── components/     # Componentes internos da feature
│   │   ├── hooks/          # Hooks internos
│   │   ├── services/       # Chamadas de API da feature
│   │   ├── types/          # Tipos TypeScript da feature
│   │   └── index.ts        # Barrel export — única entrada pública
│   └── auth/
│       └── index.ts
├── entities/
│   ├── product/
│   │   ├── model.ts        # Tipos e schemas da entidade
│   │   └── index.ts
│   └── user/
│       └── index.ts
└── shared/
    ├── ui/                 # Componentes base (Button, Input, Modal)
    ├── lib/                # Utilitários e helpers
    ├── api/                # Cliente HTTP base (axios, fetch wrapper)
    └── types/              # Tipos globais compartilhados
```

## Regras fundamentais

### No cross-import entre features

Features **não podem importar umas das outras** diretamente:

```typescript
// ❌ PROIBIDO
import { useCart } from '../cart'; // feature cart importando de outra feature

// ✅ CORRETO — mova o dado compartilhado para entities
import { Product } from '@/entities/product';
```

Se duas features precisam de algo em comum, mova esse algo para `entities` ou `shared`.

### Barrel export como contrato público

Tudo que sai de uma feature deve passar pelo `index.ts`:

```typescript
// features/checkout/index.ts
export { CheckoutPage } from './components/CheckoutPage';
export { useCheckoutForm } from './hooks/useCheckoutForm';
export type { CheckoutFormData } from './types';
// Services e hooks internos NÃO são exportados
```

Externos à feature importam **apenas do barrel**:

```typescript
// ✅ CORRETO
import { CheckoutPage } from '@/features/checkout';

// ❌ PROIBIDO — acesso direto a módulo interno
import { CheckoutPage } from '@/features/checkout/components/CheckoutPage';
```

### Pages/App são apenas composição

Pages não contêm lógica de negócio — apenas montam features:

```typescript
// app/checkout/page.tsx
import { CheckoutPage } from '@/features/checkout';
import { AuthGuard } from '@/features/auth';

export default function Page() {
  return (
    <AuthGuard>
      <CheckoutPage />
    </AuthGuard>
  );
}
```

## Quando criar uma nova feature

Crie uma nova feature quando:
- A funcionalidade tem um domínio claramente delimitado
- Possui componentes, hooks e serviços próprios
- Não é reutilizável por natureza (se for reutilizável, considere `entities` ou `shared`)

## Skeleton e guardrails automáticos (profile dixi)

`pscode init --profile dixi` cria automaticamente a estrutura feature-sliced com `.gitkeep` nos diretórios folha e `features/README.md` com as convenções documentadas. Também instala `eslint-architecture.mjs` na raiz com regras `no-restricted-imports` para:

- Isolar features entre si (features não importam umas das outras)
- Impedir que páginas importem lógica de negócio diretamente

Para ativar as regras no ESLint, adicione ao `eslint.config.js`:

```js
import architectureRules from './eslint-architecture.mjs';
export default [...existingConfig, ...architectureRules];
```
