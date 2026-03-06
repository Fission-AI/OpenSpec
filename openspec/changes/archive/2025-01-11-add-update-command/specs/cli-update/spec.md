# 更新命令規範

## 目的

作為使用 OpenSpec 的開發人員，我希望在新版本發佈時更新專案中的 OpenSpec 指令，以便我可以從 AI 代理指令的改進中受益。

## 核心要求

### 更新行為

更新命令應將 OpenSpec 指令檔案更新為最新範本。

當用戶執行時 `openspec update` 那麼命令應該：
- 檢查是否 `openspec` 目錄存在
- 代替 `openspec/README.md` 使用最新模板（完全替換）
- 更新 OpenSpec 管理的區塊 `CLAUDE.md` 使用標記
  - 將使用者內容保留在標記之外
  - 創造 `CLAUDE.md` 如果遺失
- 顯示 ASCII 安全成功訊息：“已更新 OpenSpec 指令”

### 先決條件

該命令應要求：
- 現有的 `openspec` 目錄（由建立 `openspec init`)

如果 `openspec` 目錄不存在然後：
- 顯示錯誤：“未找到 OpenSpec 目錄。請先執行 'openspec init'。”
- 使用代碼 1 退出

### 文件處理

更新命令應：
- 完全取代 `openspec/README.md` 與最新的模板
- 僅更新 OpenSpec 管理的區塊 `CLAUDE.md` 使用標記
- 使用預設目錄名 `openspec`
- 冪等（重複執行沒有額外效果）

## 邊緣情況

### 文件權限
如果檔案寫入失敗，讓錯誤隨檔案路徑自然冒出。

### 失蹤的克勞德.md
如果 CLAUDE.md 不存在，則使用範本內容建立它。

### 自訂目錄名稱
此更改不支援。預設目錄名稱 `openspec` 應使用。

## 成功標準

用戶應該能夠：
- 使用單一指令更新OpenSpec指令
- 取得最新的AI代理指令
- 檢視更新的明確確認

更新過程應為：
- 簡單快速（無需版本檢查）
- 可預測（每次結果相同）
- 獨立（無需網路）