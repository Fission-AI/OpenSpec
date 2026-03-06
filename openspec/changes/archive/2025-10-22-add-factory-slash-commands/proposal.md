## 為什麼
Factory 的 Droid CLI 最近發布了反映其他本機助理整合的自訂斜線指令。使用 OpenSpec 的團隊希望獲得與 Cursor、Windsurf 等相同的託管工作流程，因此 init/update 可以設定和重新整理 Factory 命令，而無需手動設定。

## 有什麼變化
- 擴展本機工具註冊表，以便 Factory/Droid 與其他斜杠命令整合一起出現 `openspec init`.
- 新增產生三個 Factory 自訂命令（建議、應用、存檔）的共用模板，並將它們包裝在 OpenSpec 標記中以實現安全重新整理。
- 更新 init 和 update 命令流，以便在選擇工具或工具已存在時建立或重新整理 Factory 命令檔。
- 重新整理 CLI 規範以記錄工廠支援並調整驗證預期。

## 影響
- 受影響的規格： `specs/cli-init`, `specs/cli-update`
- 受影響的程式碼（預期）：工具登錄、斜線命令範本管理器、初始化/更新命令幫助程式、文件片段
