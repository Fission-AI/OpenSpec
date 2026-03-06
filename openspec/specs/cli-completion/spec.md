# cli-完成規範

## 目的
為 OpenSpec CLI 提供 shell 完成腳本，從而跨多個 shell 啟用命令、標誌和動態值（更改 ID、規範 ID）的製表符完成。支援Zsh、Bash、Fish 和PowerShell。
## 要求
### 要求：本機 Shell 行為集成

完成系統應尊重並與每個受支援的 shell 的本機完成模式和使用者互動模型整合。

#### 場景：Zsh 本機完成

- **何時**產生 Zsh 完成腳本
- **那麼** 使用 Zsh 完成系統 `_arguments`, `_describe`， 和 `compadd`
- **並且** 完成應在單一 TAB 上觸發（標準 Zsh 行為）
- **AND** 顯示為互動式選單，使用者可以使用 TAB/箭頭鍵進行導航
- **並且** 自動支援 Oh My Zsh 的增強選單樣式

#### 場景：Bash 本機完成

- **何時**產生 Bash 完成腳本
- **那麼** 使用 Bash 完成 `complete` 內建和 `COMPREPLY` 大批
- **並且** 完成應在雙 TAB 上觸發（標準 Bash 行為）
- **AND** 顯示為空格分隔的清單或列格式
- **AND** 支援 bash-completion v1 和 v2 模式

#### 場景：Fish 本機完成

- **何時**產生 Fish 完成腳本
- **那麼**使用Fish's `complete` 帶條件的命令
- **並且** 完成應在具有自動建議預覽的單一選項卡上觸發
- **和** 以 Fish 的本機顏色和描述對齊方式顯示
- **並且** 自動利用 Fish 的內建緩存

#### 場景：PowerShell 本機完成

- **何時**產生 PowerShell 完成腳本
- **然後**使用 `Register-ArgumentCompleter` 帶腳本區塊
- **並且** 完成應在具有循環行為的 TAB 上觸發
- **並且** 使用 PowerShell 的本機完成 UI 顯示
- **並且** 支援 Windows PowerShell 5.1 和 PowerShell Core 7+

#### 場景：沒有自訂 UX 模式

- **何時** 為任何 shell 實作完成
- **那麼** 不要嘗試自訂完成觸發器行為
- **且** 不覆蓋特定於 shell 的導航模式
- **並** 確保該 shell 的有經驗的使用者感覺完成是原生的

### 要求：命令結構

完成命令應遵循子命令模式來產生和管理完成腳本。

#### 場景：可用子命令

- **何時** 使用者執行 `openspec completion --help`
- **THEN** 顯示可用的子命令：
  - `generate [shell]` - 為 shell 產生完成腳本（輸出到 stdout）
  - `install [shell]` - Zsh 安裝完成（自動偵測或需要明確 shell）
  - `uninstall [shell]` - 刪除 Zsh 的完成（自動偵測或需要明確 shell）

### 要求：外殼檢測

完成系統應自動偵測使用者目前的 shell 環境。

#### 場景：從環境中檢測 Zsh

- **何時** 沒有明確指定 shell
- **然後**閱讀 `$SHELL` 環境變數
- **並且** 從路徑中提取 shell 名稱（例如， `/bin/zsh` → `zsh`)
- **並且**驗證 shell 是以下之一： `zsh`, `bash`, `fish`, `powershell`
- **並且** 如果不支援 shell 則拋出錯誤

#### 場景：從環境中偵測 Bash

- **什麼時候** `$SHELL` 包含 `bash` 在路徑中
- **然後** 檢測 shell 為 `bash`
- **並且** 繼續執行特定於 bash 的完成邏輯

#### 場景：從環境中偵測 Fish

- **什麼時候** `$SHELL` 包含 `fish` 在路徑中
- **然後** 檢測 shell 為 `fish`
- **並且** 繼續執行特定於魚的完成邏輯

#### 場景：從環境中偵測 PowerShell

