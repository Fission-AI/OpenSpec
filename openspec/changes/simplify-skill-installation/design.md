## 情境

OpenSpec 目前為每位使用者安裝了 10 個工作流程（技能 + 指令），令新使用者不知所措。初始化流程會提出多個問題（設定檔、交付、工具），從而在使用者體驗價值之前造成摩擦。

目前架構：
- `src/core/init.ts` - 處理工具選擇與技能/指令生成
- `src/core/config.ts` - 定義 `AI_TOOLS` 和 `skillsDir` 對應
- `src/core/shared/skill-generation.ts` - 從範本產生技能文件
- `src/core/templates/workflows/*.ts` - 單獨的工作流程模板
- `src/prompts/searchable-multi-select.ts` - 工具選擇使用者介面

全域設定存在於 `~/.config/openspec/config.json` 用於遙測/功能標誌。設定檔/交付設定將擴展此現有設定。

## 目標/非目標

**目標：**
- 讓新用戶在 1 分鐘內獲得“頓悟時刻”
- 智慧預設初始化，具有自動檢測和確認功能（核心設定檔，均交付）
- 從現有目錄中自動偵測已安裝的工具
- 引入設定檔系統（核心/自訂）以進行工作流程選擇
- 引入交付設定（技能/命令/兩者）作為高級用戶設置
- 創造新的 `propose` 工作流程組合 `new` + `ff`
- 修復工具選擇UX（空白選擇，回車確認）
- 保持現有用戶的向後相容性

**非目標：**
- 刪除任何現有工作流程（所有工作流程仍可透過自訂設定檔使用）
- 每個項目的設定檔/交付設定（僅限使用者等級）
- 更改工件結構或模式系統
- 修改技能/指令的格式或編寫方式

## 決定

### 1. 擴展現有的全域設定

將設定檔/交付設定新增至現有的 `~/.config/openspec/config.json` （透過 `src/core/global-config.ts`).

**基本原理：** 全域設定已經存在，具有 XDG/APPDATA 跨平台路徑處理、架構演變和與預設值合併的行為。重複使用它可以避免第二個設定並利用現有的基礎設施。

**架構擴充：**
```json
{
  "telemetry": { ... },     // existing
  "featureFlags": { ... },  // existing
  "profile": "core",        // NEW
  "delivery": "both",       // NEW
  "workflows": [...]        // NEW (only for custom profile)
}
```

**考慮的替代方案：**
- 新的 `~/.openspec/config.yaml`：建立第二個設定檔，格式不同，路徑混亂
- 專案設定：需要同步機制，使用者直接編輯
- 環境變數：不容易發現，更難持久

### 2. 兩層剖面系統

```
core (default):     propose, explore, apply, archive (4)
custom:             user-defined subset of workflows
```

**理由：** 核心涵蓋了基本循環（提出→探索→應用→存檔）。自訂允許使用者透過互動式選擇器準確地選擇他們需要的內容。

**設定使用者體驗：**
```
$ openspec config profile

Delivery: [skills] [commands] [both]
                              ^^^^^^

Workflows: (space to toggle, enter to save)
[x] propose
[x] explore
[x] apply
[x] archive
[ ] new
[ ] ff
...
```

**考慮的替代方案：**
- 三層（核心/擴展/自訂）：擴展是多餘的 - 想要所有工作流程的使用者可以在自訂中選擇它們
- 單獨的設定檔和交付命令：合併到一個選擇器中可減少認知負擔

### 3. 提出工作流程 = 新 + FF 組合

單一工作流程可一步建立變更並產生所有工件。

**理由：** 大多數使用者希望從想法到實施準備。分離 `new` （建立資料夾）和 `ff` （生成工件）添加不必要的步驟。想要控制的進階使用者可以使用 `new` + `continue` 透過自訂設定檔。

**實施：** 新模板 `src/core/templates/workflows/propose.ts` 那：
1. 透過建立更改目錄 `openspec new change`
2. 執行工件生成循環（就像 ff 那樣）
3. 在輸出中包含入門風格的解釋

### 4. 自動偵測並確認

掃描現有工具目錄，預先選擇偵測到的工具，要求確認。

**理由：** 減少問題，同時仍賦予使用者控制權。比全自動（無需確認）更好，因為全自動（無需確認）可能會安裝不需要的工具，或者沒有檢測（總是詢問），這會增加摩擦。

**檢測邏輯：**
```typescript
// Use existing AI_TOOLS config to get directory mappings
// Each tool in AI_TOOLS has a skillsDir property (e.g., '.claude', '.cursor', '.windsurf')
// Scan cwd for existing directories matching skillsDir values, pre-select matches
const detectedTools = AI_TOOLS.filter(tool =>
  fs.existsSync(path.join(cwd, tool.skillsDir))
);
```

### 5. 作為設定檔設定的一部分進行交付

