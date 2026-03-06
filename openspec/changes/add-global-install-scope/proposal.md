## 為什麼

OpenSpec安裝路徑目前不一致：

- 大多數技能和命令都寫入專案本地目錄。
- Codex 指令已經是全域的（`$CODEX_HOME/prompts` 或者 `~/.codex/prompts`).
- 使用者無法跨工具選擇一致的安裝範圍策略。

這會給喜歡用戶級設定並希望預設情況下全域管理工具工件的用戶帶來摩擦。

## 有什麼變化

### 1. 新增具有舊版安全預設值的安裝範圍首選項

引入具有兩種模式的全域安裝範圍設定：

- `global` （新建立的設定的預設值）
- `project`

此設定儲存在全域設定中，並且可以在每次命令執行時覆蓋。
對於架構演變的遺留設定，其中 `installScope` 不存在，有效預設值仍然存在 `project` 直到用戶選擇加入全球範圍。

### 2.為技能和指令新增範圍感知路徑解析

重構路徑解析，以便兩者 `init` 和 `update` 計算安裝目標：

- 所選範圍首選項（`global` 或者 `project`)
- 工具功能元資料（涵蓋每個工具/表面支援的範圍）
- 執行時上下文（專案根目錄、主目錄、環境覆蓋）

### 3. 新增每個工具功能元資料以支援範圍

擴展工具元資料以明確聲明每個表面的範圍支援：

- 技能範圍支援
- 命令範圍支援

當工具/表面不支援首選範圍時，系統將使用確定性回退規則並在輸出中報告有效範圍。

### 4. 使命令生成具有上下文感知

擴充命令適配器路徑解析，以便適配器接收安裝上下文（範圍 + 環境上下文），而不僅僅是命令 ID。這消除了特殊情況處理並允許跨工具保持一致的範圍行為。

### 5. 更新 init/update UX 和行為

- `openspec init`:
  - accepts scope override flag
  - 使用設定的範圍或遷移感知的預設值（新設定預設全域；舊設定保留項目直到遷移）
  - 應用範圍感知產生與清理規劃
- `openspec update`:
  - 應用目前範圍首選項
  - 在每個工具/表面的有效範圍內同步工件
  - 追蹤每個工具/表面最後一次成功的有效範圍，以進行確定性範圍漂移檢測
  - 清楚地報告有效的範圍決策

### 6. 擴充設定 UX 和文檔

- 新增安裝範圍控制 `openspec config profile` 交互流程。
- 延長 `openspec config list` output with install scope source (`explicit`, `new-default`, `legacy-default`).
- 新增明確的遷移指導和提示路徑，以便舊用戶可以選擇加入 `global` scope.
- 更新支援的工具和 CLI 文件以解釋範圍行為和後備規則。

### 7. 與指揮面能力交付規則協調

`cli-init` 和 `cli-update` 規劃應包括：

- 安裝範圍（`global | project`)
- 交貨方式（`both | skills | commands`)
- 指揮面能力（`adapter | skills-invocable | none`)

該提案仍然側重於範圍解析，但實施和測試覆蓋範圍應包括混合工具案例，以避免與 `add-tool-command-surface-capabilities`.

## 能力

### 新功能

- `installation-scope`：工具工件安裝的範圍偏好模型和有效範圍解析。

### 修改後的功能

- `global-config`：使用架構演化預設值保留安裝範圍首選項。
- `cli-config`：設定和檢查安裝範圍首選項。
- `ai-tool-paths`：新增工具級範圍支援元資料和路徑策略。
- `command-generation`: Scope-aware adapter path resolution via install context.
- `cli-init`：範圍感知初始化規劃和輸出。
- `cli-update`：範圍感知更新同步、漂移偵測和輸出。
- `migration`：具有安裝範圍感知工作流程尋找的範圍感知遷移掃描。

## 影響

- `src/core/global-config.ts` - 新的安裝範圍欄位和預設值
- `src/core/config-schema.ts` - 安裝範圍設定鍵的驗證支援
- `src/commands/config.ts` - 安裝範圍的互動式設定檔/設定 UX 添加
- `src/core/config.ts` - 工具範圍能力元資料
- `src/core/available-tools.ts` 和 `src/core/shared/tool-detection.ts` - 範圍感知設定偵測
- `src/core/command-generation/types.ts` 和適配器實作 - 上下文感知檔案路徑解析
- `src/core/init.ts` - 範圍感知的生成/刪除規劃
- `src/core/update.ts` - scope-aware sync/removal/drift planning
- `src/core/migration.ts` - 範圍感知工作流程掃描支援
- `docs/supported-tools.md` 和 `docs/cli.md` - 安裝範圍行為文檔
- `test/core/init.test.ts`, `test/core/update.test.ts`、適配器測試、設定測試 - 範圍覆蓋
