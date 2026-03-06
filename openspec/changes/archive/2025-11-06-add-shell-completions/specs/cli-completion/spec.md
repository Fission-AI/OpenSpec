# CLI 完成規範

## 目的

這 `openspec completion` 命令應為所有 OpenSpec CLI 命令、標誌和動態值（更改 ID、規範 ID）提供 shell 完成功能，並支援 Zsh（包括 Oh My Zsh）和為未來 shell（bash、fish、PowerShell）做好準備的可擴展架構。完成系統應與 Zsh 的本機完成行為集成，而不是嘗試自訂使用者體驗。

## 新增要求

### 要求：本機 Shell 行為集成

完成系統應尊重並與 Zsh 的本機完成模式和使用者互動模型整合。

#### 場景：Zsh 本機完成

- **何時**產生 Zsh 完成腳本
- **那麼** 使用 Zsh 完成系統 `_arguments`, `_describe`， 和 `compadd`
- **並且** 完成應在單一 TAB 上觸發（標準 Zsh 行為）
- **AND** 顯示為互動式選單，使用者可以使用 TAB/箭頭鍵進行導航
- **並且** 自動支援 Oh My Zsh 的增強選單樣式

#### 場景：沒有自訂 UX 模式

- **何時** 實施 Zsh 完成率
- **那麼** 不要嘗試自訂完成觸發器行為
- **並且** 不要覆蓋 Zsh 特定的導航模式
- **並且**確保完成對於有經驗的 Zsh 用戶來說是原生的

### 要求：命令結構

完成命令應遵循子命令模式來產生和管理完成腳本。

#### 場景：可用子命令

- **何時** 使用者執行 `openspec completion --help`
- **THEN** 顯示可用的子命令：
  - `zsh` - 產生Zsh完成腳本
  - `install [shell]` - Zsh 安裝完成（自動偵測或需要明確 shell）
  - `uninstall [shell]` - 刪除 Zsh 的完成（自動偵測或需要明確 shell）

### 要求：外殼檢測

完成系統應自動偵測使用者目前的 shell 環境。

#### 場景：從環境中檢測 Zsh

- **何時** 沒有明確指定 shell
- **然後**閱讀 `$SHELL` 環境變數
- **並且** 從路徑中提取 shell 名稱（例如， `/bin/zsh` → `zsh`)
- **並且**驗證 shell 是 `zsh`
- **並且** 如果 shell 不是，則拋出錯誤 `zsh`，訊息表明當前僅支援 Zsh

#### 場景：非Zsh shell偵測

- **何時** shell 路徑指示 bash、fish、powershell 或其他非 Zsh shell
- **然後** 拋出錯誤：「Shell '<name>' 尚不支援。目前支援：zsh”

### 要求：完成生成

完成命令應根據需要產生 Zsh 完成腳本。

#### 場景：產生 Zsh 完成度

- **何時** 使用者執行 `openspec completion zsh`
- **然後** 將完整的 Zsh 完成腳本輸出到 stdout
- **並且** 包含所有指令的完成：init、list、show、validate、archive、view、update、change、spec、completion
- **並且** 包括所有特定於命令的標誌和選項
- **並且**使用Zsh's `_arguments` 和 `_describe` 內建函數
- **並且** 支援變更和規範 ID 的動態完成

### 要求：動態完成

完成系統應為項目特定值提供上下文感知的動態完成。

#### 場景：完成變更 ID

- **何時** 完成接受更改名稱的命令的參數（顯示、驗證、存檔）
- **然後**發現來自的活躍變化 `openspec/changes/` 目錄
- **並** 排除已存檔的更改 `openspec/changes/archive/`
- **並且** 返回更改 ID 作為完成建議
- **並且** 僅在啟用 OpenSpec 的項目中提供建議

#### 場景：完成規格 ID

- **何時** 完成接受規範名稱的命令的參數（顯示、驗證）
- **然後** 發現規格 `openspec/specs/` 目錄
- **並且** 返回規範 ID 作為完成建議
- **並且** 僅在啟用 OpenSpec 的項目中提供建議

#### 場景：完成快取

- **何時** 請求動態完成
- **然後** 將發現的變更和規範 ID 快取 2 秒
- **並且** 在快取視窗內為後續請求重複使用快取值
- **並且**過期後自動重新整理快取

#### 場景：專案偵測

- **何時** 使用者請求在 OpenSpec 項目之外完成
- **然後** 跳過動態變更/規範 ID 完成
- **並且**僅建議靜態命令和標誌

