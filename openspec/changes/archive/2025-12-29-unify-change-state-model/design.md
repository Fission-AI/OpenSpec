# 設計：統一變更狀態模型

## 概述

此變更修復了兩個錯誤，對現有系統的影響最小：

1. **檢視錯誤**：空更改錯誤地顯示為“已完成”
2. **工件工作流程錯誤**：指令在鷹架變更時失敗

## 關鍵設計決策：兩個系統，兩個目的

基於任務和基於工件的系統服務於**不同的目的**並且應該共存：

| 系統 | 目的 | 使用者 |
|--------|---------|---------|
| **任務進度** | 追蹤實施工作 | `openspec view`, `openspec list` |
| **神器進度** | 追蹤規劃/規格工作 | `openspec status`, `openspec next` |

我們不會合併這些系統。相反，我們修復每個問題以使其在其網域中正常工作。

## 變更1：修復檢視指令

### 當前邏輯（錯誤）

```typescript
// view.ts line 90
if (progress.total === 0 || progress.completed === progress.total) {
  completed.push({ name: entry.name });
}
```

問題： `total === 0` 意思是“尚未定義任務”，而不是“所有任務都已完成”。

### 新邏輯

```typescript
if (progress.total === 0) {
  draft.push({ name: entry.name });
} else if (progress.completed === progress.total) {
  completed.push({ name: entry.name });
} else {
  active.push({ name: entry.name, progress });
}
```

### 檢視輸出變化

**前：**
```
Completed Changes
─────────────────
  ✓ add-feature        (all tasks done - correct)
  ✓ test-workflow      (no tasks - WRONG)
```

**後：**
```
Draft Changes
─────────────────
  ○ test-workflow      (no tasks yet)

Active Changes
─────────────────
  ◉ add-scaffold       [████░░░░] 3/7 tasks

Completed Changes
─────────────────
  ✓ add-feature        (all tasks done)
```

## 變更 2：修復工件工作流程發現

### 當前邏輯（錯誤）

```typescript
// artifact-workflow.ts - validateChangeExists()
const activeChanges = await getActiveChangeIds(projectRoot);
if (!activeChanges.includes(changeName)) {
  throw new Error(`Change '${changeName}' not found...`);
}
```

問題： `getActiveChangeIds()` 需要 `proposal.md`，但工件工作流程應該在空目錄上工作，以幫助建立第一個工件。

### 新邏輯

```typescript
async function validateChangeExists(changeName: string, projectRoot: string): Promise<string> {
  const changePath = path.join(projectRoot, 'openspec', 'changes', changeName);

  // Check directory existence directly, not proposal.md
  if (!fs.existsSync(changePath) || !fs.statSync(changePath).isDirectory()) {
    // List available changes for helpful error message
    const entries = await fs.promises.readdir(
      path.join(projectRoot, 'openspec', 'changes'),
      { withFileTypes: true }
    );
    const available = entries
      .filter(e => e.isDirectory() && e.name !== 'archive' && !e.name.startsWith('.'))
      .map(e => e.name);

    if (available.length === 0) {
      throw new Error('No changes found. Create one with: openspec new change <name>');
    }
    throw new Error(`Change '${changeName}' not found. Available:\n  ${available.join('\n  ')}`);
  }

  return changeName;
}
```

### 行為改變

```bash
# Before
$ openspec new change foo
$ openspec status --change foo
Error: Change 'foo' not found.

# After
$ openspec new change foo
$ openspec status --change foo
Change: foo
Progress: 0/4 artifacts complete

[ ] proposal
[-] specs (blocked by: proposal)
[-] design (blocked by: proposal)
[-] tasks (blocked by: specs, design)
```

## 什麼保持不變

1. **`getActiveChangeIds()`** - 仍然需要 `proposal.md` （由驗證、顯示使用）
2. **`getArchivedChangeIds()`** - 不變
3. **活動/完成語意** - 仍基於任務核取方塊
4. **驗證** - 仍然需要 `proposal.md` 有東西要驗證

## 文件變更

| 文件 | 改變 |
|------|--------|
| `src/core/view.ts` | 新增草稿類別，修復完成邏輯 |
| `src/commands/artifact-workflow.ts` | 更新 `validateChangeExists()` 使用目錄存在 |
| `test/commands/artifact-workflow.test.ts` | 新增腳手架更改測試 |

## 測試策略

1. **單元測試**： `validateChangeExists()` 鷹架式變革
2. **檢視測試**：驗證三個類別正確渲染
3. **手動測試**：完整的工作流程 `new change` → `status` → `view`
