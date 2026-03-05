# Багатомовний посібник

Налаштуйте OpenSpec для створення артефактів мовами, відмінними від англійської.

## Швидке налаштування

Додайте мовну інструкцію до вашого `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  # Your other project context below...
  Tech stack: TypeScript, React, Node.js
```

Ось і все. Усі згенеровані артефакти тепер будуть португальською мовою.

## Приклади мови

### Португальська (Бразилія)

```yaml
context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
```

### Іспанська

```yaml
context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
```

### Китайська (спрощена)

```yaml
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。
```

### Японська

```yaml
context: |
  言語：日本語
  すべての成果物は日本語で作成してください。
```

### Французька

```yaml
context: |
  Langue : Français
  Tous les artefacts doivent être rédigés en français.
```

### німецька

```yaml
context: |
  Sprache: Deutsch
  Alle Artefakte müssen auf Deutsch verfasst werden.
```

## Поради

### Опрацювати технічні умови

Вирішіть, як використовувати технічну термінологію:

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Code examples and file paths remain in English
```

### Поєднати з іншим контекстом

Налаштування мови працюють разом із іншим контекстом вашого проекту:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## Перевірка

Щоб перевірити, чи працює конфігурація мови:

```bash
# Check the instructions - should show your language context
openspec instructions proposal --change my-change

# Output will include your language context
```

## Пов'язана документація

- [Посібник з налаштування](./customization.md) - Параметри конфігурації проекту
- [Посібник із робочих процесів](./workflows.md) - Повна документація робочого процесу
