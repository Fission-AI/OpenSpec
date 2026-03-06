## 情境

實驗工件工作流程支援多種模式（`spec-driven`, `tdd`），但必須在每個命令上傳遞模式選擇。這給代理商和用戶帶來了摩擦。

我們需要一個輕量級元資​​料檔案來保存每次更改的模式選擇。

## 目標/非目標

**目標：**
- 在建立變更時儲存架構選擇一次
- 自動偵測實驗工作流程指令中的架構
- 保持向後相容性（無元資料=預設）
- 使用 Zod 架構驗證元資料

**非目標：**
- 遷移現有更改（它們使用預設值）
- 擴展到遺留命令
- 儲存架構以外的其他元資料（目前保持最少）

## 決定

### 決策：Zod 架構設計

The metadata file (`.openspec.yaml`) 將使用此 Zod 模式進行驗證：

```typescript
// src/core/artifact-graph/types.ts (or new metadata.ts)

import { z } from 'zod';
import { listSchemas } from './resolver.js';

/**
 * Schema for per-change metadata stored in .openspec.yaml
 */
export const ChangeMetadataSchema = z.object({
  // Required: which workflow schema this change uses
  schema: z.string().min(1, { message: 'schema is required' }).refine(
    (val) => listSchemas().includes(val),
    (val) => ({ message: `Unknown schema '${val}'. Available: ${listSchemas().join(', ')}` })
  ),

  // Optional: creation timestamp (ISO date string)
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'created must be YYYY-MM-DD format'
  }).optional(),
});

export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>;
```

**理由：**
- `schema` 是必需的，並在解析時根據可用模式進行驗證
- `created` 是可選的，ISO 日期格式以保持一致性
- 最小字段 - 以後可以擴展而不會破壞現有文件
- 遵循現有的程式碼庫模式（請參閱 `ArtifactSchema`, `SchemaYamlSchema`)

### 決定：文件位置和格式

**地點：** `openspec/changes/<name>/.openspec.yaml`

**格式：**
```yaml
schema: tdd
created: 2025-01-05
```

**考慮的替代方案：**
- `change.yaml` - 隱藏程度較低，但目錄混亂
- 前沿內容 `proposal.md` - 情侶求婚存在
- `openspec.json` - YAML 符合現有架構文件

### 決策：讀/寫函數

```typescript
// src/utils/change-metadata.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/artifact-graph/types.js';

const METADATA_FILENAME = '.openspec.yaml';

export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata
): void {
  // Validate before writing
  const validated = ChangeMetadataSchema.parse(metadata);
  const content = yaml.stringify(validated);
  fs.writeFileSync(path.join(changeDir, METADATA_FILENAME), content);
}

export function readChangeMetadata(
  changeDir: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  const content = fs.readFileSync(metaPath, 'utf-8');
  const parsed = yaml.parse(content);

  // Validate and return (throws ZodError if invalid)
  return ChangeMetadataSchema.parse(parsed);
}
```

### 決策：模式解析順序

確定要使用哪個架構時：

1. **明確 `--schema` 標誌**（最高優先順序 - 使用者覆蓋）
2. **`.openspec.yaml` 元資料**（持續選擇）
3. **預設 `spec-driven`** （倒退）

```typescript
function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string
): string {
  if (explicitSchema) return explicitSchema;

  const metadata = readChangeMetadata(changeDir);
  if (metadata?.schema) return metadata.schema;

  return 'spec-driven';
}
```

## 風險/權衡

- **每次更改額外文件** → 最小開銷，隱藏文件
- **YAML 解析依賴** → 已使用 `yaml` 模式檔案包
- **讀取時的架構驗證** → 如果損壞，會快速失敗並顯示明顯的錯誤

## 遷移計劃

無需遷移：
- 現有變更無 `.openspec.yaml` 繼續工作（使用預設）
- 建立的新更改 `openspec new change --schema X` 取得元資料文件

## 開放式問題

- 應該 `openspec new change` 如果未指定，則互動式提示模式？ （傾向於否 - 預設即可）