### 需求：安裝自動化

完成命令應自動將完成腳本安裝到 shell 設定檔中。

#### 場景：安裝 Oh My Zsh

- **何時** 使用者執行 `openspec completion install zsh`
- **然後** 透過檢查來檢測 Oh My Zsh 是否已安裝 `$ZSH` 環境變數或 `~/.oh-my-zsh/` 目錄
- **並** 在以下位置建立自訂完成目錄 `~/.oh-my-zsh/custom/completions/` 如果它不存在
- **並且** 將完成腳本寫入 `~/.oh-my-zsh/custom/completions/_openspec`
- **並**確保 `~/.oh-my-zsh/custom/completions` 是在 `$fpath` 透過更新 `~/.zshrc` 如果需要的話
- **並且** 顯示成功訊息以及執行說明 `exec zsh` 或重新啟動終端

#### 場景：安裝標準Zsh

- **何時** 使用者執行 `openspec completion install zsh` 哦，我的 Zsh 未檢測到
- **然後** 建立完成目錄 `~/.zsh/completions/` 如果它不存在
- **並且** 將完成腳本寫入 `~/.zsh/completions/_openspec`
- **並**添加 `fpath=(~/.zsh/completions $fpath)` 到 `~/.zshrc` 如果尚未出現
- **並**添加 `autoload -Uz compinit && compinit` 到 `~/.zshrc` 如果尚未出現
- **並且** 顯示成功訊息以及執行說明 `exec zsh` 或重新啟動終端

#### 場景：自動偵測Zsh進行安裝

- **何時** 使用者執行 `openspec completion install` 不指定外殼
- **然後** 使用 shell 偵測邏輯來偵測目前 shell
- **且** 如果偵測到的 shell 是 Zsh，則安裝完成
- **且** 如果偵測到的 shell 不是 Zsh，則拋出錯誤
- **AND** 顯示偵測到哪個 shell

#### 場景：已安裝

- **何時** 已為目標 shell 安裝完成
- **THEN** 顯示訊息表示已安裝完成
- **並且**透過覆蓋現有文件提供重新安裝/更新
- **並且** 以代碼 0 退出

### 要求：卸載

完成命令應刪除已安裝的完成腳本和設定。

#### 場景：卸載 Oh My Zsh 完成

- **何時** 使用者執行 `openspec completion uninstall zsh`
- **然後**刪除 `~/.oh-my-zsh/custom/completions/_openspec` 如果檢測到 Oh My Zsh
- **並**刪除 `~/.zsh/completions/_openspec` 如果偵測到標準 Zsh 設定
- **並且**可選擇刪除 fpath 修改 `~/.zshrc` （有確認）
- **並** 顯示成功訊息

#### 場景：自動偵測Zsh進行卸載

- **何時** 使用者執行 `openspec completion uninstall` 不指定外殼
- **那麼** 偵測目前 shell，如果 shell 是 Zsh，則卸載完成
- **且** 如果偵測到的 shell 不是 Zsh，則拋出錯誤

#### 場景：未安裝

- **何時** 嘗試卸載未安裝的完成
- **THEN** 顯示訊息表示未安裝完成
- **並且** 以代碼 0 退出

### 要求：架構模式

完成實施應遵循乾淨的架構原則和TypeScript最佳實務。

#### 場景：殼牌專用發電機

- **何時** 實作完成產生器
- **然後**建立 `ZshCompletionGenerator` Zsh 的班級
- **並且**實施一個共同的 `CompletionGenerator` 接口與方法：
  - `generate(): string` - 傳回完整的 shell 腳本
  - `getInstallPath(): string` - 返回目標安裝路徑
  - `getConfigFile(): string` - 返回 shell 設定檔路徑
- **和** 設計介面可針對未來的 shell（bash、fish、powershell）進行擴展

#### 場景：動態完成提供者

- **何時**實施動態完成
- **然後** 建立一個 `CompletionProvider` 封裝項目發現邏輯的類
- **和** 實作方法：
  - `getChangeIds(): Promise<string[]>` - 發現活動變更 ID
  - `getSpecIds(): Promise<string[]>` - 發現規格 ID
  - `isOpenSpecProject(): boolean` - 檢查目前目錄是否啟用 OpenSpec
- **並且** 使用類別屬性實現 2 秒 TTL 的緩存

#### 場景：命令註冊表

