# 多语言指南 (Multi-Language Guide)

配置 OpenSpec，使其以英语以外的语言生成 artifacts。

## 快速设置

对于一个新项目，可以在初始化时设置语言：

```bash
openspec init --language "Portuguese (pt-BR)"
```

这会把语言指令写入 `openspec/config.yaml`。如果项目已有配置，直接编辑它的 `context` 字段，以便保留既有的项目指引。

你也可以手动配置同样的行为：

在你的 `openspec/config.yaml` 中加入一条语言指令：

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
  Keep OpenSpec structural headings and SHALL/MUST keywords in English.

  # Your other project context below...
  Tech stack: TypeScript, React, Node.js
```

就这样。所有生成的 artifacts 现在都会是葡萄牙语。

OpenSpec 的文档结构和规范性的 `SHALL`/`MUST` 关键字保持英文，因为校验依赖它们。其周围的 requirement 和 scenario 正文可以使用你选择的语言。

## 语言示例

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

## 提示

### 处理技术术语

决定如何处理技术术语：

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Code examples and file paths remain in English
```

### 与其他上下文结合

语言设置与你的其他项目上下文协同工作：

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## 验证

要验证你的语言配置是否生效：

```bash
# Check the instructions - should show your language context
openspec instructions proposal --change my-change

# Output will include your language context
```

## 相关文档

- [自定义配置指南](./customization.md) —— 项目配置选项
- [工作流指南](./workflows.md) —— 完整工作流文档
