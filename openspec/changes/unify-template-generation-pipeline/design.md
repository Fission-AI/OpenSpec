## 情境

OpenSpec 目前擁有強大的建置區塊（工作流程範本、命令適配器、產生助理），但編排問題是分散的：

- 工作流程定義和投影清單單獨維護
- 工具支援在多個地方表示，部分重疊
- 轉換可以在模板渲染時和各個適配器內部發生
- `init`/`update`/legacy-upgrade 每個都執行類似的寫入管道，但略有差異

設計目標是保留當前行為，同時使擴展點明確且確定。

## 目標/非目標

**目標：**
- 為工作流程內容和元資料定義一個規範來源
- 使特定於工具/代理的行為明確且可集中發現
- 將命令適配器保留為工具語法差異的格式邊界
- 將工件產生/寫入編排整合到一個可重複使用引擎中
- 透過可執行的驗證和奇偶校驗測試提高正確性

**非目標：**
- 重新設計命令語意或工作流程指令內容
- 更改此提案中面向用戶的 CLI 命令名稱/標誌
- 將不相關的遺留清理行為合併到工件產生重複使用之外

## 決定

### 1. 規範 `WorkflowManifest`

**決策**：在包含規範技能和命令定義以及元資料預設值的清單項目中表示每個工作流程一次。

建議形狀：

```ts
interface WorkflowManifestEntry {
  workflowId: string; // e.g. 'explore', 'ff', 'onboard'
  skillDirName: string; // e.g. 'openspec-explore'
  skill: SkillTemplate;
  command?: CommandTemplate;
  commandId?: string;
  tags: string[];
  compatibility: string;
}
```

**理由**：
- 消除多個手動維護陣列之間的漂移
- 使工作流程完整性可在一處進行測試
- 保持分離的工作流程模組，同時集中註冊

### 2. `ToolProfileRegistry` 用於能力接線

**決策**：新增一個工具設定檔層，將工具 ID 對應到生成功能和行為。

建議形狀：

```ts
interface ToolProfile {
  toolId: string;
  skillsDir?: string;
  commandAdapterId?: string;
  transforms: string[];
}
```

**理由**：
- 防止能力漂移 `AI_TOOLS`、適配器註冊表和檢測邏輯
- 允許有意的「僅限技能」工具，無需隱式特殊外殼
- 提供一個地方來回答“這個工具支援什麼？”

### 3.一流的轉換管道

**決策**：模型轉換為具有範圍+階段+適用性的有序插件。

建議形狀：

```ts
interface ArtifactTransform {
  id: string;
  scope: 'skill' | 'command' | 'both';
  phase: 'preAdapter' | 'postAdapter';
  priority: number;
  applies(ctx: GenerationContext): boolean;
  transform(content: string, ctx: GenerationContext): string;
}
```

執行順序：
1. 從清單中渲染規格內容
2. 應用程式匹配 `preAdapter` 轉變
3. 對於命令，請執行適配器格式化
4. 應用程式匹配 `postAdapter` 轉變
5. 驗證並寫入

**理由**：
- 讓適配器專注於工具格式化，而不是分散的行為重寫
- 使特定於代理的修改變得明確且可測試
- 取代臨時轉換調用 `init`/`update`

### 4. 共享 `ArtifactSyncEngine`

**決定**：引入所有代入口點使用的單一編排引擎。

職責：
- 建構發電計劃 `(workflows × selected tools × artifact kinds)`
- 執行渲染/轉換/適配器管道
- 驗證輸出
- 寫入文件並傳回結果匯總

**理由**：
- 刪除初始化/更新路徑中的重複循環和不同行為
- 無需重新實現邏輯即可啟用試執行和未來預覽功能
- 提高更新和舊遷移的可靠性

### 5. 驗證+奇偶校驗護欄

**決定**：在測試中新增嚴格檢查（以及開發版本中的可選執行時斷言）：

- 必需的技能元資料欄位（`license`, `compatibility`, `metadata`) 存在於所有清單項目中
- 投影一致性（技能、指令、源自清單的偵測名稱）
- 工具設定檔一致性（適配器存在、預期功能）
- 關鍵工作流程/工具的黃金/奇偶輸出

**理由**：
- 將先前的審查問題轉化為強制不變量
- 保持輸出保真度，同時啟用內部重構
- 在 CI 期間使回歸變得明顯

## 風險/權衡

**風險：遷移複雜性**
廣泛的重構可能會破壞生成路徑的穩定性。
→ 緩解措施：在切換前分階段引入奇偶校驗測試。

**風險：過度抽象**
太多的層可能會掩蓋簡單的流程。
→ 緩解措施：保持介面最少並將登錄機碼與產生程式碼放在一起。

**權衡：更多的前期結構**
新增清單/設定檔/轉換註冊表會增加概念表面積。
→ 接受：該成本可以透過減少漂移和更容易擴展來抵消。

## 實施方式

1. 在當前公共API背後建立清單+設定檔+轉換類型和註冊表
2. 重新佈線 `getSkillTemplates`/`getCommandContents` 從清單中派生
3. 介紹 `ArtifactSyncEngine` 並切換 `init` 將其與奇偶校驗一起使用
4. 轉變 `update` 和舊版升級流至同一引擎
5. 奇偶校驗為綠色後刪除重複/硬編碼列表
