## 為什麼
在 OpenSpec 中加入對 Crush AI 助理的支援，使開發人員能夠使用 Crush 的增強功能來實現規範驅動的開發工作流程。

## 有什麼變化
- 新增用於提案、應用程式和歸檔操作的 Crushlash 命令設定器
- 新增 Crush 特定的 AGENTS.md 設定模板 
- 更新工具註冊表以包含 Crush 設定器
- **破壞性**：無 - 這是附加功能

## 影響
- 受影響的規範：cli-init（新工具選項）
- 受影響的程式碼：src/core/configurators/slash/crush.ts、registry.ts
- 新檔案：.crush/commands/openspec/（proposal.md、apply.md、archive.md）