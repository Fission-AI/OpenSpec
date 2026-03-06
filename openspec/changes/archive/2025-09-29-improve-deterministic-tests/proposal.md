# 變化：改進確定性測試（與回購狀態隔離）

## 問題

一些單元測試（例如，ChangeCommand.show/validate）讀取即時儲存庫
狀態透過 `process.cwd()` 和 `openspec/changes`。這使得結果取決於
無論目錄是否存在以及回傳的順序 `fs.readdir`,
導致跨環境的不穩定的成功/失敗。

觀察到的症狀：
- 測試有時會選擇部分或不相關的更改資料夾。
- 失敗比如失蹤 `proposal.md` 當選擇一個雜散的更改目錄。
- 環境/沙箱差異改變 `readdir` 訂單和工人行為。

## 目標

- 使測試具有確定性和密封性。
- 消除對實際儲存庫內容和目錄排序的依賴。
- 保持最終用戶的執行時行為不變。

## 非目標

- 引入重型框架或測試工具複雜性。
- 重新設計 CLI 行為或更改使用者的預設路徑。

## 方法

1) 測試本地夾具根
- 每個涉及檔案系統發現的套件都會建立一個臨時目錄：
  - `openspec/changes/sample-change/proposal.md`
  - `openspec/changes/sample-change/specs/sample/spec.md`
- `beforeAll`: `process.chdir(tmpRoot)`; `afterAll`: 恢復原來的cwd。
- 使用常數 `changeName = 'sample-change'`;消除依賴
  `readdir` order.

2) 用於命令的可選精簡 DI（如果需要，則最少）
- 允許 `ChangeCommand` （和類似）接受可選 `root` 小路
  (預設 `process.cwd()`)，用於路徑解析。
- 測試明確傳遞臨時根；生產程式碼不變。

3）強化發現助手（安全增強）
- 更新 `getActiveChangeIds()`/`getActiveChanges()` 僅包括
  目錄包含 `proposal.md` （並且可選地至少一個
  `specs/*/spec.md`).
- 防止不完整/雜散的更改資料夾被視為活動資料夾。

## 基本原理

- 小而集中的變更可以消除不穩定，而無需改變使用者工作流程。
- 臨時裝置是一種易於理解的測試模式，可保持測試快速。
- 可選的建構函數根參數是一個最小的 DI 表面，可以避免全域
  存根並保持程式碼簡單。

## 風險與緩解措施

- 風險：測試忘記恢復 `process.cwd()`.
  - 緩解措施：新增 `afterAll` 守衛恢復cwd；重置 `process.exitCode` 在
    `afterEach` where modified.
- 風險：如果濫用 DI 根，會出現行為分歧。
  - 緩解措施：預設為 `process.cwd()`;只有測試才能通過自訂根。

## 驗收標準

- 以前依賴回購狀態的測試現在：
  - 建立並使用臨時夾具根。
  - 不讀真書 `openspec/changes` 執行期間。
  - 無論目錄順序或雜散資料夾如何，始終通過。
- 最終用戶的 CLI 行為沒有改變（路徑仍然預設為 cwd）。

## 推出

- 第一階段：轉換命中的套件 `ChangeCommand.show/validate` 到
  隔離裝置；驗證本地和CI的穩定性。
- 第 2 階段：將相同的模式應用於接觸文件的任何剩餘套件
  發現（`list`, `show`, `validate`, `diff`).
- 第 3 階段（可選）：引入建構函數 `root` 參數和發現
  僅第一階段的硬化是不夠的。

