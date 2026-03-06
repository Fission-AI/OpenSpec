## 為什麼
目前的 `openspec init` 命令需要互動式提示，從而阻止 CI/CD 管道和腳本設定中的自動化。新增非互動式選項將為自動化工作流程啟用程式設計初始化，同時將現有的互動式體驗保留為預設值。

## 有什麼變化
- 將多標誌設計替換為單標誌設計 `--tools` 接受的選項 `all`, `none`，或以逗號分隔的工具 ID 列表
- 更新 InitCommand 以繞過互動式提示 `--tools` 提供並應用單標誌驗證規則
- 透過 CLI init spec delta 記錄非互動行為（場景 `all`, `none`、清單解析和無效條目）
- 動態產生 CLI 幫助文本 `AI_TOOLS` 因此支援的工具保持同步

## 影響
- 受影響的規格： `specs/cli-init/spec.md`
- 受影響的代碼： `src/cli/index.ts`, `src/core/init.ts`
