# 新增更新命令

## 為什麼

當 OpenSpec 軟體包發布具有改進的 AI 代理指令或結構約定的新版本時，使用者需要一種方法來更新其本地 OpenSpec 指令（README.md 和 CLAUDE.md）。

## 有什麼變化

- 新增新的 `openspec update` 更新OpenSpec指令的CLI命令
- 代替 `openspec/README.md` 與最新的模板
  - 安全，因為此文件完全由 OpenSpec 管理
- 僅更新 OpenSpec 管理的區塊 `CLAUDE.md` 使用標記
  - 保留標記以外的所有使用者內容
  - 如果 `CLAUDE.md` 丟失，使用託管區塊建立它
- 更新後顯示成功訊息（ASCII-safe）：“已更新 OpenSpec 說明”
  - 當終端支援時，可能會顯示前導複選標記
  - 操作是冪等的（重新執行會產生相同的結果）

## 影響

- 受影響的規格： `cli-update` （新能力）
- 受影響的代碼：
  - `src/core/update.ts` （新命令類，鏡像 `InitCommand` 放置）
  - `src/cli/index.ts` （註冊新指令）
  - 透過使用現有模板 `TemplateManager` 和 `readmeTemplate`

## 超出範圍

- 不 `.openspec/config.json` 是由這項變更引入的。預設目錄名稱 `openspec` 被使用。