交付首選項（技能/命令/兩者）儲存在全域設定中，預設為“兩者”。

**理由：** 大多數使用者不知道或不關心這種區別。有偏好的高級用戶可以透過以下方式進行設置 `openspec config profile` 互動式選擇器。不值得在初始化期間詢問。

### 6. 文件系統作為已安裝工作流程的真相

安裝了什麼 `.claude/skills/` （等）是事實來源，而不是設定。

**理由：**
- 向後相容現有安裝
- 使用者可以手動新增/刪除技能目錄
- 設定檔是安裝內容的“模板”，而不是約束

**行為：**
- `openspec init` 設定新專案或重新初始化現有專案（選擇工具、產生工作流程）
- `openspec update` 重新整理現有項目以符合目前設定（無工具選擇）
- `openspec config profile` 僅更新全域設定，如果在專案中則提供執行更新
- 保留額外的工作流程（不在設定檔中）
- 應用程式交付變更：切換到 `skills` 刪除命令，切換到 `commands` 刪除技能

**為什麼不單獨的工具清單？ **

工具選擇（輔助項目使用）是按使用者和按項目進行的，但這兩個設定位置是僅按使用者（全域設定）或按項目共享（簽入項目設定）。探索並拒絕了一個單獨的清單：

- *路徑鍵控全域設定* (`projects: { "/path": { tools: [...] } }`)：目錄移動/重新命名/刪除時脆弱，符號連結模糊，項目行為取決於不可見的外部狀態。
- *Gitignored本地文件*（`.openspec.local`)：在新克隆上遺失，增加檔案管理開銷。
- *簽入專案設定* (`openspec/config.yaml` 和 `tools` 欄位）：強制整個團隊選擇工具 - Alice 使用 Claude 代碼，Bob 使用遊標，雙方都不希望強制使用對方的工具。

文件系統方法避免了所有三個問題。對於團隊來說，這實際上是有益的：簽入技能文件意味著 `openspec update` 任何團隊成員都可以重新整理專案支援的所有工具的技能。產生的文件既可作為可交付成果，又可作為隱式工具清單。

已知差距：在專案樹外部儲存設定的工具（沒有要掃描的本機目錄）需要特定於工具的處理，因為專案中沒有任何內容要掃描。解決是否/何時支援此類工具的問題。

**何時使用 init 與 update：**
- `init`：首次設置，或當您想要更改設定的工具時
- `update`：更改設定後，或將範本重新整理到最新版本

### 8. 現有用戶遷移

什麼時候 `openspec init` 或者 `openspec update` 遇到有現有工作流程但沒有的項目 `profile` 全域設定中的字段，它執行一次性遷移以保留用戶當前的設定。

**理由：** 如果沒有遷移，現有使用者將預設為 `core` 輪廓，導致 `propose` 添加到他們的 10 個工作流程之上——讓事情變得更糟，而不是更好。遷移可確保現有用戶準確保留他們所擁有的內容。

**觸發者：** 兩者 `init` （重新初始化現有項目）和 `update`。遷移檢查是在設定檔解析之前在兩個命令中早期呼叫的共享函數。

**檢測邏輯：**
```typescript
// Shared migration check, called by both init and update:
function migrateIfNeeded(projectPath: string, tools: AiTool[]): void {
  const globalConfig = readGlobalConfig();
  if (globalConfig.profile) return; // already migrated or explicitly set

  const installedWorkflows = scanInstalledWorkflows(projectPath, tools);
  if (installedWorkflows.length === 0) return; // new user, use core defaults

  // Existing user — migrate to custom profile
  writeGlobalConfig({
    ...globalConfig,
    profile: 'custom',
    delivery: 'both',
    workflows: installedWorkflows,
  });
}
```

**掃描邏輯：**
- 掃描所有工具目錄（`.claude/skills/`, `.cursor/skills/`等）用於工作流程目錄/文件
- 僅匹配 `ALL_WORKFLOWS` 常數 - 忽略使用者建立的自訂技能/命令
- 將目錄名稱對應回工作流程 ID（例如， `openspec-explore/` → `explore`, `opsx-explore.md` → `explore`)
- 將所有工具中偵測到的工作流程名稱合併起來

**邊緣情況：**
- **使用者手動刪除了一些工作流程：** 遷移會掃描實際安裝的內容，尊重他們的選擇
- **具有不同工作流程集的多個項目：**觸發遷移集全域設定的第一個項目；後續項目都會用到它
- **使用者在目錄中具有自訂（非 OpenSpec）技能：** 已忽略 - 掃描程式僅符合來自以下位置的已知工作流程 ID： `ALL_WORKFLOWS`
- **遷移是冪等的：**如果 `profile` 已在設定中設置，不會發生重新遷移
- **非互動式 (CI)：** 相同的遷移邏輯，無需確認 - 它保留現有狀態

