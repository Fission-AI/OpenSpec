# 新增 OpenSpec 的初始化命令

## 為什麼

專案需要一種簡單的方法來採用 OpenSpec 約定。目前，使用者必須手動建立目錄結構並瞭解所有約定，這給採用帶來了障礙。 init 指令將啟用具有正確結構和指導的即時 OpenSpec 設定。

## 有什麼變化

- 添加 `openspec init` CLI 指令建立完整的 OpenSpec 目錄結構
- 產生模板檔（帶有AI指令的README.md、project.md模板）
- 互動式提示選擇要設定的 AI 工具（Claude 程式碼最初，其他標記為「即將推出」）
- 支援多個具有可擴充插件架構的AI編碼助手
- 使用內容標記進行智慧型文件更新以保留現有設定
- 自訂目錄命名 `--dir` 旗幟
- 驗證以防止覆蓋現有的 OpenSpec 結構
- 清除錯誤訊息並提供有用的指導（例如，建議對現有結構進行「openspec 更新」）
- 成功初始化後顯示可操作的後續步驟

### 重大變化
- 無 - 這是一個新功能

## 影響

- 受影響的規格：無（新功能）
- 受影響的代碼： 
  - src/cli/index.ts（新增init指令）
  - src/core/init.ts（新 - 初始化邏輯）
  - src/core/templates/（新 - 模板檔案）
  - src/core/configurators/（新 - AI 工具外掛程式）
  - src/utils/file-system.ts（新 - 檔案操作）