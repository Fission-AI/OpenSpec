# 提案：統一變更狀態模型

## 問題陳述

在處理更改時，兩個錯誤會導致不一致的行為：

### Bug 1：空變更在檢視中顯示為“已完成”

```typescript
// view.ts line 90
if (progress.total === 0 || progress.completed === progress.total) {
  completed.push({ name: entry.name });  // BUG: total === 0 ≠ completed
}
```

結果： `openspec new change foo && openspec view` 節目 `foo` 當沒有內容時顯示為“已完成”。

### Bug 2：Artifact 工作流程指令找不到鷹架更改

```typescript
// item-discovery.ts - getActiveChangeIds()
const proposalPath = path.join(changesPath, entry.name, 'proposal.md');
await fs.access(proposalPath);  // Only returns changes WITH proposal.md
```

結果： `openspec status --change foo` 即使該目錄存在，也顯示「未找到」。

## 根本原因

此系統合併了兩個不同的概念：

| 概念 | 問題 | 真理之源 |
|---------|----------|-----------------|
| **規劃進度** | 所有規格文檔都已建立嗎？ | 文件存在（ArtifactGraph） |
| **實施進展** | 編碼工作完成了嗎？ | 任務核取方塊 (tasks.md) |

## 建議的解決方案

### 修復1：新增“草稿”狀態檢視指令

保持 Active/Completed 的現有含義，但修復錯誤：

| 狀態 | 標準 | 意義 |
|-------|----------|---------|
| **草稿** | 沒有任務.md 或 `tasks.total === 0` | 仍在規劃中 |
| **積極的** | `tasks.total > 0` AND `completed < total` | 實施 |
| **完全的** | `tasks.total > 0` AND `completed === total` | 完畢 |

### 修復 2：Artifact 工作流程使用目錄存在

更新 `validateChangeExists()` 檢查目錄是否存在，而不是如果 `proposal.md` 存在。這允許工件工作流程引導使用者建立他們的第一個工件。

### 保留現有的發現功能

`getActiveChangeIds()` 繼續要求 `proposal.md` 為了向後相容驗證和其他命令。

## 有什麼變化

| 命令 | 前 | 後 |
|---------|--------|-------|
| `openspec view` | 空=“已完成” | 空=“草稿” |
| `openspec status --change X` | 需要提案.md | 適用於任何目錄 |
| `openspec validate X` | 需要提案.md | 不變（仍然需要） |

## 重大變化

### 最小的重大改變

1. **`openspec view` 輸出**：空更改從“已完成”部分移動到新的“草稿”部分

### Non-Breaking

- 活動/完成語意不變（仍基於任務）
- `getActiveChangeIds()` 不變
- `openspec validate` 不變
- 已歸檔的變更不受影響

## 超出範圍

- 合併基於任務和基於工件的進度（它們服務於不同的目的）
- 更改“已完成”的含義（它保持=所有任務已完成）
- 新增工件進度以檢視命令（單獨增強）
- 工件工作流程指令的 Shell 標籤完成（尚未註冊）

## 相關指令分析

| 命令 | 用途 `getActiveChangeIds()` | Should include scaffolded? | 需要改變嗎？ |
|---------|-----------------------------|-----------------------------|----------------|
| `openspec view` | 否（直接讀取目錄） | Yes → Draft section | **是的** |
| `openspec list` | 否（直接讀取目錄） | 是（顯示“無任務”） | 不 |
| `openspec status/next/instructions` | 是的 | 是的 | **是的** |
| `openspec validate` | 是的 | 否（無法驗證空） | 不 |
| `openspec show` | 是的 | 否（沒有可顯示的內容） | 不 |
| 製表符補全 | 是的 | 未來的增強 | 不 |

## 成功標準

1. `openspec new change foo && openspec view` 節目 `foo` 在“草稿”部分
2. `openspec new change foo && openspec status --change foo` 作品
3. 完成所有任務後的變更仍顯示為“已完成”
4. 所有現有測試均通過
