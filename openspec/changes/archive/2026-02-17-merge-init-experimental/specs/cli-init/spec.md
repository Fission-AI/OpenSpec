## 修改後的要求

### 需求：建立目錄

該命令應使用設定檔建​​立 OpenSpec 目錄結構。

#### 場景：建立 OpenSpec 結構

- **什麼時候** `openspec init` 被執行
- **然後** 建立以下目錄結構：
```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

### 需求：AI工具設定

該命令應使用可搜尋的多選體驗來設定人工智慧編碼助理的技能和斜線命令。

#### 場景：提示選擇AI工具

- **何時** 交互執行
- **然後** 顯示帶有 OpenSpec 徽標的動畫歡迎畫面
- **並且** 呈現一個可搜尋的多重選擇，顯示所有可用的工具
- **並且** 使用「（已設定 ✓）」指示器標記已設定的工具
- **和** 預先選擇設定的工具以方便重新整理
- **和** 對已設定的工具進行排序，使其出現在清單中的第一個位置
- **並且**允許透過鍵入搜尋進行過濾

#### 場景：選擇要設定的工具

- **何時** 使用者選擇工具並確認
- **然後** 培養技能 `.<tool>/skills/` 每個選定工具的目錄
- **AND** 產生斜線命令 `.<tool>/commands/opsx/` 每個選定工具的目錄
- **並**建立 `openspec/config.yaml` 使用預設模式設定

### 需求：技能生成

該指令將為選定的 AI 工具產生代理技能。

#### 場景：為工俱生成技能

- **何時** 在初始化期間選擇工具
- **然後**在下面建立9個技能目錄 `.<tool>/skills/`:
  - `openspec-explore/SKILL.md`
  - `openspec-new-change/SKILL.md`
  - `openspec-continue-change/SKILL.md`
  - `openspec-apply-change/SKILL.md`
  - `openspec-ff-change/SKILL.md`
  - `openspec-verify-change/SKILL.md`
  - `openspec-sync-specs/SKILL.md`
  - `openspec-archive-change/SKILL.md`
  - `openspec-bulk-archive-change/SKILL.md`
- **並且** 每個 SKILL.md 應包含 YAML frontmatter 以及名稱和描述
- **並且** 每個 SKILL.md 應包含技能說明

### 要求：斜線命令生成

此指令應為選定的 AI 工具產生 opsx 斜線指令。

#### 場景：為工具產生斜線指令

- **何時** 在初始化期間選擇工具
- **然後** 使用該工具的命令適配器建立 9 個斜杠命令檔案：
  - `/opsx:explore`
  - `/opsx:new`
  - `/opsx:continue`
  - `/opsx:apply`
  - `/opsx:ff`
  - `/opsx:verify`
  - `/opsx:sync`
  - `/opsx:archive`
  - `/opsx:bulk-archive`
- **並且** 使用特定於工具的路徑約定（例如， `.claude/commands/opsx/` 對於Claude）
- **並且** 包括特定於工具的 frontmatter 格式

### 要求：成功輸出

該命令應在成功初始化後提供清晰、可操作的後續步驟。

#### 場景：顯示成功訊息

- **何時** 初始化成功完成
- **然後** 顯示分類摘要：
  - 「建立： <tools>“ 對於新設定的工具
  - "重新整理: <tools>“ 對於已更新的已設定工具
  - 產生的技能和命令的計數
- **AND** 顯示入門部分：
  - `/opsx:new` - 開始新的改變
  - `/opsx:continue` - 建立下一個工件
  - `/opsx:apply` - 實施任務
- **和** 顯示文件和回饋的鏈接

#### 場景：顯示重啟指令

- **何時** 初始化成功完成並且建立或重新整理工具
- **THEN** 顯示重新啟動IDE以使斜線指令生效的指令

### 需求：設定檔生成

該命令應建立一個具有架構設定的 OpenSpec 設定檔。

#### 場景：建立 config.yaml

- **何時**初始化完成
- **且** config.yaml 不存在
- **然後**建立 `openspec/config.yaml` 使用預設模式設定
- **和** 在輸出中顯示設定位置

#### 場景：保留現有的 config.yaml

- **何時** 初始化在擴展模式下執行
- **和** `openspec/config.yaml` 已經存在
- **然後** 保留現有的設定檔
- **AND** 在輸出中顯示「（存在）」指示符

### 要求：非互動模式

該命令應支援透過命令列選項的非互動式操作。

#### 場景：以非互動方式選擇所有工具

- **何時** 執行 `--tools all`
- **然後** 自動選擇每個可用的 AI 工具，無需提示
- **並** 繼續產生技能和命令

#### 場景：非互動地選擇特定工具

- **何時** 執行 `--tools claude,cursor`
- **THEN** 解析以逗號分隔的工具 ID
- **並且** 僅為指定工具產生技能和命令

#### 場景：以非互動方式跳過工具設定

- **何時** 執行 `--tools none`
- **然後** 只建立 openspec 目錄結構和 config.yaml
- **並** 跳過技能和命令生成

### 要求：實驗指令別名

該命令應保持與實驗命令的向後相容性。

#### 場景：執行 openspec 實驗

- **何時** 使用者執行 `openspec experimental`
- **然後** 委託給 `openspec init`
- **並且** 該命令應在幫助輸出中隱藏

## 刪除的要求

### 需求：文件生成

**原因**：不再產生AGENTS.md和project.md。技能包含所有必要的說明。

**移民**：技能 `.<tool>/skills/` 提供所有 OpenSpec 工作流程說明。無需手動文件。

### 要求：AI工具設定詳細信息

**原因**：設定檔（CLAUDE.md、.cursorrules等）被技能取代。

**遷移**：使用技能 `.<tool>/skills/` 而不是設定檔。技能提供更豐富的、特定於工具的指令。

### 要求：斜線命令設定

**原因**：舊 `/openspec:*` 斜杠指令替換為 `/opsx:*` 具有更豐富功能的命令。

**遷移**：使用 `/opsx:new`, `/opsx:continue`, `/opsx:apply` 而不是 `/openspec:proposal`, `/openspec:apply`, `/openspec:archive`.

### 要求：根指令存根

**原因**：不再需要根 AGENTS.md 存根。技能提供特定於工具的說明。

**遷移**：技能由支援工具自動載入。不需要根存根。
