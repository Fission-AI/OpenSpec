## 1. Implementação em src/core/init.ts

- [ ] 1.1 Em `createConfig`, resolver o profile ativo (via `resolveProfileOverride()` + `getGlobalConfig()`) e usar `pstld-workflow` como schema quando `profile === 'dixi'`
- [ ] 1.2 Corrigir a mensagem de log em `displaySuccessMessage` para exibir o schema real gravado (não o `DEFAULT_SCHEMA` hardcoded)

## 2. Testes

- [ ] 2.1 Adicionar teste: `createConfig` com profile `dixi` gera `config.yaml` com `schema: pstld-workflow`
- [ ] 2.2 Adicionar teste: `createConfig` com profile `standard` (ou sem profile) gera `config.yaml` com `schema: spec-driven`
- [ ] 2.3 Adicionar teste: `createConfig` não sobrescreve `config.yaml` existente, independente do profile
