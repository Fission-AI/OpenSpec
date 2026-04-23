# Guia Multi-Idioma

Configure o OpenSpec para gerar artefatos em idiomas diferentes do inglês.

## Configuração Rápida

Adicione uma instrução de idioma ao seu `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  # Seu outro contexto de projeto abaixo...
  Tech stack: TypeScript, React, Node.js
```

Pronto. Todos os artefatos gerados agora estarão em português.

## Exemplos de Idiomas

### Português (Brasil)

```yaml
context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
```

### Espanhol

```yaml
context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
```

### Chinês (Simplificado)

```yaml
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。
```

### Japonês

```yaml
context: |
  言語：日本語
  すべての成果物は日本語で作成してください。
```

### Francês

```yaml
context: |
  Langue : Français
  Tous les artefacts doivent être rédigés en français.
```

### Alemão

```yaml
context: |
  Sprache: Deutsch
  Alle Artefakte müssen auf Deutsch verfasst werden.
```

## Dicas

### Lidar com Termos Técnicos

Decida como tratar a terminologia técnica:

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Code examples and file paths remain in English
```

### Combinar com Outro Contexto

As configurações de idioma funcionam junto com o restante do contexto do seu projeto:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## Verificação

Para verificar se a configuração de idioma está funcionando:

```bash
# Verifique as instruções - deve exibir o contexto de idioma
openspec instructions proposal --change my-change

# A saída incluirá o contexto de idioma
```

## Documentação Relacionada

- [Guia de Personalização](./customization.md) - Opções de configuração do projeto
- [Guia de Fluxos de Trabalho](./workflows.md) - Documentação completa de fluxos de trabalho
