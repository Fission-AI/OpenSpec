## 1. Criar módulo src/core/presets/dixi.ts

- [x] 1.1 Criar arquivo `src/core/presets/dixi.ts` com os tipos `DixiStack` e `DixiStackFamily`
- [x] 1.2 Implementar `detectDixiStack(projectDir: string): DixiStack | null` com a lógica de detecção por ordem de prioridade (pom.xml → build.gradle → next.config.* → package.json → pyproject.toml)
- [x] 1.3 Envolver a leitura de `package.json` em try/catch; fallback para `'node'` se JSON inválido
- [x] 1.4 Implementar `getDixiStackFamily(stack: DixiStack | null): DixiStackFamily`
- [x] 1.5 Implementar `getDixiStackLabel(stack: DixiStack | null): string`
- [x] 1.6 Implementar `installDixiExtras(projectDir: string, stack: DixiStack | null): void` como placeholder com log descritivo

## 2. Integrar detecção em src/core/init.ts

- [x] 2.1 Adicionar import de `detectDixiStack`, `getDixiStackLabel` e `installDixiExtras` de `./presets/dixi.js`
- [x] 2.2 Após instalação de workflows em `InitCommand`, adicionar branch condicional `if (profile === 'dixi')`
- [x] 2.3 Dentro do branch: chamar `detectDixiStack(projectDir)`, logar resultado usando o mecanismo de log existente
- [x] 2.4 Chamar `installDixiExtras(projectDir, stack)` dentro do branch
- [x] 2.5 Gravar `.pscode-dixi.yaml` na raiz do `projectDir` com campos `stack`, `family` (via `getDixiStackFamily`) e `detectedAt` (ISO 8601)

## 3. Testes unitários

- [x] 3.1 Criar `test/core/presets/dixi.test.ts` com setup de diretório temporário por teste (`tmp` ou `os.tmpdir`)
- [x] 3.2 Teste: `detectDixiStack` retorna `'java-maven'` quando `pom.xml` existe
- [x] 3.3 Teste: `detectDixiStack` retorna `'java-gradle'` quando apenas `build.gradle` existe
- [x] 3.4 Teste: `detectDixiStack` retorna `'next'` quando `next.config.js` existe
- [x] 3.5 Teste: `detectDixiStack` retorna `'next'` quando `package.json` tem `"next"` em `dependencies`
- [x] 3.6 Teste: `detectDixiStack` retorna `'react'` quando `package.json` tem `"react"` mas não `"next"`
- [x] 3.7 Teste: `detectDixiStack` retorna `'node'` quando `package.json` existe sem react/next
- [x] 3.8 Teste: `detectDixiStack` retorna `null` para diretório vazio
- [x] 3.9 Teste: `detectDixiStack` retorna `'node'` quando `package.json` tem JSON inválido (não deve lançar)
- [x] 3.10 Teste: `getDixiStackFamily('java-maven')` retorna `'java'`; `getDixiStackFamily('next')` retorna `'react'`
- [x] 3.11 Smoke test: `InitCommand` com `--profile dixi` em diretório com `pom.xml` executa sem erro e gera `.pscode-dixi.yaml`
- [x] 3.12 Smoke test: `InitCommand` com `--profile dixi` em diretório com `next.config.js` executa sem erro e gera `.pscode-dixi.yaml`

## 4. Changeset e validação final

- [x] 4.1 Rodar `pnpm test` e garantir que todos os testes passam (incluindo os novos de `dixi.test.ts`)
- [x] 4.2 Rodar `pnpm lint` e corrigir eventuais avisos em `dixi.ts` e `init.ts`
- [x] 4.3 Criar changeset com `pnpm changeset` (tipo `minor`, descrever adição do profile dixi com detecção de stack)
