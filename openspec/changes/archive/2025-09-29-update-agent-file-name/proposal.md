# 更新代理指令檔名

## 問題
代理指令位於 `openspec/README.md`，這與傳統專案 README 的用法相衝突，並給工具和貢獻者帶來了混亂。

## 解決方案
將代理指令檔案重命名為 `openspec/AGENTS.md` 並更新 OpenSpec 工具以使用新檔案名稱：
- `openspec init` 產生 `AGENTS.md` 而不是 `README.md`
- 模板和程式碼參考 `AGENTS.md`
- 規格和文檔相應更新

## 好處
- 與專案文檔明確分離
- 與其他代理指令檔命名一致
- 簡化工具和專案啟動

## 執行
- 重命名指令檔和模板
- 更新 CLI 指令（`init`, `update`) 讀/寫 `AGENTS.md`
- 調整規格和文件以引用新路徑

## 風險
- 現有項目可能仍依賴 `README.md`
- 工具可能會錯過對舊文件名的揮之不去的引用

## 成功指標
- `openspec init` 創造 `openspec/AGENTS.md`
- `openspec update` 重新整理 `AGENTS.md`
- 所有規格參考 `openspec/AGENTS.md`
