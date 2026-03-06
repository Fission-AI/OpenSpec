## 情境

工件工作流程 POC 的切片 4。核心功能（ArtifactGraph、InstructionLoader、change-utils）已完成。此切片新增 CLI 指令以向使用者公開工件工作流程。

**關鍵限制**：這是實驗性的。必須隔離命令，以便在該功能不起作用時輕鬆刪除。

## 目標/非目標

- **目標：**
  - 透過CLI公開工件工作流程狀態與說明
  - 透過頂級動詞指令提供流暢的使用者體驗
  - 支援人類可讀和 JSON 輸出
  - 使代理程式能夠以程式設計方式查詢工作流程狀態
  - 保持實施隔離以便於刪除

- **非目標：**
  - 互動式工件建立精靈（未來的工作）
  - 架構管理命令（延遲）
  - 自動偵測主動變化（CLI 是確定性的，代理推斷）

## 決定

### 命令結構：頂級動詞

命令是頂級的，以實現最大的流動性：

```
openspec status --change <id>
openspec next --change <id>
openspec instructions <artifact> --change <id>
openspec templates [--schema <name>]
openspec new change <name>
```

**理由：**
- 最流暢的使用者體驗 - 最少的擊鍵次數
- 命令夠獨特以避免衝突
- 使用者簡單的心智模型

**接受權衡：** 輕微的命名空間污染，但命令是不同的並且可以乾淨地刪除。

### 實驗分離

所有工件工作流程指令都在單一檔案中實作：

```
src/commands/artifact-workflow.ts
```

**要刪除功能：**
1. 刪除 `src/commands/artifact-workflow.ts`
2. 從中刪除 ~5 行 `src/cli/index.ts`

沒有觸及其他文件，不會對穩定功能造成風險。

### 確定性 CLI 顯式 `--change`

所有特定於更改的命令都需要 `--change <id>`:

```bash
openspec status --change add-auth   # explicit, works
openspec status                      # error: missing --change
```

**理由：**
- CLI是純粹的，可測試的，沒有隱藏狀態
- 代理從對話中推斷變化並明確傳遞
- 沒有設定檔追蹤“主動更改”
- Consistent with POC design philosophy

### New Change Command Structure

建立變更使用顯式子命令：

```bash
openspec new change add-feature
```

**理由：**
- `openspec new <name>` 不明確（新什麼？）
- `openspec new change <name>` 清晰且可擴展
- 可以添加 `openspec new spec <name>` 稍後如果需要的話

### 輸出格式

- **預設**：帶有視覺指示器的人類可讀文本
  - 地位： `[x]` 完畢， `[ ]` 準備好， `[-]` 被阻止
  - 顏色：綠色（完成）、黃色（就緒）、紅色（阻塞）
- **JSON** (`--json`)：機器可讀的腳本和代理

### 錯誤處理

- 遺失的 `--change`：列出可用變更時出錯
- Unknown change: Error with suggestion
- 未知工件：列出有效工件時發生錯誤
- 缺少架構：架構解析詳細資訊錯誤

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 頂級指令污染命名空間 | 命令是不同的；隔離，易於移除 |
| `status` 與 git 混淆 | 情境 (`--change`）說得很清楚 |
| 功能不起作用 | 單一檔案刪除會刪除所有內容 |

## 實施說明

- 所有命令都在 `src/commands/artifact-workflow.ts`
- 進口自 `src/core/artifact-graph/` 對於所有操作
- 用途 `getActiveChangeIds()` 從 `item-discovery.ts` 用於更改列表
- 遵循現有的 CLI 模式（ora spinners、commander.js 選項）
- 幫助文字將命令標記為“實驗”
