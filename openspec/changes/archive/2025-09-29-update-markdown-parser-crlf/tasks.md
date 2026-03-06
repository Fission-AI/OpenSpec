## 1. 防止回歸
- [x] 1.1 Add a unit test that feeds a CRLF change document into `MarkdownParser.parseChange` 並斷言 `Why`/`What Changes` 被檢測到。
- [x] 1.2 新增 CLI spawn/e2e 測試，寫入 CRLF 更改，執行 `openspec validate`，並期望成功。

## 2. 規範化解析
- [x] 2.1 構造時規範行尾 `MarkdownParser` 所以標題和內容比較會被忽略 `\r`.
- [x] 2.2 確保所有 CLI 入口點（驗證、檢視、規範轉換）重複使用規範化解析器路徑。

## 3. 記錄並驗證
- [x] 3.1 更新 `cli-validate` 規範包含包含 CRLF 行結尾的場景。
- [x] 3.2 執行解析器和CLI測試套件（`pnpm test`，相關的生成測試）以確認修復。
