## 情境

OpenSpec today assumes project-local installation for most generated artifacts, with Codex command prompts as the main global exception.這種混合模型有效，但它是隱式的且用戶不可設定。

請求的變更是為了支援使用者可選擇的安裝範圍（`global` 或者 `project`) 對於工具技能/命令，預設為 `global` 用於新設定，同時保留舊專案本地行為，直到明確遷移。

## 目標/非目標

**目標：**

- 提供單一範圍首選項，使用者可以全域設定並在每次執行時覆蓋
- 預設新用戶為 `global` 範圍
- 使安裝路徑解析在工具/表面上具有確定性和明確性
- 為具有尚未定義的舊設定檔的使用者保留目前行為 `installScope`
- 避免靜默部分安裝；在輸出中體現有效的範圍決策

**非目標：**

- 實現對全域設定的專案本地設定檔支援
- 為上游位置約定未知的工具定義全域安裝路徑
- 更改工作流程/設定檔語義（`core`, `custom`, `delivery`）在這個變化中

## 決定

### 1. 全域設定中的作用域模型

Add install scope preference to global config:

```ts
type InstallScope = 'global' | 'project';

interface GlobalConfig {
  // existing fields...
  installScope?: InstallScope;
}
```

預設值:

- 新設定應該寫 `installScope: global` explicitly.
- 沒有此欄位的現有設定將繼續透過模式演化安全性加載，並且應將有效的預設值解析為 `project` 直到用戶明確設定 `installScope`.

### 2. 顯式工具範圍支援元資料

延長 `AI_TOOLS` metadata with optional scope support declarations per surface:

```ts
interface ToolInstallScopeSupport {
  skills?: InstallScope[];
  commands?: InstallScope[];
}
```

解析規則：

1. If scope support metadata is absent for a tool surface, treat it as project-only support for conservative backward compatibility.
2. 嘗試首選範圍。
3. 如果不支援，請在支援時使用備用範圍。
4. 如果兩者都不支援，則失敗並出現可操作錯誤。

這將啟用預設全域行為，同時對於僅支援專案本地路徑的工具保持安全。

### 3. 範圍感知安裝目標解析器

引入共享解析器實用程式來計算以下有效目標路徑：

- 技能根目錄
- 命令輸出檔案

解析器輸入：

- 工具編號
- 要求的範圍
- 專案根目錄
- 環境背景（`CODEX_HOME`， ETC。 ）

解析器輸出：

- 每個表面的有效範圍
- 具體目標路徑
- 面向用戶的輸出的可選後備原因

平台行為：

- 解析器輸出是作業系統感知的，並且針對當前平台進行了標準化。
- Windows 全域目標必須使用 Windows 路徑約定（例如 `%USERPROFILE%\.codex\prompts` Codex 時的回退 `CODEX_HOME` 未設定），而不是 POSIX 預設值。

### 4. 上下文感知命令適配器路徑

更新命令產生合同，以便適配器接收安裝上下文以進行路徑解析。這避免了硬編碼的絕對/相對假設並集中了範圍決策。

範例方向：

```ts
getFilePath(commandId: string, context: InstallContext): string
```

### 5.CLI行為與使用者體驗

`init`:

- 預設使用設定的安裝範圍；如果舊設定中不存在，則使用遷移安全性的有效預設值（`project`).
- 支援顯式覆蓋標誌（`--scope global|project`).
- 在互動模式下，在寫入檔案之前顯示所選範圍和任何每個工具的後備決策。

`update`:

- 應用目前範圍首選項（或覆蓋）；如果舊設定中不存在，則使用遷移安全性的有效預設值（或覆蓋）；如果舊設定中不存在，則使用遷移安全性的有效預設值（`project`).
- 使用有效範圍路徑和最後應用的範圍狀態執行漂移偵測。
- 在摘要輸出中報告有效的範圍決策。

`config`:

- `openspec config profile` 交互流程包括安裝範圍選擇。
- `openspec config list` 節目 `installScope` 帶源註釋（`explicit`, `new-default`， 或者 `legacy-default`).

### 6. 範圍變更期間的清理安全

當範圍改變時：

- 寫入發生在新的有效目標中。
- 清理/刪除僅限於相關工具/工作流程 ID 的 OpenSpec 託管檔案。
- 輸出明確指出哪些範圍位置已更新以及哪些位置已清理。

### 7.示波器漂移狀態追蹤

追蹤專案管理狀態下每個工具/表面的最後成功有效範圍。

規則：

1. 當目前解析的範圍與設定的工具/表面的上次成功範圍不同時，就會偵測到漂移。
2. 在任何寫入開始之前，必須驗證所有設定的工具/表面的範圍支援。
3. 更新首先寫入新解析的目標，驗證完整性，然後刪除先前目標中的託管檔案。
4. 如果新目標寫入是部分的或驗證失敗，命令應中止舊目標清理並報告具有不完整/新和保留/舊路徑的可操作故障。
5. 清理失敗不會回滾新的寫入；命令返回可操作的故障以及需要解決的剩餘路徑。

### 8. 與指揮面能力變化的協調

如果 `add-tool-command-surface-capabilities` 土地，規劃邏輯必須一起評估範圍解析度和交付/能力行為（範圍×交付×指揮面）。

## 風險/權衡

**風險：跨專案共享全域狀態**
全域安裝在專案之間共用。更新一個專案的全域工件會影響使用該工具範圍的所有項目。
→ 緩解措施：在輸出中明確範圍；保持設定檔/交付的全域性和確定性。

**風險：特定於工具的未知全球約定**
並非所有工具都記錄了穩定的全域安裝位置。
→ 緩解措施：使用顯式範圍支援元資料；回退或失敗而不是猜測。

**風險：適配器 API 流失**
更改適配器路徑契約涉及許多文件/測試。
→ 緩解措施：透過適配器合約測試和現有的端到端產生測試一次性遷移。

## 推出計劃

1. 新增安裝範圍的設定架構+預設值。
2. 新增工具範圍功能元資料和解析器實用程式。
3. 升級命令適配器合約和發電機路徑管道。
4. 將範圍感知行為整合到 init/update 中。
5. 新增文件和測試覆蓋率。