- **何時** 定義可完成的命令
- **然後** 建立一個集中式 `CommandDefinition` 具有屬性的類型：
  - `name: string` - 命令名稱
  - `description: string` - 幫助文本
  - `flags: FlagDefinition[]` - 可用的標誌
  - `acceptsChangeId: boolean` - 指令是否採用更改 ID 參數
  - `acceptsSpecId: boolean` - 指令是否採用規範 ID 參數
  - `subcommands?: CommandDefinition[]` - 嵌套子命令
- **並且**導出一個 `COMMAND_REGISTRY` 所有命令定義的常數
- **和** 產生器使用此註冊表來確保一致性

#### 場景：類型安全的 shell 偵測

- **何時**實施外殼偵測
- **然後** 定義一個 `SupportedShell` 類型為文字類型： `'zsh'`
- **和**實施 `detectShell()` 傳回“zsh”或拋出錯誤的函數
- **和** 設計類型可擴展（例如，未來： `'bash' | 'zsh' | 'fish' | 'powershell'`)

### 要求：錯誤處理

完成命令應為常見故障場景提供清晰的錯誤訊息。

#### 場景：不支援的 shell

- **何時** 使用者請求完成不支援的 shell（bash、fish、powershell 等）
- **然後** 顯示錯誤訊息："Shell '<name>' 尚不支援。目前支援：zsh”
- **並且** 使用代碼 1 退出

#### 場景：安裝過程中權限錯誤

- **何時** 由於檔案權限問題安裝失敗
- **然後** 顯示明確的錯誤訊息，指示權限問題
- **並**建議使用適當的權限或替代安裝方法
- **並且** 使用代碼 1 退出

#### Scenario: Missing shell configuration directory

- **何時** 預期的 shell 設定目錄不存在
- **然後** 自動建立目錄（並通知使用者）
- **並**繼續安裝

#### 場景：未偵測到 Shell

- **什麼時候** `openspec completion install` 無法偵測到目前 shell 或偵測到非 Zsh shell
- **然後** 顯示錯誤：“無法偵測 Zsh。請明確指定：openspec 完成安裝 zsh”
- **並且** 使用代碼 1 退出

### 要求：輸出格式

完成命令應提供機器可解析和人類可讀的輸出。

#### 場景：腳本產生輸出

- **何時** 產生完成腳本到標準輸出
- **THEN** 只輸出完成腳本內容（沒有額外的訊息）
- **並且**允許重定向到檔案： `openspec completion zsh > /path/to/_openspec`

#### 場景：安裝成功輸出

- **何時** 安裝成功完成
- **然後** 顯示已格式化的成功訊息：
  - 複選標記指示器
  - 安裝位置
  - 後續步驟（shell 重新載入說明）
- **且** 當終端支援時使用顏色（除非 `--no-color` 已設定）

#### 場景：詳細安裝輸出

- **何時** 用戶提供 `--verbose` 安裝期間標記
- **THEN** 顯示詳細步驟：
  - 外殼檢測結果
  - 目標檔案路徑
  - 設定修改
  - 文件建立確認

### 需求：測試支援

完成實現應可透過單元測試和整合測試進行測試。

#### 場景：模擬shell環境

- **何時** 編寫 shell 檢測測試
- **然後** 允許覆蓋 `$SHELL` 環境變數
- **並且** 使用依賴注入進行檔案系統操作

#### 場景：發電機輸出驗證

- **何時** 測試完成產生器
- **然後** 驗證產生的腳本包含預期的模式
- **和** 測試命令註冊表是否正確使用
- **並** 確保存在動態完成佔位符

#### 場景：安裝模擬

- **何時** 測試安裝邏輯
- **然後** 使用臨時測試目錄而不是實際的主目錄
- **和** 驗證檔案建立而不修改真實的 shell 設定
- **AND** 獨立測試路徑解析邏輯

## 不在範圍內

本提案中的以下 shell **已在架構上進行了記錄，但尚未實現**。它們將在未來的提案中添加：

- **Bash 完成** - 將使用 bash-completion 框架 `_init_completion`, `compgen`， 和 `COMPREPLY`
- **Fish 完成** - 將使用 Fish 的聲明式 `complete -c` 句法
- **PowerShell 完成** - 將使用 `Register-ArgumentCompleter` 帶有完成結果對象

基於插件的架構（CompletionGenerator 介面、命令註冊表、動態提供者）旨在讓在後續變更中新增這些 shell 變得簡單。

## 為什麼

Shell 補全對於專業 CLI 工具至關重要，並透過減少日常工作流程中的摩擦、錯誤和認知負荷來顯著改善開發人員體驗。
