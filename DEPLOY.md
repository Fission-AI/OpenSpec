# Configuração de Deploy e CI/CD

Este documento descreve as configurações necessárias para que os workflows do GitHub Actions e o deploy para npm funcionem corretamente no fork BR-OpenSpec.

---

## 1. Ambiente Local para Testes

### Requisitos

- **Node.js**: ≥ 20.19.0 (recomendado 24.x para compatibilidade com OIDC)
- **pnpm**: 9.x (lockfile compatível)
- **TypeScript**: 5.9+

### Comandos de Verificação

```bash
# Verificar versões
node --version    # v20.19.0 ou superior
pnpm --version    # 9.x

# Instalar dependências
pnpm install --frozen-lockfile

# Build
pnpm run build

# Testes
pnpm test

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

### Ambiente Atual do Workspace

- Node.js: v24.14.0 ✅
- pnpm: 10.33.2 ⚠️ (lockfile do projeto é para pnpm 9; funciona mas pode gerar warnings)
- TypeScript: 5.9.3 ✅

> **Nota**: O lockfile (`pnpm-lock.yaml`) foi gerado com pnpm 9. Se usar pnpm 10, pode ser necessário rodar `pnpm install` sem `--frozen-lockfile` para atualizar o lockfile, ou usar `COREPACK_ENABLE_AUTO_PIN=0` para evitar conflitos.

---

## 2. Configurações do Repositório GitHub

### 2.1 Secrets Necessários

Acesse **Settings → Secrets and variables → Actions** no repositório `fkmatsuda/BR-OpenSpec`.

#### Secrets (Encrypted)

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `APP_PRIVATE_KEY` | Private key do GitHub App para geração de token. Usado no workflow `release-prepare.yml` para criar/atualizar o PR de versionamento. | **Sim** (para release automático) |

#### Variables (Não-encriptadas)

| Variable | Descrição | Obrigatório |
|----------|-----------|-------------|
| `APP_ID` | ID do GitHub App instalado no repositório. Usado junto com `APP_PRIVATE_KEY`. | **Sim** (para release automático) |

### 2.2 GitHub App para Release

O workflow `release-prepare.yml` usa um GitHub App para gerar tokens que permitem:
- Criar/atualizar o PR "Version Packages"
- Disparar CI no PR de versionamento (o `GITHUB_TOKEN` padrão não dispara workflows)

#### Como Configurar

1. **Criar GitHub App** (ou usar uma existente):
   - Acesse **Settings → Developer settings → GitHub Apps → New GitHub App**
   - Nome: `BR-OpenSpec Release Bot` (ou qualquer nome)
   - Homepage URL: `https://github.com/fkmatsuda/BR-OpenSpec`
   - **Desmarque** "Active" em Webhook (não precisamos)
   - Permissões necessárias:
     - **Contents**: Read and write
     - **Pull requests**: Read and write
     - **Actions**: Read (opcional, para verificar CI)

2. **Gerar Private Key**:
   - Na página do App, vá em **Private keys → Generate a private key**
   - Baixe o arquivo `.pem`
   - Converta para formato que o action aceite (base64 ou texto direto)

3. **Instalar o App no Repositório**:
   - Na página do App, vá em **Install App**
   - Selecione `fkmatsuda/BR-OpenSpec`
   - Anote o **App ID** (número visível na URL ou página do app)

4. **Configurar Secrets e Variables**:
   - `APP_ID`: cole o número do App ID
   - `APP_PRIVATE_KEY`: cole o conteúdo do arquivo `.pem` (incluindo `-----BEGIN RSA PRIVATE KEY-----`)

### 2.3 npm OIDC Trusted Publishing

O deploy para npm usa **OIDC** (OpenID Connect) — não precisa de token `NPM_TOKEN`!

#### Configuração no npm

1. Acesse [npmjs.com](https://www.npmjs.com/) → seu pacote `@fkmatsuda/br-openspec`
2. Vá em **Settings → Publish with provenance**
3. Configure **Trusted Publishers**:
   - **Link to GitHub**: `fkmatsuda/BR-OpenSpec`
   - **Workflow name**: `release-prepare.yml`
   - **Environment** (opcional): deixe em branco ou crie `production`

#### Como Funciona

- O workflow `release-prepare.yml` roda em pushes para `main`
- Usa `permissions: id-token: write` para gerar um token OIDC
- O npm verifica a assinatura do GitHub Actions e publica o pacote
- Nenhum token longo-vivo é necessário

---

## 3. Workflows do GitHub Actions

### `ci.yml`

Executado em:
- Pull requests para `main`
- Merge groups
- Pushes para `main`

Jobs:
- `test_pr`: Testes em Ubuntu (PRs)
- `test_matrix`: Testes em Ubuntu, macOS e Windows (pushes para `main`)
- `lint`: Build, type check, lint e verificação de artefatos
- `nix-flake-validate`: Validação do build Nix (quando arquivos Nix mudam)
- `validate-changesets`: Valida se changesets estão corretos
- `required-checks-pr` / `required-checks-main`: Agregadores de status

### `release-prepare.yml`

Executado em:
- Pushes para `main`

Funcionalidade:
- Usa Changesets para criar/atualizar o PR "Version Packages"
- Publica no npm via OIDC quando o PR é mergeado
- Requer: `APP_ID` e `APP_PRIVATE_KEY`

---

## 4. Checklist Pré-Deploy

Antes de fazer merge para `main` e disparar o release:

- [ ] `pnpm test` passa localmente (1439 testes)
- [ ] `pnpm run build` gera `dist/cli/index.js`
- [ ] `pnpm exec tsc --noEmit` não reporta erros
- [ ] `pnpm lint` passa
- [ ] Changeset foi adicionado (`pnpm changeset`)
- [ ] `package.json` version está correta
- [ ] Secrets `APP_ID` e `APP_PRIVATE_KEY` configurados
- [ ] npm Trusted Publisher configurado para `fkmatsuda/BR-OpenSpec`

---

## 5. Troubleshooting

### "Error: Resource not accessible by integration" no release

- Verifique se o GitHub App está instalado no repositório
- Verifique se `APP_PRIVATE_KEY` está correta e não expirou

### "npm ERR! 403 Forbidden" no publish

- Verifique se o pacote `@fkmatsuda/br-openspec` existe no npm
- Verifique se o Trusted Publisher está configurado corretamente
- Verifique se a versão no `package.json` é nova (não publicada antes)

### Testes falham no Windows (CI)

- O projeto usa `path.join()` e `path.resolve()` para compatibilidade cross-platform
- Se falhar, verifique se há hardcoded `/` ou `\` no código

---

## 6. Referências

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm OIDC Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub App Tokens](https://github.com/actions/create-github-app-token)
- [pnpm Workspace](https://pnpm.io/workspaces)
