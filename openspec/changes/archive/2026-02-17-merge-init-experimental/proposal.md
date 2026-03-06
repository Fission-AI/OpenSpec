## 為什麼

目前設定有兩個單獨的命令（`openspec init` 和 `openspec experimental`），設定 OpenSpec 工作流程的不同部分。這會造成執行哪個命令的混亂，導致部分設置，並維護兩個並行系統（設定檔+舊斜線命令與技能+ opsx 命令）。將基於技能的工作流程設為預設設定可以簡化入職流程，並建立單一、一致的方式來使用 OpenSpec。

## 有什麼變化

- **中斷**： `openspec init` 現在產生技能並 `/opsx:*` 命令而不是設定檔 `/openspec:*` 命令
- **破壞**：設定檔（`CLAUDE.md`, `.cursorrules`等）不再生成
- **破壞**：舊的斜線指令（`/openspec:proposal`, `/openspec:apply`, `/openspec:archive`) 不再生成
- **中斷**： `openspec/AGENTS.md` 和 `openspec/project.md` 不再生成
- 合併 `experimental` 命令功能進入 `init`
- 新增遺留偵測和自動清理功能並進行 Y/N 確認
- 保持 `openspec experimental` 作為向後相容的隱藏別名
- 使用實驗中的動畫歡迎畫面進行統一初始化

## 能力

### 新功能

- `legacy-cleanup`：在初始化期間偵測並刪除遺留的 OpenSpec 工件（設定檔、舊斜線指令、AGENTS.md）

### 修改後的功能

- `cli-init`：完全重寫 - 生成技能和 opsx 命令，而不是設定檔和舊的斜杠命令；刪除 AGENTS.md/project.md 生成；添加遺留清理；使用實驗性的動畫歡迎屏幕

## 影響

- **程式碼刪除**： `ToolRegistry`, `SlashCommandRegistry`、設定檔產生器、舊斜線指令模板、AGENTS.md/project.md 模板
- **程式碼遷移**：將技能產生和命令適配器邏輯從 `experimental/setup.ts` 進入 `init.ts`
- **受影響的命令**： `init` （重寫）， `experimental` （成為隱藏別名）， `update` （可能需要調整）
- **使用者遷移**：現有使用者執行 `init` 會提示清理遺留文件
- **中斷**：使用者依賴設定檔進行被動觸發，使用者使用 `/openspec:*` 命令
