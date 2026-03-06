## 1. 回饋命令

- [x] 1.1 建立 `src/commands/feedback.ts` 與命令執行
- [x] 1.2 檢查 `gh` 使用適合平台的命令可實現 CLI 可用性（`which` 在 Unix/macOS 上， `where` 於Windows）
- [x] 1.3 檢查 GitHub 身份驗證狀態 `gh auth status`
- [x] 1.4 執行 `gh issue create` 使用格式化的標題和正文 `execFileSync` 防止 shell 注入
- [x] 1.5 顯示傳回的問題URL `gh` CLI
- [x] 1.6 註冊 `feedback <message>` 命令輸入 `src/cli/index.ts`
- [x] 1.7 確保跨平台相容性（macOS、Linux、Windows）

## 2. 外殼竣工

- [x] 2.1 添加 `feedback` 命令到命令註冊表
- [x] 2.2 重新產生所有shell的完成腳本

## 3.回饋技巧

- [x] 3.1 建立回饋技能模板 `skill-templates.ts`
- [x] 3.2 文件上下文收集工作流程
- [x] 3.3 文檔匿名化規則
- [x] 3.4 Document user confirmation flow

## 4. 測試

- [x] 4.1 為回授命令新增單元測試（mock `gh` 子流程呼叫）
- [x] 4.2 使用模擬添加完整回饋流程的整合測試 `gh` CLI
- [x] 4.3 測試缺失的錯誤處理 `gh` CLI
- [x] 4.4 測試未驗證的錯誤處理 `gh` 會議
- [x] 4.5 測試跨平台 `gh` CLI檢測（驗證 `which` 在 Unix 上， `where` 於Windows）
- [x] 4.6 測試平台元資料包括 Windows 的正確值 (win32)
