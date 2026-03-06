# @fission-ai/openspec

## 1.2.0

### 小改動

- [#747](https://github.com/Fission-AI/OpenSpec/pull/747) [`1e94443`](https://github.com/Fission-AI/OpenSpec/commit/1e94443a3551b228eecbc89e95d96d3b9600a192) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 新功能

  - **設定檔系統** — 選擇 `core` （4 個基本工作流程）和 `custom` （選擇任何子集）設定檔來控制安裝哪些技能。使用新功能管理個人資料 `openspec config profile` 命令
  - **建議工作流程** — 新的一步式工作流程可根據單一請求建立包含設計、規格和任務的完整變更建議 — 無需執行 `new` 然後 `ff` 分別地
  - **AI工具自動檢測** — `openspec init` 現在掃描您的專案以查找現有工具目錄（`.claude/`, `.cursor/`等）並預先選擇偵測到的工具
  - **Pi (pi.dev) 支援** — Pi 編碼代理現在是一個受支援的工具，具有提示和技能生成功能
  - **Kiro 支援** — AWS Kiro IDE 現在是支援提示和技能產生的工具
  - **同步修剪取消選​​擇的工作流程** — `openspec update` 現在刪除您已取消選擇的工作流程的命令檔案和技能目錄，保持專案乾淨
  - **設定漂移警告** — `openspec config list` 當全域設定與目前項目不同步時發出警告

  ### 錯誤修復

  - 修正了機載預檢在新初始化的項目上給出錯誤的“未初始化”錯誤
  - 修正了存檔工作流程在同步時中途停止的問題 - 現在可以在同步完成後正確恢復
  - 為板載 shell 指令新增了 Windows PowerShell 替代方案

## 1.1.1

### 補丁變更

- [#627](https://github.com/Fission-AI/OpenSpec/pull/627) [`afb73cf`](https://github.com/Fission-AI/OpenSpec/commit/afb73cf9ec59c6f8b26d0c538c0218c203ba3c56) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 錯誤修復

  - **OpenCode 指令引用** — 產生的檔案中的指令引用現在使用正確的 `/opsx-` 連字符格式而不是 `/opsx:` 冒號格式，確保指令在 OpenCode 中正常運作

## 1.1.0

### 小改動

- [#625](https://github.com/Fission-AI/OpenSpec/pull/625) [`53081fb`](https://github.com/Fission-AI/OpenSpec/commit/53081fb2a26ec66d2950ae0474b9a56cbc5b5a76) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 錯誤修復

  - **Codex 全域路徑支援** — Codex 適配器現在可以正確解析全域路徑，修正在專案目錄之外執行時的工作流程檔案產生問題 (#622)
  - **跨裝置或受限路徑上的存檔操作** — 當重新命名因 EPERM 或 EXDEV 錯誤而失敗時，檔案現在回退到複製+刪除，修復網路/外部磁碟機上的故障 (#605)
  - **工作流程訊息中的斜線指令提示** - 工作流程完成訊息現在顯示後續步驟的有用斜線指令提示 (#603)
  - **Windsurf 工作流程檔案路徑** — 更新了 Windsurf 適配器以使用正確的路徑 `workflows` 目錄而不是舊目錄 `commands` 路徑 (#610)

### 補丁變更

- [#550](https://github.com/Fission-AI/OpenSpec/pull/550) [`86d2e04`](https://github.com/Fission-AI/OpenSpec/commit/86d2e04cae76a999dbd1b4571f52fa720036be0c) 謝謝 [@jerome-benoit](https://github.com/jerome-benoit)！ - ### 改進

  - **Nix flake 維護** — 現在從 package.json 動態讀取版本，減少手動同步問題
  - **Nix 建置最佳化** — 來源過濾排除了 node_modules 和工件，從而縮短了建置時間
  - **update-flake.sh 腳本** — 偵測雜湊值是否正確，跳過不必要的重建

  ### 其他

  - 將 Nix CI 作業更新至最新版本（nix-installer v21、magic-nix-cache v13）

## 1.0.2

### 補丁變更

- [#596](https://github.com/Fission-AI/OpenSpec/pull/596) [`e91568d`](https://github.com/Fission-AI/OpenSpec/commit/e91568deb948073f3e9d9bb2d2ab5bf8080d6cf4) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 錯誤修復

  - 澄清規格命名約定 - 規格應以功能命名（`specs/<capability>/spec.md`），不改變
  - 固定任務核取方塊格式指導 - 任務現在明確要求 `- [ ]` 應用階段追蹤的核取方塊格式

## 1.0.1

### 補丁變更

- [#587](https://github.com/Fission-AI/OpenSpec/pull/587) [`943e0d4`](https://github.com/Fission-AI/OpenSpec/commit/943e0d41026d034de66b9442d1276c01b293eb2b) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 錯誤修復

  - 修正了入職文件中不正確的存檔路徑 - 範本現在顯示正確的路徑 `openspec/changes/archive/YYYY-MM-DD-<name>/` 而不是不正確的 `openspec/archive/YYYY-MM-DD--<name>/`

## 1.0.0

### 主要變化

- [#578](https://github.com/Fission-AI/OpenSpec/pull/578) [`0cc9d90`](https://github.com/Fission-AI/OpenSpec/commit/0cc9d9025af367faa1688a7b2606a2549053cd3f) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ## OpenSpec 1.0 — OPSX 版本

  工作流程已從頭開始重建。 OPSX 取代了舊的鎖相 `/openspec:*` 使用基於動作的系統發出命令，其中人工智慧瞭解存在哪些工件、準備建立什麼以及每個動作解鎖什麼。

  ### 重大變化

  - **舊指令已刪除** — `/openspec:proposal`, `/openspec:apply`， 和 `/openspec:archive` 不再存在
  - **設定檔已刪除** - 特定於工具的指令檔（`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, `project.md`) 不再生成
  - **遷移** — 執行 `openspec init` 升級。遺留工件被偵測並清理並確認。

  ### 從靜態提示到動態指令

  **之前：** 無論專案狀態如何，AI 每次都會收到相同的靜態指令。

  **現在：** 指令由三層動態組裝：

  1. **背景** — 專案背景 `config.yaml` （技術堆疊、約定）
  2. **規則** - 特定於工件的約束（例如，「為未知數提出峰值任務」）
  3. **範本** — 輸出檔案的實際結構

  AI 查詢 CLI 的即時狀態：存在哪些工件、準備建立哪些工件、滿足哪些依賴關係以及每個操作解鎖哪些內容。

  ### 從鎖相到基於行動

  **之前：** 線性工作流程 — 提案 → 應用 → 歸檔。無法輕易返回或迭代。

  **現在：** 對變化採取靈活的行動。隨時編輯任何工件。工件圖自動追蹤狀態。

  | 命令              | 它的作用                                         |
  | -------------------- | ---------------------------------------------------- |
  | `/opsx:explore`      | 在做出改變之前仔細考慮想法    |
  | `/opsx:new`          | 開始新的改變                                   |
  | `/opsx:continue`     | 一次建立一個工件（逐步執行）         |
  | `/opsx:ff`           | 一次建立所有計劃工件（快轉） |
  | `/opsx:apply`        | 落實任務                                      |
  | `/opsx:verify`       | 驗證實作是否符合工件            |
  | `/opsx:sync`         | 將增量規格同步到主要規格                       |
  | `/opsx:archive`      | 存檔已完成的更改                             |
  | `/opsx:bulk-archive` | 透過衝突偵測歸檔多個更改     |
  | `/opsx:onboard`      | 完整工作流程的 15 分鐘指導演練    |

  ### 從文字合併到語意規範同步

  **之前：** 規格更新需要手動合併或批次檔案替換。

  **現在：** Delta 規格使用人工智慧可以理解的語義標記：

  - `## ADDED Requirements` — 新增要求
  - `## MODIFIED Requirements` — 部分更新（新增場景而不複製現有場景）
  - `## REMOVED Requirements` — 刪除並附上原因和遷移說明
  - `## RENAMED Requirements` — 重新命名保留內容

  存檔在需求層級解析這些，而不是脆弱的標頭匹配。

  ### 從分散的文件到代理技能

  **之前：** 專案根目錄下的 8 個以上設定檔 + 斜線指令分散在 21 個不同格式的工具特定位置。

  **現在：**單身 `.claude/skills/` 包含 YAML-fronted markdown 檔案的目錄。由 Claude 代碼、遊標、風帆自動偵測。跨編輯器相容。

  ### 新功能

  - **入職技能** — `/opsx:onboard` 透過程式碼庫感知任務建議和逐步敘述引導新使用者完成第一次完整變更（11 個階段，約 15 分鐘）

  - **支援 21 個 AI 工具** — Claude Code、Cursor、Windsurf、Continue、Gemini CLI、GitHub Copilot、Amazon Q、Cline、RooCode、Kilo Code、Auggie、CodeBuddy、Qorav、Qwen、SooCode、Kilo Code、Auggie、CodeBuddy、Qorav、Qwen、SEtrict、cV Codex

  - **互動設定** — `openspec init` 顯示動畫歡迎畫面和用於選擇工具的可搜尋多重選擇。預先選擇已設定的工具以方便重新整理。

  - **可自訂模式** - 定義自訂工件工作流程 `openspec/schemas/` 無需觸及包代碼。團隊可以透過版本控制共享工作流程。

  ### 錯誤修復

  - 修正了指令名稱包含冒號時Claude代碼YAML解析失敗的問題
  - 修正了任務檔案解析以處理核取方塊行上的尾隨空格
  - 修正了 JSON 指令輸出以將上下文/規則與範本分開 - AI 正在將約束區塊複製到工件檔案中

  ### 文件

  - 新的入門指南、CLI 參考、概念文檔
  - 刪除了未實施的誤導性「編輯飛行途中並繼續」聲明
  - 新增了從 OPSX 之前版本升級的遷移指南

## 0.23.0

### 小改動

- [#540](https://github.com/Fission-AI/OpenSpec/pull/540) [`c4cfdc7`](https://github.com/Fission-AI/OpenSpec/commit/c4cfdc7c499daef30d8a218f5f59b8d9e5adb754) 謝謝 [@塔比什B](https://github.com/TabishB)！ - ### 新功能

  - **批次歸檔技能** — 在一次操作中歸檔多個已完成的更改 `/opsx:bulk-archive`。包括批次驗證、規格衝突檢測和綜合確認

  ### 其他

  - **簡化設定** - 設定建立現在使用合理的預設值和有用的註釋，而不是互動式提示

## 0.22.0

### 小改動

- [#530](https://github.com/Fission-AI/OpenSpec/pull/530) [`33466b1`](https://github.com/Fission-AI/OpenSpec/commit/33466b1e2a6798bdd6d0e19149173585b0612e6f) 謝謝 [@塔比什B](https://github.com/TabishB)！ - 新增專案級設定、專案本地架構和架構管理命令

  **新功能**

  - **專案級設定** — 透過以下方式設定每個專案的 OpenSpec 行為 `openspec/config.yaml`，包括自訂規則注入、上下文文件和架構解析設置
  - **專案本機模式** - 在專案中定義自訂工件模式 `openspec/schemas/` 專案特定工作流程的目錄
  - **架構管理命令** — 新 `openspec schema` 命令（`list`, `show`, `export`, `validate`）用於檢查和管理工件模式（實驗）

  **錯誤修復**

  - 修復了設定載入以處理 null `rules` 項目設定中的字段

## 0.21.0

### 小改動

- [#516](https://github.com/Fission-AI/OpenSpec/pull/516) [`b5a8847`](https://github.com/Fission-AI/OpenSpec/commit/b5a884748be6156a7bb140b4941cfec4f20a9fc8) 謝謝 [@塔比什B](https://github.com/TabishB)！ - 新增回饋命令和 Nix flake 支援

  **新功能**

  - **回饋命令** — 直接從 CLI 提交回饋 `openspec feedback`，這會導致 GitHub 自動元資料包含和手動提交的優雅後備問題
  - **Nix flake 支援** — 使用 Nix 和新版本安裝和開發 openspec `flake.nix`，包括自動薄片維護和CI驗證

  **錯誤修復**

  - **探索模式護欄** - 探索模式現在明確阻止實施，將重點放在思考和發現上，同時仍允許工件建立

  **其他**

  - 改進了變化推斷 `opsx apply` — 自動從對話情境中偵測目標變化，或在模稜兩可時進行提示
  - 透過更清晰的增量規範位置指導簡化存檔同步評估

## 0.20.0

### 小改動

- [#502](https://github.com/Fission-AI/OpenSpec/pull/502) [`9db74aa`](https://github.com/Fission-AI/OpenSpec/commit/9db74aa5ac6547efadaed795217cfa17444f2004) 謝謝 [@塔比什B](https://github.com/TabishB)！ - 添加 `/opsx:verify` 命令並修復 vitest 進程風暴

  **新功能**

  - **`/opsx:verify` 命令** - 驗證變更實施是否符合其規範

  **錯誤修復**

  - 透過限制工作並行度修復了 vitest 進程風暴
  - 修復了代理工作流程以使用非交互模式進行驗證命令
  - 修正了 PowerShell 補全生成器以刪除尾隨逗號

## 0.19.0

### 小改動

- eb152eb：新增繼續 IDE 支援、shell 完成以及 `/opsx:explore` 命令

  **新功能**

  - **繼續 IDE 支援** – OpenSpec 現在產生斜線指令 [繼續](https://continue.dev/)，擴展編輯器整合選項以及 Cursor、Windsurf、Claude Code 等
  - **Bash、Fish 和 PowerShell 的 Shell 補全** – 執行 `openspec completion install` 在您首選的 shell 中設定製表符補全
  - **`/opsx:explore` 命令** – 一種新的思維夥伴模式，用於在做出改變之前探索想法和調查問題
  - **Codebuddy 斜線命令改進** – 更新了 frontmatter 格式以獲得更好的兼容性

  **錯誤修復**

  - Shell 補全現在可以正確提供父級標誌（例如 `--help`) 當命令有子命令時
  - 修正了測試中的 Windows 相容性問題

  **其他**

  - 添加了可選的匿名使用統計信息，以幫助瞭解 OpenSpec 的使用方式。預設情況下，這是**選擇退出** – 設定 `OPENSPEC_TELEMETRY=0` 或者 `DO_NOT_TRACK=1` 禁用。僅收集命令名稱和版本；沒有參數、檔案路徑或內容。在 CI 環境中自動停用。

## 0.18.0

### 小改動

- 8dfd824：新增 OPSX 實驗工作流程指令和增強的工件系統

  **新指令：**

  - `/opsx:ff` - 快轉工件建立，一次產生所有需要的工件
  - `/opsx:sync` - 將增量規格從變更同步到主要規格
  - `/opsx:archive` - 透過智慧型同步檢查存檔已完成的更改

  **工件工作流程增強：**

  - 具有內聯指導和 XML 輸出的架構感知應用指令
  - 實驗工件工作流程的代理模式選擇
  - Per-change schema metadata via `.openspec.yaml` 文件
  - 實驗工件工作流程的代理技能
  - 用於模板載入和更改上下文的指令載入器
  - 將模式重構為帶有模板的目錄

  **改進：**

  - 增強列表命令，具有上次修改時間戳和排序功能
  - 更改建立實用程式以獲得更好的工作流程支援

  **修復：**

  - 標準化路徑以實現跨平台全域相容性
  - 建立新規範文件時允許刪除的要求

## 0.17.2

### 補丁變更

- 455c65f：修復 `--no-interactive` 驗證指令中的標誌可正確停用微調器，防止在預提交掛鉤和 CI 環境中掛起

## 0.17.1

### 補丁變更

- a2757e7：透過使用 @inquirer/prompts 的動態導入來修復設定命令中的預提交掛鉤掛起問題

  由於在模組載入時註冊了 stdin 事件偵聽器，config 指令導致預提交掛鉤無限期掛起。此修復將靜態導入轉換為動態導入，僅在以下情況下載入查詢程式： `config reset` 命令實際上是互動使用的。

  還添加了 ESLint 規則，以防止靜態 @inquirer 導入，避免未來的回歸。

## 0.17.0

### 小改動

- 2e71835：添加 `openspec config` 命令和 Oh-my-zsh 補全

  **新功能**

  - 添加 `openspec config` 用於管理全域設定設定的命令
  - 透過 XDG 基本目錄規格支援實現全域設定目錄
  - 新增 Oh-my-zsh shell 完成支援以增強 CLI 體驗

  **錯誤修復**

  - 使用動態導入修復預提交掛鉤中的掛起
  - 尊重所有平台上的 XDG_CONFIG_HOME 環境變量
  - 解決 zsh-installer 測試中的 Windows 相容性問題
  - 使 cli 完成規範與實作保持一致
  - 從斜杠命令中刪除硬編碼的代理字段

  **文件**

  - 按字母順序排列 README 中的 AI 工具清單並使其可折疊

## 0.16.0

### 小改動

- c08fbc1：新增新的 AI 工具整合和增強功能：

  - **feat(iflow-cli)**：新增 iFlow-cli 與斜杠指令支援和文件的集成
  - **feat(init)**：在 init 之後新增 IDE 重新啟動指令，以通知使用者斜線指令可用性
    **feat(antigravity)**: Add Antigravity slash command support
  - **修復**：為 Qwen 程式碼產生 TOML 命令（修復 #293）
  - 澄清腳手架提案文件並增強提案指南
  - 更新提案指南以強調實施前的設計優先方法

## 未發布

### 小改動

- 添加繼續斜杠命令支援所以 `openspec init` 可以生成 `.continue/prompts/openspec-*.prompt` 帶有 MARKDOWN frontmatter 的文件和 `$ARGUMENTS` 佔位符，然後重新整理它們 `openspec update`.

- 添加反重力斜線命令支援 `openspec init` 可以生成 `.agent/workflows/openspec-*.md` 僅包含描述的 frontmatter 檔案和 `openspec update` 與 Windsurf 一起重新整理現有工作流程。

## 0.15.0

### 小改動

- 4758c5c：透過本機斜杠命令整合新增對新 AI 工具的支援

  - **Gemini CLI**：為 Gemini CLI 添加本機基於 TOML 的斜杠命令支援 `.gemini/commands/openspec/` 一體化
  - **RooCode**：新增 RooCode 與設定器、斜線命令和模板的集成
  - **Cline**：修正 Cline 以使用工作流程而不是斜線指令的規則（`.clinerules/workflows/` 路徑）
  - **文件**：更新文件以反映新的整合和工作流程更改

## 0.14.0

### 小改動

- 8386b91：新增對新 AI 助理的支援和設定改進

  - 壯舉：添加 Qwen Code 支援與斜杠命令集成
  - 壯舉：新增 $ARGUMENTS 支援以應用斜槓指令進行動態變數傳遞
  - 壯舉：向設定和文件添加 Qoder CLI 支援
  - 壯舉：添加 CoStrict AI 助理支援
  - 修正：在擴充模式下重新建立遺失的 openspec 範本文件
  - 修正：防止工具出現錯誤的「已設定」偵測
  - 修復：使用change-id作為後備標題而不是“Untitled Change”
  - 文件：新增填入項目層級上下文的指南
  - 文件：將 Crush 新增至 README 中支援的 AI 工具

## 0.13.0

### 小改動

- 668a125：增加對多個 AI 助理的支援並改進驗證

  此版本增加了對幾個新的人工智慧編碼助理的支援：

  - CodeBuddy Code - 人工智慧驅動的編碼助手
  - CodeRabbit - AI程式碼審查助手
  - 克萊恩 - Claude 驅動的 CLI 助手
  - Crush AI - 人工智慧助理平台
  - Auggie (Augment CLI) - 程式碼增強工具

  新功能：

  - 存檔斜線命令現在支援參數以實現更靈活的工作流程

  錯誤修復：

  - Delta 規範驗證現在可以處理不區分大小寫的標頭並正確檢測空部分
  - 存檔驗證現在可以正確遵循 --no-validate 標誌並忽略元資料

  文件改進：

  - 新增了 VS Code 開發容器設定以簡化開發設置
  - 使用明確更改 ID 表示法更新了 AGENTS.md
  - 增強了斜線命令文件以及重新啟動註釋

## 0.12.0

### 小改動

- 082abb4：添加對斜杠命令和非交互式初始化選項的工廠函數支援

  此版本包括兩個新功能：

  - **斜杠命令的工廠函數支援**：斜杠命令現在可以定義為返回命令物件的函數，從而啟用動態命令設定
  - **非互動式初始化選項**：新增 `--tools`, `--all-tools`， 和 `--skip-tools` CLI 標記為 `openspec init` 用於 CI/CD 管道中的自動初始化，同時保持與互動模式的向後相容性

## 0.11.0

### 小改動

- 312e1d6：新增 Amazon Q Developer CLI 整合。 OpenSpec 現在支援 Amazon Q Developer，並在以下位置自動產生提示 `.amazonq/prompts/` 目錄，讓您可以將 OpenSpec 斜線指令與 Amazon Q 的 @-語法結合使用。

## 0.10.0

### 小改動

- d7e0ce8：改進初始化精靈輸入按鍵行為，以允許更自然地完成提示

## 0.9.2

### 補丁變更

- 2ae0484：修復跨平台路徑處理問題。此版本包括對 joinPath 行為和斜線命令路徑解析的修復，以確保 OpenSpec 在所有平台上正常運作。

## 0.9.1

### 補丁變更

- 8210970：修正當選擇 Codex 整合時 OpenSpec 無法在 Windows 上運作。此版本包括對跨平台路徑處理和規範化的修復，以確保 OpenSpec 在 Windows 系統上正常運作。

## 0.9.0

### 小改動

- efbbf3b：添加對 Codex 和 GitHub Copilot 斜杠命令以及 YAML frontmatter 和 $ARGUMENTS 的支援

## 未發布

### 小改動

- 新增 GitHub Copilot 斜線命令支援。 OpenSpec 現在將提示寫入 `.github/prompts/openspec-{proposal,apply,archive}.prompt.md` 與 YAML frontmatter 和 `$ARGUMENTS` 佔位符，並重新整理它們 `openspec update`.

## 0.8.1

### 補丁變更

- d070d08：修復 CLI 版本不匹配，並添加發行保護，以驗證打包的 tarball 列印的版本與 package.json 的版本相同 `openspec --version`.

## 0.8.0

### 小改動

- c29b06d：增加風帆支援。
- 新增 Codex 斜線指令支援。 OpenSpec 現在將提示直接寫入 Codex 的全域目錄（`~/.codex/prompts` 或者 `$CODEX_HOME/prompts`）並重新整理它們 `openspec update`.

## 0.7.0

### 小改動

- 添加原生 Kilo Code 工作流程集成，以便 `openspec init` 和 `openspec update` 管理 `.kilocode/workflows/openspec-*.md` files.
- 始終建立託管根目錄 `AGENTS.md` 在初始化/更新期間交接存根並重新組合 AI 工具提示，以保持指令一致。

## 0.6.0

### 小改動

- 將產生的根代理指令精簡為託管移交存根，並更新初始化/更新流程以安全地重新整理它。

## 0.5.0

### 小改動

- 壯舉：使用跨平台CI矩陣實施第一階段E2E測試

  - 在 test/helpers/run-cli.ts 中新增共用 runCLI 幫助程式以進行產生測試
  - 建立 test/cli-e2e/basic.test.ts 涵蓋幫助、版本、驗證流程
  - 遷移現有 CLI exec 測試以使用 runCLI 幫助程式
  - 將 CI 矩陣擴展到 bash (Linux/macOS) 和 pwsh (Windows)
  - 拆分公關和主要工作流程以優化回饋

### 補丁變更

- 使應用說明更具體

  使用更具體和可操作的應用指令來改進代理模板和斜線命令模板。

- 文件：改進文件和清理

  - 歸檔命令的文檔非互動式標誌
  - 替換 README 中的Discord徽章
  - 歸檔已完成的變更以便更好地組織

## 0.4.0

### 小改動

- 增加 OpenSpec 更改建議，以實現 CLI 改進並增強用戶體驗
- 新增 Opencode 斜線指令支援 AI 驅動的開發工作流程

### 補丁變更

- 新增文件改進，包括存檔命令範本的 --yes 標誌和 Discord 徽章
- 修正 Markdown 解析器中的標準化行結尾以正確處理 CRLF 文件

## 0.3.0

### 小改動

- 提高 `openspec init` 具有擴展模式、多工具選擇和互動式 `AGENTS.md` configurator.

## 0.2.0

### 小改動

- ce5cead： - 新增一個 `openspec view` 儀表板可匯總規格數量並一目了然地更改進度
  - 產生並更新 AI 斜線命令以及重命名的命令 `openspec/AGENTS.md` 說明文件
  - 刪除已棄用的 `openspec diff` 命令並引導用戶 `openspec show`

## 0.1.0

### 小改動

- 24b4866：初始版本
