# 實施任務

## 1. 模板和設定器
- [x] 1.1 為提案、應用程式和存檔指令建立共用模板，並包含每個工作流程階段的說明 `openspec/README.md`.
- [x] 1.2 實施 `SlashCommandConfigurator` Claude 程式碼和遊標的基本和特定於工具的設定器。

## 2.Claude代碼集成
- [x] 2.1 生成 `.claude/commands/openspec/{proposal,apply,archive}.md` 期間 `openspec init` 使用共享模板。
- [x] 2.2 更新現有 `.claude/commands/openspec/*` 期間的文件 `openspec update`.

## 3. 遊標集成
- [x] 3.1 生成 `.cursor/commands/{openspec-proposal,openspec-apply,openspec-archive}.md` 期間 `openspec init` 使用共享模板。
- [x] 3.2 更新現有 `.cursor/commands/*` 期間的文件 `openspec update`.

## 4. 驗證
- [x] 4.1 新增測試，驗證斜線指令檔案是否正確建立和更新。

## 5. 開放式程式碼集成
- [x] 5.1 生成 `.opencode/commands/{openspec-proposal,openspec-apply,openspec-archive}.md` 期間 `openspec init` 使用共享模板。
- [x] 5.2 更新現有 `.opencode/commands/*` 期間的文件 `openspec update`.
