# pstld-arch-guardian

## Trigger

Esta skill é auto-invocada **antes de aplicar uma edição** em arquivos que se enquadrem em:

- Java: `src/**/infrastructure/**`
- React/Next: `src/features/**`, `src/app/**`, `src/pages/**`

---

## Comportamento

### 1. Detectar stack do projeto

Leia `.pscode-dixi.yaml` na raiz do projeto e extraia o campo `family`.

- Se o arquivo **não existir** ou `family` for `null` ou não reconhecido → **não faça nenhuma verificação**, prossiga normalmente.
- Se `family: java` → aplique verificação hexagonal (seção 2).
- Se `family: react` → aplique verificação feature-sliced (seção 3).

---

### 2. Verificação hexagonal (Java)

Aplicável quando `family: java` e o arquivo editado está em `src/**/infrastructure/**`.

**Bloqueio — import direto de domain sem porta:**

Verifique se o novo conteúdo do arquivo contém imports de pacotes como:
- `import ...domain.model.*`
- `import ...domain.entity.*`
- `import ...domain.service.*`

...sem passar por uma interface de porta (`domain.port.in.*` ou `domain.port.out.*`).

Se detectar esta violação:

> ❌ **Violação hexagonal detectada**
>
> O arquivo `[caminho do arquivo]` importa diretamente de `domain/` sem usar uma porta.
> A regra de dependência exige que `infrastructure` acesse `domain` apenas via interfaces de porta.
>
> Consulte `pastelsdd/context/architecture.md` para a lista de imports permitidos.
>
> **A edição foi bloqueada.** Refatore para usar a porta adequada antes de continuar.

**Permitido — import via porta:**

Se o arquivo importa apenas de `domain.port.in.*` ou `domain.port.out.*`, permita a edição sem mensagem.

**Fora de infrastructure:**

Se o arquivo não está em `src/**/infrastructure/**`, não aplique nenhuma verificação hexagonal.

---

### 3. Verificação feature-sliced (React/Next)

Aplicável quando `family: react`.

#### 3a. Import cruzado entre features (bloqueio)

Se o arquivo editado está em `src/features/<feature-a>/` e o novo conteúdo importa de outro diretório sob `src/features/` (ex: `../feature-b/`, `../../features/feature-b/`):

> ❌ **Violação feature-sliced detectada**
>
> O arquivo `[caminho]` importa de outra feature (`[feature-b]`).
> Features devem ser independentes entre si — imports cruzados criam acoplamento proibido.
>
> Use `src/shared/` para código reutilizado entre features.
> Consulte `pastelsdd/context/architecture.md`.
>
> **A edição foi bloqueada.**

**Permitido:** imports dentro da mesma feature ou de `src/shared/`.

#### 3b. Lógica de negócio inline em páginas (warning)

Se o arquivo editado está em `src/app/**` ou `src/pages/**` e o novo conteúdo contém qualquer um dos sinais abaixo:
- Hook `useState` + `useEffect` com corpo de mais de 10 linhas no mesmo componente
- Função de transformação/validação de dados definida inline no componente (não em hook separado)

Emita aviso (não bloqueie):

> ⚠️ **Atenção — lógica de negócio em página detectada**
>
> O componente em `[caminho]` parece conter lógica de negócio inline.
> Considere extrair para um custom hook em `src/features/` ou `src/shared/hooks/`.
>
> Consulte `pastelsdd/context/architecture.md` para o padrão recomendado.
>
> A edição foi aplicada, mas revise antes de finalizar.

---

## Comportamento seguro

- Se `.pscode-dixi.yaml` não existe → nenhuma ação, nenhum erro.
- Se `family` tem valor desconhecido → nenhuma ação.
- Em nenhuma hipótese esta skill modifica arquivos fora do arquivo-alvo da edição original.
