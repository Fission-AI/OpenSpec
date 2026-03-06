## 為什麼

最近的分裂 `skill-templates.ts` 工作流程模組提高了可讀性，但生成管道仍然分散在多個層中：

- 工作流程定義從投影邏輯分離出來（`getSkillTemplates`, `getCommandTemplates`, `getCommandContents`)
- 工具功能和相容性分佈廣泛 `AI_TOOLS`, `CommandAdapterRegistry`，以及硬編碼列表，例如 `SKILL_NAMES`
- 代理/工具特定的轉換（例如 OpenCode 命令參考重寫）應用於不同的地方（`init`, `update`，和適配器代碼）
- 工件寫入邏輯是重複的 `init`, `update`和舊版升級流程

這種碎片化會帶來漂移風險（缺少導出、缺少元資料奇偶性、計數/支援不匹配），並使未來的工作流程/工具添加速度變慢且難以預測。

## 有什麼變化

- 引入一個規範 `WorkflowManifest` 作為所有工作流程工件的單一事實來源
- 介紹一個 `ToolProfileRegistry` 集中工具功能（技能路徑、命令適配器、轉換）
- 引入具有顯式階段的一流轉換管道（`preAdapter`, `postAdapter`）和範圍（`skill`, `command`, `both`)
- 介紹一個分享的 `ArtifactSyncEngine` 被使用過 `init`, `update`和傳統升級路徑
- 添加嚴格的驗證和測試護欄，以在遷移和未來更改期間保持保真度

## 能力

### 新功能

- `template-artifact-pipeline`：統一的工作流程清單、工具設定檔註冊表、轉換管道和用於產生技能/命令的同步引擎

### 修改後的功能

- `command-generation`：擴展為支援適配器渲染周圍的有序變換階段
- `cli-init`：使用共享工件同步編排而不是自訂循環
- `cli-update`：使用共享工件同步編排而不是自訂循環

## 影響

- **主要重構區域**：
  - `src/core/templates/*`
  - `src/core/shared/skill-generation.ts`
  - `src/core/command-generation/*`
  - `src/core/init.ts`
  - `src/core/update.ts`
  - `src/core/shared/tool-detection.ts`
- **測試新增**：
  - 清單完整性測試（工作流程、所需元資料、投影奇偶校驗）
  - 轉換排序和適用性測試
  - 對跨工具產生的技能/指令輸出進行端對端奇偶校驗測試
- **使用者導向的行為**：
  - 不需要新的CLI表面積
  - 現有生成的工件在行為上保持等效，除非在未來的增量中明確更改
