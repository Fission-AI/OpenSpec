# Init指令的實作任務

## 1. 核心基礎設施
- [x] 1.1 使用目錄/檔案建立實用程式建立 src/utils/file-system.ts
- [x] 1.2 建立src/core/templates/index.ts用於範本管理
- [x] 1.3 建立src/core/init.ts，主要初始化邏輯
- [x] 1.4 建立src/core/config.ts用於設定管理

## 2. 範本文件
- [x] 2.1 建立src/core/templates/readme-template.ts，內容為OpenSpec README
- [x] 2.2 建立 src/core/templates/project-template.ts 並帶有可自訂的project.md
- [x] 2.3 為帶有標記的 CLAUDE.md 內容建立 src/core/templates/claude-template.ts

## 3.AI工具設定器
- [x] 3.1 建立具有ToolConfigurator介面的src/core/configurators/base.ts
- [x] 3.2 建立 src/core/configurators/claude.ts 進行Claude程式碼設定
- [x] 3.3 建立src/core/configurators/registry.ts用於工具註冊
- [x] 3.4 對現有組態實施基於標記的文件更新

## 4. Init命令實現
- [x] 4.1 使用 Commander 將 init 指令加入到 src/cli/index.ts
- [x] 4.2 實現具有多選提示的 AI 工具選擇（Claude 代碼可用，其他“即將推出”）- 需要至少一個選擇
- [x] 4.3 新增對現有 OpenSpec 目錄的驗證以及有用的錯誤訊息
- [x] 4.4 實作目錄結構建立
- [x] 4.5 使用模板和標記實現文件生成

## 5.使用者體驗
- [x] 5.1 新增彩色控制台輸出以獲得更好的使用者體驗
- [x] 5.2 實施進度指標（步驟1/3、2/3、3/3）
- [x] 5.3 新增成功訊息以及可操作的後續步驟（編輯project.md，建立第一個變更）
- [x] 5.4 新增錯誤處理和有用的消息

## 6. 測試和文檔
- [x] 6.1 為檔案系統實用程式新增單元測試
- [x] 6.2 為基於標記的文件更新新增單元測試
- [x] 6.3 為init指令新增整合測試
- [x] 6.4 使用正確的 bin 設定更新 package.json
- [x] 6.5 端到端測試建置的CLI命令