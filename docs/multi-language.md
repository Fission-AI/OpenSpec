# 多語言指南

設定 OpenSpec 以產生英語以外的語言的工件。

## 快速設定

將語言指令加入您的 `openspec/config.yaml`:

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  # Your other project context below...
  Tech stack: TypeScript, React, Node.js
```

就是這樣。所有生成的工件現在都將是葡萄牙語。

## 語言範例

### 葡萄牙語（巴西）

```yaml
context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.
```

### 西班牙語

```yaml
context: |
  Idioma: Español
  Todos los artefactos deben escribirse en español.
```

### 中文（簡體）

```yaml
context: |
  语言：中文（简体）
  所有产出物必须用简体中文撰写。
```

### 日本人

```yaml
context: |
  言語：日本語
  すべての成果物は日本語で作成してください。
```

### 法語

```yaml
context: |
  Langue : Français
  Tous les artefacts doivent être rédigés en français.
```

### 德文

```yaml
context: |
  Sprache: Deutsch
  Alle Artefakte müssen auf Deutsch verfasst werden.
```

## 尖端

### 處理技術術語

決定如何處理技術術語：

```yaml
context: |
  Language: Japanese
  Write in Japanese, but:
  - Keep technical terms like "API", "REST", "GraphQL" in English
  - Code examples and file paths remain in English
```

### 與其他上下文結合

語言設定與您的其他項目上下文一起工作：

```yaml
schema: spec-driven

context: |
  Language: Portuguese (pt-BR)
  All artifacts must be written in Brazilian Portuguese.

  Tech stack: TypeScript, React 18, Node.js 20
  Database: PostgreSQL with Prisma ORM
```

## 確認

若要驗證您的語言設定是否正常運作：

```bash
# Check the instructions - should show your language context
openspec instructions proposal --change my-change

# Output will include your language context
```

## 相關文件

- [客製化指南](./customization.md) - 專案設定選項
- [工作流程指南](./workflows.md) - 完整的工作流程文檔
