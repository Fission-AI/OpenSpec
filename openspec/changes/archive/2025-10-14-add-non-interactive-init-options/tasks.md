## 1.CLI選項註冊
- [x] 1.1 將多標誌設計替換為單標誌設計 `--tools <value>` 選項支援 `all|none|a,b,c` 並保持嚴格的論證驗證。
- [x] 1.2 填充 `--tools` 動態幫助文本 `AI_TOOLS` registry.

## 2. 修改InitCommand
- [x] 2.1 接受 InitCommand 建構函數中的單一工具選項，並透過現有流程進行探索。
- [x] 2.2 更新工具選擇邏輯到快速提示 `all`, `none`，以及明確的列表。
- [x] 2.3 當解析的清單包含不支援的工具 ID 時，快速失敗，並顯示退出代碼 1 和有用的訊息。

## 3. 規格更新
- [x] 3.1 捕捉非互動場景（`all`, `none`、清單、無效）在更改增量中而不進行修改 `specs/cli-init/spec.md` directly.
- [x] 3.2 Document that CLI help reflects the available tool IDs managed by `AI_TOOLS`.

## 4. 測試
- [x] 4.1 增加單元覆蓋率進行解析 `--tools` 值，包括無效條目。
- [x] 4.2 增加整合覆蓋率，確保非互動式執行產生預期的文件和退出代碼。
- [x] 4.3 驗證交互流程保持不變 `--tools` 被省略。
