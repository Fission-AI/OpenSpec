## 為什麼

實驗工作流程 (OPSX) 提供了一種模式驅動的、逐個工件的方法來建立更改 `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:apply`， 和 `/opsx:sync`。但是，沒有相應的存檔命令來完成和存檔已完成的變更。用戶目前必須退回常規版本 `openspec archive` 命令，它不與代理驅動的規範同步和模式感知工件追蹤的 OPSX 理念整合。

## 有什麼變化

- 添加 `/opsx:archive` 用於歸檔實驗工作流程中的變更的斜杠命令
- 使用工件圖檢查完成狀態（架構感知），而不僅僅是驗證提案+規範
- 提示 `/opsx:sync` 在歸檔之前而不是以程式設計方式應用規範
- 儲存 `.openspec.yaml` 移動到存檔時的架構元資料
- 與現有 OPSX 命令整合以實現一致的工作流程

## 能力

### 新功能

- `opsx-archive-skill`：用於歸檔實驗工作流程中已完成變更的斜線命令和技能。透過工件圖檢查工件完成情況，驗證任務完成情況，可以選擇透過以下方式同步規格 `/opsx:sync`，並將變更移至 `archive/YYYY-MM-DD-<name>/`.

### 修改後的功能

（無 - 這是一項新技能，不會修改現有規格）

## 影響

- 新文件： `.claude/commands/opsx/archive.md`
- 新技能定義（透過生成 `openspec artifact-experimental-setup`)
- 不變更現有存檔指令或其他 OPSX 指令
- 完成完整生命週期管理的 OPSX 指令套件
