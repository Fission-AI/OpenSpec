# 設計：規格指令

## 架構決策

### 命令層次結構
我們選擇了一個子命令模式（`spec show`, `spec list`, `spec validate`） 到：
- 將相關功能分組到公共命名空間下
- 啟用未來的可擴展性而不污染頂層CLI
- 與計劃保持一致 `change` 命令結構

### JSON 架構結構
規範 JSON 架構遵循以下結構：
```typescript
{
  version: string,        // Schema version for compatibility
  format: "spec",        // Identifies this as a spec document
  sourcePath: string,    // Original markdown file path
  id: string,           // Spec identifier from filename
  title: string,        // Human-readable title
  overview?: string,    // Optional overview section
  requirements: Array<{
    id: string,
    text: string,
    scenarios: Array<{
      id: string,
      text: string
    }>
  }>
}
```

**理由：**
- 需求數組的扁平結構（相對於嵌套物件）更容易迭代
- 場景嵌套在需求中以維持關係
- 用於工具整合的元資料欄位（版本、格式、sourcePath）

### 解析器架構
- **Markdown-第一種方法**：解析 markdown 標題而非自訂語法
- **串流解析器**：逐行處理以高效處理大文件
- **嚴格的標題層次結構**：強制執行 ##/###/#### 結構以保持一致性

### 驗證策略
- **解析時驗證**：在解析過程中捕捉結構問題
- **模式驗證**：使用 Zod 對解析資料進行執行時間類型檢查
- **單獨的驗證命令**：允許在沒有完整解析/轉換的情況下進行驗證