## 1. Criar módulo src/core/presets/dixi.ts

- [ ] 1.1 Criar arquivo `src/core/presets/dixi.ts` com os tipos `DixiStack` e `DixiStackFamily`
- [ ] 1.2 Implementar `detectDixiStack(projectDir: string): DixiStack | null` com a lógica de detecção por ordem de prioridade (pom.xml → build.gradle → next.config.* → package.json → pyproject.toml)
- [ ] 1.3 Envolver a leitura de `package.json` em try/catch; fallback para `'node'` se JSON inválido
- [ ] 1.4 Implementar `getDixiStackFamily(stack: DixiStack | null): DixiStackFamily`
- [ ] 1.5 Implementar `getDixiStackLabel(stack: DixiStack | null): string`
- [ ] 1.6 Implementar `installDixiExtras(projectDir: string, stack: DixiStack | null): void` como placeholder com log descritivo

## 2. Integrar detecção em src/core/init.ts

- [ ] 2.1 Adicionar import de `detectDixiStack`, `getDixiStackLabel` e `installDixiExtras` de `./presets/dixi.js`
- [ ] 2.2 Após instalação de workflows em `InitCommand`, adicionar branch condicional `if (profile === 'dixi')`
- [ ] 2.3 Dentro do branch: chamar `detectDixiStack(projectDir)`, logar resultado usando o mecanismo de log existente
- [ ] 2.4 Chamar `installDixiExtras(projectDir, stack)` dentro do branch
- [ ] 2.5 Gravar `.pscode-dixi.yaml` na raiz do `projectDir` com campos `stack`, `family` (via `getDixiStackFamily`) e `detectedAt` (ISO 8601)

## 3. Testes unitários

- [ ] 3.1 Criar `test/core/presets/dixi.test.ts` com setup de diretório temporário por teste (`tmp` ou `os.tmpdir`)
- [ ] 3.2 Teste: `detectDixiStack` retorna `'java-maven'` quando `pom.xml` existe
- [ ] 3.3 Teste: `detectDixiStack` retorna `'java-gradle'` quando apenas `build.gradle` existe
- [ ] 3.4 Teste: `detectDixiStack` retorna `'next'` quando `next.config.js` existe
- [ ] 3.5 Teste: `detectDixiStack` retorna `'next'` quando `package.json` tem `"next"` em `dependencies`
- [ ] 3.6 Teste: `detectDixiStack` retorna `'react'` quando `package.json` tem `"react"` mas não `"next"`
- [ ] 3.7 Teste: `detectDixiStack` retorna `'node'` quando `package.json` existe sem react/next
- [ ] 3.8 Teste: `detectDixiStack` retorna `null` para diretório vazio
- [ ] 3.9 Teste: `detectDixiStack` retorna `'node'` quando `package.json` tem JSON inválido (não deve lançar)
- [ ] 3.10 Teste: `getDixiStackFamily('java-maven')` retorna `'java'`; `getDixiStackFamily('next')` retorna `'react'`
- [ ] 3.11 Smoke test: `InitCommand` com `--profile dixi` em diretório com `pom.xml` executa sem erro e gera `.pscode-dixi.yaml`
- [ ] 3.12 Smoke test: `InitCommand` com `--profile dixi` em diretório com `next.config.js` executa sem erro e gera `.pscode-dixi.yaml`

## 4. Changeset e validação final

- [ ] 4.1 Rodar `pnpm test` e garantir que todos os testes passam (incluindo os novos de `dixi.test.ts`)
- [ ] 4.2 Rodar `pnpm lint` e corrigir eventuais avisos em `dixi.ts` e `init.ts`
- [ ] 4.3 Criar changeset com `pnpm changeset` (tipo `minor`, descrever adição do profile dixi com detecção de stack)
