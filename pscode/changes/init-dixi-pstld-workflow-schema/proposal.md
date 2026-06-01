## Why

O comando `pscode init` sempre grava `schema: spec-driven` no `pscode/config.yaml`, independente do profile escolhido. O profile `dixi` usa o schema `pstld-workflow` (fluxo RFC → Design → Tasks) e precisa que o `config.yaml` já reflita esse schema após o init — sem exigir edição manual.

## What Changes

- Quando `pscode init --profile dixi` for executado, o `config.yaml` gerado deverá conter `schema: pstld-workflow` em vez de `spec-driven`.
- O comportamento para todos os outros profiles permanece inalterado (`spec-driven` como padrão).
- A mensagem de log exibida após o init deve refletir o schema real usado (não hardcoded `spec-driven`).

## Capabilities

### New Capabilities

_(nenhuma nova capability)_

### Modified Capabilities

- `dixi-init-extras`: A lógica de init com `--profile dixi` passa a também definir o schema correto no `config.yaml`. Novos requisitos: o arquivo `pscode/config.yaml` gerado deve conter `schema: pstld-workflow` quando o profile for `dixi`.

## Impact

- `src/core/init.ts` — método `createConfig` e mensagem de log em `displaySuccessMessage`
- Sem impacto em API pública, CLI flags ou schemas existentes
