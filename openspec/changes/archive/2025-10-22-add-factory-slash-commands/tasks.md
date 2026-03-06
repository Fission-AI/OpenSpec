## 1.工廠工具註冊
- [x] 1.1 Add Factory/Droid metadata to the native tool registry used by init/update (ID, display name, command paths, availability flags).
- [x] 1.2 Surface Factory in interactive prompts and non-interactive `--tools` 與現有的斜線命令整合一起進行解析。

## 2. 斜線指令模板
- [x] 2.1 為Factory建立共享模板 `openspec-proposal`, `openspec-apply`， 和 `openspec-archive` custom commands following Factory's CLI format.
- [x] 2.2 將範本連接到 init/update 中，以便在建立時產生並重新整理，尊重 OpenSpec 標記。

## 3. 驗證
- [x] 3.1 更新或新增自動覆蓋範圍，以確保正確建置和重新整理工廠命令檔。
- [x] 3.2 如果規範要求，在任何面向使用者的副本（說明文字、README 片段）中記錄新選項。