- **什麼時候** `$PSModulePath` 環境變數存在
- **然後** 檢測 shell 為 `powershell`
- **AND** 繼續執行 PowerShell 特定的完成邏輯

#### 場景：不支援 shell 偵測

- **何時** shell 路徑指示不受支援的 shell
- **然後** 拋出錯誤：「Shell '<name>' 不支援。支援的 shell：zsh、bash、fish、powershell”

### 要求：完成生成

完成命令應根據需要為所有支援的 shell 產生完成腳本。

#### 場景：產生 Zsh 完成度

- **何時** 使用者執行 `openspec completion generate zsh`
- **然後** 將完整的 Zsh 完成腳本輸出到 stdout
- **並且** 包含所有指令的完成：init、list、show、validate、archive、view、update、change、spec、completion
- **並且** 包括所有特定於命令的標誌和選項
- **並且**使用Zsh's `_arguments` 和 `_describe` 內建函數
- **並且** 支援變更和規範 ID 的動態完成

#### 場景：產生 Bash 完成度

- **何時** 使用者執行 `openspec completion generate bash`
- **THEN** 將完整的 Bash 完成腳本輸出到 stdout
- **AND** 包含所有命令和子命令的補全
- **和**使用 `complete -F` 具有自訂完成功能
- **和** 填充 `COMPREPLY` 並提出適當的建議
- **並且**支援透過以下方式動態完成變更和規範 ID `openspec __complete`

#### 場景：產生 Fish 完成度

- **何時** 使用者執行 `openspec completion generate fish`
- **THEN** 將完整的 Fish 完成腳本輸出到 stdout
- **和**使用 `complete -c openspec` 有條件
- **並且** 包括特定於命令的完成 `--condition` 謂詞
- **並且**支援透過以下方式動態完成變更和規範 ID `openspec __complete`
- **並且**包括每個完成選項的描述

#### 場景：產生 PowerShell 完成度

- **何時** 使用者執行 `openspec completion generate powershell`
- **THEN** output a complete PowerShell completion script to stdout
- **和**使用 `Register-ArgumentCompleter -CommandName openspec`
- **和** 實作處理命令上下文的腳本區塊
- **並且**支援透過以下方式動態完成變更和規範 ID `openspec __complete`
- **和**返回 `[System.Management.Automation.CompletionResult]` 物體

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

完成命令應自動將完成腳本安裝到所有支援的 shell 的 shell 設定檔中。

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

#### 場景：使用 bash-completion 安裝 Bash

- **何時** 使用者執行 `openspec completion install bash`
- **然後** 透過檢查來偵測是否安裝了 bash-completion `/usr/share/bash-completion` 或者 `/etc/bash_completion.d`
- **並且** 如果 bash-completion 可用，請寫入 `/etc/bash_completion.d/openspec` （使用 sudo）或 `~/.local/share/bash-completion/completions/openspec`
- **並且** 如果 bash-completion 不可用，請寫入 `~/.bash_completion.d/openspec` 並來源自 `~/.bashrc`
- **並且**新增採購線到 `~/.bashrc` 如果需要，使用基於標記的更新
- **並且** 顯示成功訊息以及執行說明 `exec bash` 或重新啟動終端

#### 場景：安裝 Fish

- **何時** 使用者執行 `openspec completion install fish`
- **然後** 建立 Fish 完成目錄 `~/.config/fish/completions/` 如果它不存在
- **並且** 將完成腳本寫入 `~/.config/fish/completions/openspec.fish`
- **AND** Fish 會自動從此目錄載入完成內容（無需修改設定檔）
- **並且** 顯示成功訊息，指示完成立即可用

#### 場景：安裝PowerShell

- **何時** 使用者執行 `openspec completion install powershell`
- **然後** 透過以下方式偵測 PowerShell 設定檔位置 `$PROFILE` 環境變數或預設路徑
- **並且**建立設定檔目錄（如果不存在）
- **並且**使用基於標記的更新將完成腳本導入新增到設定檔中
- **並且** 將完成腳本寫入 PowerShell 模組目錄或與設定檔一起
- **並且** 顯示成功訊息以及重新啟動 PowerShell 或執行的指令 `. $PROFILE`

