# 更改：新增具有 JSON 輸出的更改命令

## 為什麼

OpenSpec 更改提案目前只能作為 Markdown 文件檢視，從而建立與規範相同的程式存取限制。此外，目前的 `openspec list` 命令僅列出更改，這與新的基於資源的命令結構不一致。

## 有什麼變化

- **cli-change：** 新增指令，用於使用 show、list 和 validate 子指令管理變更提案
- **cli-list：** 新增舊清單指令的棄用通知，以引導使用者使用新的變更清單指令

## 影響

- **受影響的規格**：cli-list（修改以新增棄用通知）
- **受影響的代碼**：
  - src/cli/index.ts（註冊新指令）
  - src/core/list.ts（新增棄用通知）