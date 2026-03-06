# 技術設計

## 架構決策

### 簡單第一
- 無版本追蹤 - 始終根據命令進行更新
- 僅完全替換 OpenSpec 管理的文件（例如， `openspec/README.md`)
- 對使用者擁有的檔案進行基於標記的更新（例如， `CLAUDE.md`)
- 模板 bundled 帶包 - 無需網絡
- 最少的錯誤處理 - 僅檢查先決條件

### 範本策略
- 使用現有的範本實用程式
  - `readmeTemplate` 從 `src/core/templates/readme-template.ts` 為了 `openspec/README.md`
  - `TemplateManager.getClaudeTemplate()` 為了 `CLAUDE.md`
- 目錄名稱固定為 `openspec` （從 `OPENSPEC_DIR_NAME`)

### 文件操作
- 使用非同步實用程式來保持一致性
  - `FileSystemUtils.writeFile` 為了 `openspec/README.md`
  - `FileSystemUtils.updateFileWithMarkers` 為了 `CLAUDE.md`
- 不需要原子操作 - 使用者有 git
- 在繼續之前檢查目錄是否存在

## 執行

### 更新指令（`src/core/update.ts`)
```typescript
export class UpdateCommand {
  async execute(projectPath: string): Promise<void> {
    const openspecDirName = OPENSPEC_DIR_NAME;
    const openspecPath = path.join(projectPath, openspecDirName);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Update README.md (full replacement)
    const readmePath = path.join(openspecPath, 'README.md');
    await FileSystemUtils.writeFile(readmePath, readmeTemplate);

    // 3. Update CLAUDE.md (marker-based)
    const claudePath = path.join(projectPath, 'CLAUDE.md');
    const claudeContent = TemplateManager.getClaudeTemplate();
    await FileSystemUtils.updateFileWithMarkers(
      claudePath,
      claudeContent,
      OPENSPEC_MARKERS.start,
      OPENSPEC_MARKERS.end
    );

    // 4. Success message (ASCII-safe, checkmark optional by terminal)
    console.log('Updated OpenSpec instructions');
  }
}
```

## 為什麼要採用這種方法

### 好處
- **非常簡單**：總共約 40 行程式碼
- **快速**：無需版本檢查，最少的解析
- **可預測**：每次結果相同；冪等的
- **可維護**：重複使用現有實用程式

### 接受權衡
- 沒有版本追蹤（不必要的複雜性）
- 僅完全覆蓋 OpenSpec 管理的文件
- 使用者擁有的文件的標記管理更新

## 錯誤處理

只處理嚴重錯誤：
- 遺失的 `openspec` 目錄 → 拋出由 CLI 處理的錯誤以呈現友善訊息
- 文件寫入失敗→讓錯誤冒泡至CLI

## 測試策略

最初手動煙霧測試就足夠了：
1. 執行 `openspec init` 在一個測試項目中
2. 修改這兩個文件（包括標記周圍的自訂內容 `CLAUDE.md`)
3. 執行 `openspec update`
4. 核實 `openspec/README.md` 完全更換； `CLAUDE.md` OpenSpec 區塊已更新，但未更改標記之外的使用者內容
5. 執行命令兩次以驗證冪等性且沒有重複標記
6. 測試缺失 `openspec` 目錄（預計失敗）