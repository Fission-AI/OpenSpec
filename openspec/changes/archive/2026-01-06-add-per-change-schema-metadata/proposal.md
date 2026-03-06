## 為什麼

目前，架構（工作流程類型）必須透過 `--schema` 每個實驗工作流程指令上的標記。這是重複且容易出錯的。代理無法知道更改使用哪個架構，因此它們預設為 `spec-driven` 且無法利用替代工作流程，例如 `tdd`.

## 有什麼變化

**範圍：僅限實驗工件工作流程** (`openspec new change`, `openspec status`, `openspec instructions`, `openspec templates`)

- 將模式選擇儲存在 `.openspec.yaml` 透過建立更改時的元資料文件 `openspec new change`
- 從實驗工作流程指令中的元資料自動偵測模式
- 製作 `--schema` 標誌可選（僅覆蓋，元資料優先）
- 添加 `--schema` 選項 `openspec new change` 命令

**不受影響**：舊命令（`openspec validate`, `openspec archive`, `openspec list`, `openspec show`)

## 能力

### 新功能
- `change-metadata`：讀取/寫入每次更改元資料文件

### 修改後的功能
- `cli-artifact-workflow`：命令從更改元資料自動偵測模式

## 影響

- **受影響的代碼**： `src/utils/change-utils.ts`, `src/core/artifact-graph/instruction-loader.ts`, `src/commands/artifact-workflow.ts`
- **代理技能**：可以簡化 - 不再需要明確傳遞模式
- **向後相容**：無需更改 `.openspec.yaml` 回落到 `spec-driven` 預設
- **隔離**：實驗工作流程程式碼中包含的所有變更；遺留指令未受影響
