# Multi-Language Guide

Configure OpenSpec to generate artifacts in languages other than English.

## Quick Setup

Add a language instruction to your `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  # Your other project context below...
  Tech stack: TypeScript, React, Node.js
```

That's it. All generated artifacts will now be in Portuguese.

## Language Examples

### Portuguese (Brazil)

```yaml
context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
```

### Spanish

```yaml
context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
```

### Chinese (Simplified)

```yaml
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。
```

### Japanese

```yaml
context: |
  言語：日本語
  すべての成果物は日本語で作成してください。
```

### French

```yaml
context: |
  Langue : Français
  Tous les artefacts doivent être rédigés en français.
```

### German

```yaml
context: |
  Sprache: Deutsch
  Alle Artefakte müssen auf Deutsch verfasst werden.
```

## Normative Keywords

OpenSpec validates that every requirement contains a normative keyword (e.g., `MUST`, `SHALL`). For non-English projects, set the `language` field to validate against localized keywords:

```yaml
schema: spec-driven
language: es

context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
  Use DEBE, DEBERA, or DEBERÁ as normative keywords in requirements.
```

**Supported languages:**

| Language | Code | Keywords |
|----------|------|----------|
| English  | `en` | `MUST`, `SHALL` |
| Spanish  | `es` | `DEBE`, `DEBERA`, `DEBERÁ` |

When no `language` is set, English keywords are used by default. An unknown language code falls back to English with a warning.

Note: The `language` field controls which normative keywords the validator accepts. To write artifacts in a different language, use the `context` field as shown in the examples above.

## Tips

### Handle Technical Terms

Decide how to handle technical terminology:

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Code examples and file paths remain in English
```

### Combine with Other Context

Language settings work alongside your other project context:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## Verification

To verify your language config is working:

```bash
# Check the instructions - should show your language context
openspec instructions proposal --change my-change

# Output will include your language context
```

## Related Documentation

- [Customization Guide](./customization.md) - Project configuration options
- [Workflows Guide](./workflows.md) - Full workflow documentation
