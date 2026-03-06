## 為什麼
專案根目前收到 OpenSpec 代理指令的完整副本，複製也存在於 `openspec/AGENTS.md`。當團隊編輯一份副本而不編輯另一份副本時，文件會發生變化，入職助理會看到相互衝突的指導。

## 有什麼變化
- 繼續產生完整的模板 `openspec/AGENTS.md` 期間 `openspec init` 以及後續更新。
- 替換根級檔案（`AGENTS.md` 或者 `CLAUDE.md`，取決於工具選擇），並有一個簡短的交接，解釋項目使用 OpenSpec 並直接指向 `openspec/AGENTS.md`.
- 新增專用存根模板，以便初始化和更新流程重複使用相同的最小複製指令。
- 更新 CLI 測試和文件以反映新的根級訊息傳遞，並確保 OpenSpec 標記區塊仍然保護未來的更新。

## 影響
- 受影響的規格： `cli-init`, `cli-update`
- 受影響的代碼： `src/core/init.ts`, `src/core/update.ts`, `src/core/templates/agents-template.ts`
- 更新提及根的資產/自述文件 `AGENTS.md` 引用新存根訊息的內容。
