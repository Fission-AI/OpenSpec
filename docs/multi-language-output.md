# Multi-Language Output Guide

Configure OpenSpec to generate artifacts in languages other than English.

## Overview

OpenSpec can output proposals, specs, designs, and tasks in any language by adding language instructions to your project's `context` configuration. This approach uses the existing config system without requiring any code changes.

## Quick Setup

### If you already have a config file

Add a language instruction to your existing `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
  Use Portuguese technical terminology where appropriate.

  # Your other project context below...
  Tech stack: TypeScript, React, Node.js
```

That's it. All generated artifacts will now be in Portuguese.

### If you don't have a config file yet

You can create one interactively or manually:

**Option 1: Interactive setup**

```bash
openspec artifact-experimental-setup
```

This will guide you through creating `openspec/config.yaml` with schema selection, context, and rules.

**Option 2: Manual creation**

Create the file `openspec/config.yaml` in your project root:

```bash
mkdir -p openspec
cat > openspec/config.yaml << 'EOF'
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
EOF
```

## Language Examples

### Portuguese (Brazil)

```yaml
context: |
  Language: Portuguese (pt-BR)
  All artifacts (proposals, specs, designs, tasks) must be written in Brazilian Portuguese.
  Use Brazilian Portuguese conventions for technical terminology.
```

### Spanish

```yaml
context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
  Utilizar terminología técnica en español cuando sea posible.
```

### Chinese (Simplified)

```yaml
context: |
  语言：中文（简体）
  所有产出物（提案、规格、设计、任务）必须用简体中文撰写。
  技术术语可以保留英文原文，但说明应使用中文。
```

### Japanese

```yaml
context: |
  言語：日本語
  すべての成果物は日本語で作成してください。
  技術用語は必要に応じて英語を併記可能です。
```

### French

```yaml
context: |
  Langue : Français
  Tous les artefacts doivent être rédigés en français.
  Utiliser la terminologie technique française lorsque possible.
```

### German

```yaml
context: |
  Sprache: Deutsch
  Alle Artefakte müssen auf Deutsch verfasst werden.
  Technische Fachbegriffe können auf Englisch beibehalten werden.
```

## How It Works

The `context` field in `openspec/config.yaml` is injected into every artifact's instructions as an XML block:

```xml
<context>
Language: Portuguese (pt-BR)
All artifacts must be written in Brazilian Portuguese.
...
</context>

<template>
[Schema's template content]
</template>
```

The AI assistant sees this context when generating any artifact and follows the language instruction.

## Tips

### Be Explicit About Scope

Specify which parts should be in the target language:

```yaml
context: |
  Language: Spanish
  Write all prose, descriptions, and explanations in Spanish.
  Code comments may remain in English for consistency with the codebase.
  Variable names and code identifiers should stay in English.
```

### Handle Technical Terms

Decide how to handle technical terminology:

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Provide Japanese explanations in parentheses for complex terms on first use
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
  Testing: Vitest + React Testing Library

  Conventions:
  - Use functional components with hooks
  - Follow existing patterns in src/components/
```

## Verification

To verify your language config is working:

```bash
# Create a test change
openspec new change test-language

# Check the instructions - should show your language context
openspec instructions proposal --change test-language

# Output will include:
# <context>
# Language: Portuguese (pt-BR)
# All artifacts must be written in Brazilian Portuguese.
# ...
# </context>
```

## Limitations

- Language instructions apply to **all** artifacts. You cannot set different languages for different artifact types.
- The effectiveness depends on the AI model's proficiency in the target language.
- Technical diagrams, code samples, and file paths typically remain in English regardless of language setting.

## Future Considerations

We're considering adding a dedicated `language` field to the config schema in a future release:

```yaml
# Potential future syntax (not yet implemented)
schema: spec-driven
language: pt-BR
```

For now, the `context` approach described above is the recommended method. It provides full flexibility and works with all current versions of OpenSpec.

## Related Documentation

- [Project Config Demo](./project-config-demo.md) - Overview of project configuration
- [Experimental Workflow Guide](./experimental-workflow.md) - Full workflow documentation
