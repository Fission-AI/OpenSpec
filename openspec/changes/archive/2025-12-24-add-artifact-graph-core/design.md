## 情境

這實現了「Slice 1：什麼準備好了？」來自工件 POC 分析。核心見解是將檔案系統用作資料庫 - 透過檔案存在來檢測工件完成情況，從而使系統無狀態且版本控制友好。

該模組將作為平行功能與目前的 OpenSpec 系統共存，有可能實現未來的遷移或整合。

## 目標/非目標

**目標：**
- 純依賴圖邏輯，無副作用
- 無狀態狀態偵測（每次查詢重新掃描檔案系統）
- 支援多文件工件的全域模式（例如， `specs/*.md`)
- 從 YAML 架構載入工件定義
- 計算拓樸建置順序
- 根據依賴完成確定“就緒”工件

**非目標：**
- CLI 指令（切片 4）
- 多變更管理（第 2 部分）
- 模板解析與豐富（切片 3）
- 代理整合或 Claude 指令
- 替換現有的 OpenSpec 功能

## 決定

### 決策：檔案系統作為資料庫
使用檔案存在來進行狀態檢測，而不是使用單獨的狀態檔案。

**理由：**
- 無國籍－不可能有國家腐敗
- Git 友善 - 從提交的文件派生狀態
- 簡單 - 狀態檔案和實際檔案之間沒有同步問題

**考慮的替代方案：**
- JSON/SQLite 狀態檔：更複雜，同步問題，不適合 git
- Git 元資料：與 git 耦合度太高，實現複雜

### 決策：卡恩拓樸排序演算法
使用卡恩演算法計算建構順序。

**理由：**
- 很好理解，O(V+E) 複雜度
- 自然地檢測執行期間的循環
- 產生穩定的、確定性的順序

### 決策：Glob 模式支援
支援全域模式，例如 `specs/*.md` 在神器中 `generates` field.

**理由：**
- 允許多個檔案滿足單一工件要求
- 具有多個檔案的規格目錄的常見模式
- 使用標準 glob 語法

### 決策：不可變的完整集
將完成狀態表示為一組不可變的已完成工件 ID。

**理由：**
- 函數式風格，更容易推理
- 每個查詢都衍生出新的狀態，無需進行突變
- 圖表結構和執行時狀態之間清晰分離
- 檔案系統只能偵測二進位存在（完整與不完整）

**筆記：** `inProgress` 和 `failed` 狀態被推遲到未來的切片。它們需要外部狀態追蹤（例如狀態檔案），因為檔案的存在本身無法區分這些狀態。

### 決策：Zod 用於模式驗證
使用 Zod 驗證 YAML 模式結構並衍生 TypeScript 類型。

**理由：**
- 已經是專案依賴項（v4.0.17）用於 `src/core/schemas/`
- 類型推斷透過 `z.infer<>` - 類型的單一事實來源
- 帶有詳細錯誤訊息的執行時驗證
- 與現有項目模式一致（`base.schema.ts`, `config-schema.ts`)

**考慮的替代方案：**
- 手動驗證：程式碼較多，容易出錯，無型別推斷
- JSON 架構：需要額外的依賴項，減少 TypeScript 集成
- io-ts：尚未進入項目，學習曲線更陡

### 決策：兩級模式解析
模式從全域使用者資料目錄解析，回退到包內建項目。

**解決順序：**
1. `${XDG_DATA_HOME:-~/.local/share}/openspec/schemas/<name>.yaml` - 全域用戶覆蓋
2. `<package>/schemas/<name>.yaml` - 內建預設值

**理由：**
- 遵循 XDG 基本目錄規範（模式是資料，而不是設定）
- 現有鏡子 `getGlobalConfigDir()` 模式在 `src/core/global-paths.ts`
- 內建程式烘焙到包中，從不自動複製
- 使用者透過在全域資料目錄中建立檔案來自訂
- 簡單 - 沒有項目級覆蓋（如果需要可以稍後添加）

**XDG 合規性：**
- 用途 `XDG_DATA_HOME` 設定後的環境變數（所有平台）
- Unix/macOS 後備： `~/.local/share/openspec/`
- Windows 後備： `%LOCALAPPDATA%/openspec/`

**考慮的替代方案：**
- 專案級覆蓋：增加了複雜性，最初不需要
- 自動複製到使用者空間：產生偏差，更難更新預設值
- 設定目錄（`XDG_CONFIG_HOME`)：模式是工作流程定義（資料），而不是使用者首選項（設定）

### 決策：模板欄位已解析但未解析
這 `template` 為了完整性，架構 YAML 中需要字段，但模板解析推遲到切片 3。

**理由：**
- 第 1 部分重點在於「準備好了嗎？」 - 只依賴關係和完成查詢
- 模板路徑經過語法驗證（非空字串）但未解析
- 保持 Slice 1 的重點和可獨立測試

### 決策：循環錯誤格式
循環錯誤列出了循環中的所有工件 ID，以便於偵錯。

**格式：** `"Cyclic dependency detected: A → B → C → A"`

**理由：**
- 顯示完整的循環路徑，而不僅僅是循環的存在
- 可操作 - 開發人員可以準確地看到要修復哪些工件
- 與卡恩演算法一致，自然辨識循環參與者

## 資料結構

**Zod 模式（事實來源）：**

```typescript
import { z } from 'zod';

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, 'Artifact ID is required'),
  generates: z.string().min(1),      // e.g., "proposal.md" or "specs/*.md"
  description: z.string(),
  template: z.string(),              // path to template file
  requires: z.array(z.string()).default([]),
});

// Full schema YAML structure
export const SchemaYamlSchema = z.object({
  name: z.string().min(1, 'Schema name is required'),
  version: z.number().int().positive(),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, 'At least one artifact required'),
});

// Derived TypeScript types
export type Artifact = z.infer<typeof ArtifactSchema>;
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;
```

**執行時狀態（不是 Zod - 僅限內部）：**

```typescript
// Slice 1: Simple completion tracking via filesystem
type CompletedSet = Set<string>;

// Return type for blocked query
interface BlockedArtifacts {
  [artifactId: string]: string[];  // artifact → list of unmet dependencies
}

interface ArtifactGraphResult {
  completed: string[];
  ready: string[];
  blocked: BlockedArtifacts;
  buildOrder: string[];
}
```

## 文件結構

```
src/core/artifact-graph/
├── index.ts           # Public exports
├── types.ts           # Zod schemas and type definitions
├── graph.ts           # ArtifactGraph class
├── state.ts           # State detection logic
├── resolver.ts        # Schema resolution (global → built-in)
└── schemas/           # Built-in schema definitions (package level)
    ├── spec-driven.yaml   # Default: proposal → specs → design → tasks
    └── tdd.yaml           # Alternative: tests → implementation → docs
```

**架構解析路徑：**
- 全域用戶覆蓋： `${XDG_DATA_HOME:-~/.local/share}/openspec/schemas/<name>.yaml`
- 包內建： `src/core/artifact-graph/schemas/<name>.yaml` (bundled 帶包)

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| Glob 模式邊緣情況 | 使用經過充分測試的 glob 庫（fast-glob 或類似庫） |
| 循環檢測 | 卡恩的演算法自然會在循環上失敗；提供明確的錯誤 |
| 模式演變 | 模式中的版本字段，載入時驗證 |

## 開放式問題

無 - 所有問題均在決策部分解決。