**考慮的替代方案：**
- 遷移期間 `init` 而不是 `update`：init已經有自己的流程（工具選擇等）。將遷移與 init 混合會導致使用者體驗混亂
- 不要遷移，只是預設為核心：透過添加來破壞現有用戶 `propose` 並顯示「額外工作流程」警告
- 在全域設定讀取時遷移：過於隱式，難以向使用者顯示回饋

### 9. 範本中的通用下一步指南

工作流程範本使用通用的、基於概念的下一步指導，而不是引用特定的工作流程指令。例如，代替“執行 `/opsx:propose`”，範本顯示“建立變更提案”。

**基本原理：** 條件交叉引用（每個範本檢查安裝了哪些其他工作流程並呈現不同的命令名稱）顯著增加了範本產生、測試和維護的複雜性。通用指南完全避免了這種情況，同時仍然有用——用戶已經知道他們安裝的工作流程。

**注意：** 如果我們發現使用者始終難以將概念對應到命令，我們可以透過條件交叉引用重新審視這一點。目前，簡單性獲勝。

### 7.修復多選鍵綁定

從製表符確認更改為行業標準空格/輸入。

**理由：** 用於確認的選項卡是非標準的，會讓使用者感到困惑。大多數 CLI 工具使用空格進行切換，輸入進行確認。

**實施：**修改 `src/prompts/searchable-multi-select.ts` 鍵綁定設定。

### 10.更新同步必須考慮設定漂移，而不僅僅是版本漂移

`openspec update` 不能僅僅依靠 `generatedBy` 版本檢查以確定是否需要工作。

**基本原理：** 即使現有技能範本是最新的，設定檔和交付變更也可能需要檔案新增/刪除操作。如果我們只檢查模板版本，更新可能會錯誤地返回“最新”並跳過所需的同步。

**執行：**
- 保留版本檢查以做出模板重新整理決策
- 新增設定檔/交付的檔案狀態漂移檢查（缺少預期檔案或已刪除交付模式中的陳舊檔案）
- 將版本漂移或設定漂移視為需要更新

### 11. 工具設定檢測包括僅命令安裝

用於更新的設定工具檢測必須包括命令文件，而不僅僅是技能文件。

**理由：** 與 `delivery: commands`，無需技能文件即可完全設定項目。僅技能偵測錯誤地報告“未找到已設定的工具”。

**執行：**
- 對於更新流程，如果工具具有產生的技能或產生的命令，則將其視為已設定的工具
- 保持遷移工作流程掃描行為不變（技能仍是遷移的真實來源）

### 12. 初始化設定檔覆蓋經過嚴格驗證

`openspec init --profile` 在繼續之前必須驗證允許的值。

**基本原理：** 默默地接受未知的設定檔值會隱藏使用者錯誤並產生隱式後備行為。

**實施：**僅接受 `core` 和 `custom`;對於無效值拋出明顯的 CLI 錯誤。

## 風險/權衡

**風險：破壞現有的使用者工作流程**
→ 緩解措施：檔案系統是事實，現有安裝不受影響。所有工作流程均可透過自訂設定檔使用。

**風險：建議工作流程重複邏輯**
→ 緩解措施：將共用工件產生提取為可重複使用函數，兩者 `propose` 和 `ff` 調用它。

**風險：全域設定檔管理**
→ 緩解措施：首次使用時建立目錄/檔案。優雅地處理丟失的文件（使用預設值）。

**風險：自動偵測誤報**
→ 緩解措施：顯示偵測到的工具並要求確認，不要靜默自動安裝。

**權衡：核心設定檔只有 4 個工作流程**
→ 可接受：這些覆蓋了主循環。需要更多的使用者可以使用 `openspec config profile` 選擇其他工作流程。

## 遷移計劃

1. **第一階段：新增基礎設施**
   - 使用設定檔/交付/工作流程欄位擴充 global-config.ts
   - 設定檔定義和分辨率
   - 刀具自動偵測

2. **階段 2：建立建議工作流程**
   - 結合 new + ff 的新模板
   - 具有解釋性輸出的增強型使用者體驗

3. **階段 3：更新初始化流程**
   - 帶工具確認的智慧預設設定
   - 自動偵測並確認工具
   - 尊重設定檔/交付設置

4. **階段 4：新增設定檔命令**
   - `openspec config profile` 互動式選擇器
   - `openspec config profile core` 預設快捷鍵

5. **階段5：更新更新命令**
   - 讀取設定檔/交付的全域設定
   - 從設定檔中新增缺少的工作流程
   - 當交付變更時刪除檔案（例如，如果以下情況則刪除命令） `skills`)
   - 顯示變更摘要

6. **第 6 階段：修復多選 UX**
   - 更新可搜尋多選取的鍵綁定

**回滾：** 所有變更都是附加的。透過自訂設定檔保留現有行為並選擇所有工作流程。