#### 場景：自動偵測shell進行安裝

- **何時** 使用者執行 `openspec completion install` 不指定外殼
- **然後** 使用 shell 偵測邏輯來偵測目前 shell
- **和** 偵測到的 shell（zsh、bash、fish 或 powershell）的安裝完成
- **AND** 顯示偵測到哪個 shell

#### 場景：已安裝

- **何時** 已為目標 shell 安裝完成
- **THEN** 顯示訊息表示已安裝完成
- **並且**透過覆蓋現有文件提供重新安裝/更新
- **並且** 以代碼 0 退出

### 要求：卸載

完成命令應刪除所有支援的 shell 的已安裝完成腳本和設定。

#### Scenario: Uninstalling Zsh completion

- **何時** 使用者執行 `openspec completion uninstall zsh`
- **THEN** prompt for confirmation before proceeding (unless `--yes` 提供標誌）
- **並且** 如果使用者拒絕，則取消卸載並顯示「卸載已取消」。
- **並且**如果用戶確認，則刪除 `~/.oh-my-zsh/custom/completions/_openspec` 如果檢測到 Oh My Zsh
- **並**刪除 `~/.zsh/completions/_openspec` 如果偵測到標準 Zsh 設定
- **並** 刪除 fpath 修改 `~/.zshrc` 使用基於標記的刪除
- **並** 顯示成功訊息

#### 場景：卸載Bash完成

- **何時** 使用者執行 `openspec completion uninstall bash`
- **THEN** 提示確認（除非 `--yes` 提供標誌）
- **並且** 如果使用者確認，則從 bash-completion 目錄中刪除完成檔案或 `~/.bash_completion.d/`
- **並**從以下位置刪除來源線 `~/.bashrc` 使用基於標記的刪除
- **並** 顯示成功訊息

#### 場景：卸載Fish完成

- **何時** 使用者執行 `openspec completion uninstall fish`
- **THEN** 提示確認（除非 `--yes` 提供標誌）
- **並且**如果用戶確認，則刪除 `~/.config/fish/completions/openspec.fish`
- **AND** 顯示成功訊息（無需修改設定檔）

#### 場景：卸載PowerShell完成

- **何時** 使用者執行 `openspec completion uninstall powershell`
- **THEN** 提示確認（除非 `--yes` 提供標誌）
- **並且** 如果使用者確認，則使用基於標記的刪除從 PowerShell 設定檔中刪除完成匯入
- **並**刪除完成腳本文件
- **並** 顯示成功訊息

#### 場景：自動偵測shell進行卸載

- **何時** 使用者執行 `openspec completion uninstall` 不指定外殼
- **然後** 偵測目前 shell 並卸載該 shell 的完成情況

#### 場景：未安裝

- **何時** 嘗試卸載未安裝的完成
- **THEN** 顯示錯誤訊息，表示未安裝完成
- **並且** 使用代碼 1 退出

### 要求：架構模式

完成實作應遵循乾淨的架構原則和 TypeScript 最佳實踐，透過基於插件的模式支援多個 shell。

#### 場景：殼牌專用發電機

- **何時** 實作完成產生器
- **然後** 為每個 shell 建立生成器類別： `ZshGenerator`, `BashGenerator`, `FishGenerator`, `PowerShellGenerator`
- **並且**實施一個共同的 `CompletionGenerator` 接口與方法：
  - `generate(commands: CommandDefinition[]): string` - 傳回完整的 shell 腳本
- **AND** 每個生成器處理特定於 shell 的語法、轉義和模式
- **並且** 所有生成器消耗相同的電量 `CommandDefinition[]` 從命令註冊表

#### 場景：特定於 Shell 的安裝程序

- **何時**實施完成安裝程序
- **然後** 為每個 shell 建立安裝程式類別： `ZshInstaller`, `BashInstaller`, `FishInstaller`, `PowerShellInstaller`
- **並且**實施一個共同的 `CompletionInstaller` 接口與方法：
  - `install(script: string): Promise<InstallationResult>` - 安裝完成腳本
  - `uninstall(): Promise<{ success: boolean; message: string }>` - 刪除完成
- **並且** 每個安裝程式都會處理特定於 shell 的路徑、設定檔和安裝模式

#### 場景：工廠模式進行shell選擇

- **何時** 選擇特定於 shell 的實現
- **然後**使用 `CompletionFactory` 具有靜態方法的類別：
  - `createGenerator(shell: SupportedShell): CompletionGenerator`
  - `createInstaller(shell: SupportedShell): CompletionInstaller`
- **AND** 工廠使用帶有 TypeScript 詳盡檢查的 switch 語句
- **並且** 新增新的 shell 需要更新 `SupportedShell` 型號及工廠案例

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
  - `acceptsPositional: boolean` - 指令是否採用位置參數
  - `positionalType: string` - 位置類型（change-id、spec-id、path、shell）
  - `subcommands?: CommandDefinition[]` - 嵌套子命令
- **並且**導出一個 `COMMAND_REGISTRY` 所有命令定義的常數
- **並且** 所有產生器都使用此登錄來確保 shell 之間的一致性

#### 場景：類型安全的 shell 偵測

- **何時**實施外殼偵測
- **然後** 定義一個 `SupportedShell` 類型為文字類型： `'zsh' | 'bash' | 'fish' | 'powershell'`
- **和**實施 `detectShell()` 函數於 `src/utils/shell-detection.ts`
- **並且** 返回偵測到的 shell 或拋出錯誤以及支援的 shell 列表

### 要求：錯誤處理

完成命令應為常見故障場景提供清晰的錯誤訊息。

#### 場景：不支援的 shell

- **何時** 使用者要求完成不支援的 shell（例如 ksh、csh、tcsh）
- **然後** 顯示錯誤訊息："Shell '<name>' 尚不支援。目前支援：zsh、bash、fish、powershell”
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

- **什麼時候** `openspec completion install` cannot detect current shell
- **然後** 顯示錯誤：“無法自動偵測 shell。請明確指定 shell。”
- **AND** 顯示用法提示：「用法：openspec 完成 <operation> [殼]”
- **並且** 使用代碼 1 退出

### 要求：輸出格式

完成命令應提供機器可解析和人類可讀的輸出。

#### 場景：腳本產生輸出

- **何時** 產生完成腳本到標準輸出
- **THEN** 只輸出完成腳本內容（沒有額外的訊息）
- **並且**允許重定向到檔案： `openspec completion generate zsh > /path/to/_openspec`

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

完成實作應可透過所有支援 shell 的單元和整合測試進行測試。

#### 場景：模擬shell環境

- **何時** 編寫 shell 檢測測試
- **然後** 允許覆蓋 `$SHELL` 和 `$PSModulePath` 環境變數
- **並且** 使用依賴注入進行檔案系統操作
- **和** 獨立測試所有四個外殼的檢測

#### 場景：發電機輸出驗證

- **何時** 測試完成產生器
- **然後** 為每個 shell 產生器（zsh、bash、fish、powershell）建立測試套件
- **並** 驗證產生的腳本包含該 shell 的預期模式
- **和** 測試命令註冊表是否正確使用
- **並** 確保存在動態完成佔位符
- **和** 驗證特定於 shell 的語法和轉義

#### 場景：安裝人員模擬

- **何時** 測試安裝邏輯
- **然後** 為每個 shell 安裝程式建立測試套件
- **並且** 使用臨時測試目錄而不是實際的主目錄
- **和** 驗證檔案建立而不修改真實的 shell 設定
- **AND** 獨立測試路徑解析邏輯
- **和** 模擬檔案系統操作以避免副作用

#### Scenario: Cross-shell consistency

- **WHEN** testing completion behavior
- **然後** 驗證所有 shell 支援相同的命令和標誌
- **並**驗證動態補全在 shell 中的一致性
- **並** 確保錯誤訊息在 shell 之間保持一致

