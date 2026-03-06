## 任務

### 核心實施

- [x] 從中提取規範應用程式邏輯 `ArchiveCommand` 進入 `src/core/specs-apply.ts`
  - 移動 `buildUpdatedSpec()`, `findSpecUpdates()`, `writeUpdatedSpec()` 到共享模組
  - 保持 `ArchiveCommand` 從新模組導入
  - 確保保留所有驗證邏輯

### 技能模板

- [x] 添加 `getSyncSpecsSkillTemplate()` 函數於 `src/core/templates/skill-templates.ts`
  - 技能名稱： `openspec-sync-specs`
  - 說明：將增量規格同步到主要規格
  - **代理驅動**：代理直接讀取增量和編輯主要規格的說明

- [x] 添加 `/opsx:sync` 斜槓命令模板位於 `skill-templates.ts`
  - 鏡像技能範本為斜線指令格式
  - **代理驅動**：沒有 CLI 指令，代理進行合併

### 登記

- [x] 註冊管理技能中的技能（透過 `artifact-experimental-setup`)
  - 使用適當的元資料添加到技能列表
  - 確保它出現在設定輸出中

### 設計決策

**為什麼是代理驅動而不是%%31%。 **

程序化合併以需求層級的粒度進行操作：
- MODIFIED 需要複製所有場景，而不僅僅是更改的場景
- 如果代理忘記了某個場景，它將被刪除
- 增量規格因複製內容而變得臃腫

代理驅動方法：
- 代理可以應用部分更新（新增場景而不複製其他場景）
- 增量代表*意圖*，而不是批發替換
- 更靈活、自然的編輯工作流程
- 存檔仍然使用編程合併（用於最終更改）
