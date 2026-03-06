# 設計：更改指令

## 架構決策

### 命令結構
與spec指令類似，我們使用子指令（`change show`, `change list`, `change validate`） 為了：
- 與spec命令模式的一致性
- 明確的關注點分離
- 變更管理功能的未來可擴充性

### JSON 變更架構
```typescript
{
  version: string,           // Schema version
  format: "change",         // Identifies as change document
  sourcePath: string,       // Original markdown file path
  id: string,              // Change identifier
  title: string,           // Change title
  why: string,            // Motivation section
  whatChanges: Array<{
    type: "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED",
    deltas: Array<{
      specId: string,
      description: string,
      requirements?: Array<Requirement>  // Only for ADDED/MODIFIED
    }>
  }>
}
```

**理由：**
- 按操作類型對增量進行分組以實現更清晰的組織
- 可選要求欄位（僅與新增/修改相關）
- 重複使用規範命令中的 RequirementSchema 以保持一致性

### 增量運營
**四種操作類型：**
1. **新增**：規格中新增了新要求
2. **修改**：對現有要求的更改
3. **已刪除**：正在刪除的要求
4. **重新命名**：規格標識符更改

**設計選擇：** 明確操作類型而非基於差異的方法：
- Markdown 的人類可讀性
- 清晰的意圖溝通
- 更輕鬆的驗證和工具

### 對 Spec 指令的依賴
- **共享模式**：重複使用 RequirementSchema 和 ScenarioSchema
- **執行順序**：spec指令必須先執行
- **常用解析器實用程式**：共用markdown解析邏輯

### 舊版相容性
- 保持現有 `list` 命令功能正常，帶有棄用警告
- 遷移路徑： `list` → `change list` 具有相同的功能
- 逐步過渡以避免破壞現有工作流程