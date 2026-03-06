# Init指令技術設計

## 架構概述

init 指令遵循模組化架構，具有明確的關注點分離：

```
CLI Layer (src/cli/index.ts)
    ↓
Core Logic (src/core/init.ts)
    ↓
Templates (src/core/templates/)
    ↓
File System Utils (src/utils/file-system.ts)
```

## 關鍵設計決策

### 1. 範本管理

**決定**：將模板儲存為 TypeScript 模組而不是單獨的文件
**理由**： 
- 確保模板與編譯後的程式碼bun一致
- 允許動態內容插入
- 類型安全的模板處理
- 無需複雜的檔案路徑解析

### 2. 互動模式與非互動模式

**決定**：支援互動（預設）和非互動模式
**理由**：
- 開發者體驗的互動模式
- CI/CD 和自動化的非互動式
- 標誌： `--yes` 接受預設值， `--no-input` 用於完全自動化

### 3. 目錄結構建立

**決定**：預先建立所有目錄，然後填入文件
**理由**：
- 如果權限問題快速失敗
- 清晰的交易邊界
- 更容易清理故障

### 4. 錯誤處理策略

**決定**：失敗時實施回滾
**理由**：
- 防止部分安裝
- 清除錯誤狀態
- 更好的使用者體驗

## 實施細節

### 檔案系統操作

```typescript
// Atomic directory creation with rollback
interface InitTransaction {
  createdPaths: string[];
  rollback(): Promise<void>;
  commit(): Promise<void>;
}
```

### 模板系統

```typescript
interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

interface ProjectContext {
  projectName: string;
  description: string;
  techStack: string[];
  conventions: string;
}
```

### CLI 指令結構

```bash
openspec init [path]           # Initialize in specified path (default: current directory)
  --yes                       # Accept all defaults
  --no-input                  # Skip all prompts
  --force                     # Overwrite existing OpenSpec directory
  --dry-run                   # Show what would be created
```

## 安全考慮

1. **路徑遍歷**：清理所有使用者提供的路徑
2. **檔案權限**：開始前檢查寫入權限
3. **現有文件**：如果沒有明確的 --force 標誌，切勿覆蓋
4. **模板注入**：清理模板中的使用者輸入

## 未來的可擴展性

該設計支援未來的增強功能：
- 自訂模板來源
- 項目類型預設（API、Web 應用程式、庫）
- 從其他文件系統遷移
- 與版本控制系統集成