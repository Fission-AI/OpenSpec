## 為什麼

有了每次更改模式元資料（請參閱 `add-per-change-schema-metadata`），代理現在可以使用不同的工作流程模式建立變更。然而，代理技能仍然是硬編碼的 `spec-driven` 工件並且不向使用者提供架構選擇。

## 有什麼變化

**範圍：實驗工件工作流程代理技能**

**取決於：** `add-per-change-schema-metadata` （必須先執行）

- 更新 `openspec-new-change` 提示使用者選擇模式的技巧
- 更新 `openspec-continue-change` 處理任何模式工件的技能
- 更新 `openspec-apply-change` 處理特定於模式的任務結構的技能
- 新增架構描述以協助使用者選擇合適的工作流程

## 能力

### 修改後的功能
- `cli-artifact-workflow`：Agent技能支援動態模式選擇

## 影響

- **受影響的代碼**： `src/core/templates/skill-templates.ts`
- **使用者體驗**：使用者在開始變更時可以選擇 TDD、規範驅動或未來工作流程
- **代理行為**：技能從模式讀取工件清單而不是硬編碼
- **向後相容**：保留預設值 `spec-driven` 如果用戶不選擇
