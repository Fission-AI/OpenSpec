# 添加 Shell 補全

## 為什麼

OpenSpec CLI 指令缺少 shell 補全，迫使使用者手動記住所有指令、子指令、標誌和變更/規範 ID。這會在日常使用過程中產生摩擦並減慢開發人員的工作流程。 Shell 完成是現代 CLI 工具的標準期望，並透過以下方式顯著改善使用者體驗：
- 透過選項卡補全更快發現指令
- 透過消除記憶要求來減少認知負荷
- 透過經過驗證的建議減少拼字錯誤
- 生產級工具需要專業打磨

## 有什麼變化

此更改增加了對 OpenSpec CLI 的 shell 完成支援，從 **Zsh（包括 Oh My Zsh）** 開始，並為未來的 shell（bash、fish、PowerShell）建立可擴展的架構。該實施規定：

1. **新的 `openspec completion` 命令** 具有 Zsh 生成和安裝/卸載功能
2. **本機 Zsh 整合** 尊重標準 Zsh 選項卡完成行為（單選項卡選單導覽）
3. **動態完成提供者**，發現目前專案的活動變更和規範
4. **基於插件的架構**使用 TypeScript 接口，以便在未來的提案中輕鬆擴展至其他 shell
5. **安裝自動化** Oh My Zsh（優先）和標準 Zsh 設定
6. **上下文感知建議**僅在 OpenSpec 啟用的項目中激活

該架構強調乾淨的 TypeScript 模式、可組合生成器、特定於 shell 的邏輯和共享完成資料提供者之間的關注點分離，以及與本機 shell 完成系統的整合。其他 shell（bash、fish、PowerShell）在架構上有文件記錄，但未在本提案中實現——它們將在後續更改中添加。

## 三角洲

### 增量：新的CLI完成規範
- **規格：** cli 完成
- **操作：** 新增
- **描述：** 定義新的要求 `openspec completion` 指令包括 Oh My Zsh、bash、fish 和 PowerShell 的產生、安裝和特定於 shell 的行為。