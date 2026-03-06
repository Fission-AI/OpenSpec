## 為什麼
由於基本的 Markdown 範本和格式規則隱藏在文件中間，代理商摸索了提案格式。重組 `openspec/AGENTS.md` 突出的快速參考和嵌入式範例將幫助助手遵循整個流程，無需猜測。

## 有什麼變化
- 重組 `openspec/AGENTS.md` 因此，文件格式和鷹架範本出現在工作流程散文之前的頂級快速參考部分。
- 嵌入複製/貼上模板 `proposal.md`, `tasks.md`, `design.md`，以及規格增量以及工作流程步驟中的內聯範例。
- 新增預驗證清單，突出顯示執行前最常見的格式缺陷 `openspec validate`.
- 將內容分為初級部分和高級部分，以逐步揭示複雜性，同時保持高級指導的可訪問性。

## 影響
- 受影響的規格： `specs/docs-agent-instructions`
- 受影響的代碼： `openspec/AGENTS.md`, `docs/`
