## 情境

現在 `openspec init` 和 `openspec experimental` 是具有不同目的的單獨命令：

- **init**：建立 `openspec/` 目錄，生成 `AGENTS.md`/`project.md`，設定工具設定檔（`CLAUDE.md`等），產生舊的斜線指令（`/openspec:proposal`， ETC。 ）
- **實驗**：產生技能（每個工具 9 個），產生 opsx 斜線指令（`/opsx:new`等），建立 `config.yaml`

基於技能的工作流程（實驗性）是我們前進的方向，因此我們透過合併到將其設為預設值 `init`.

## 目標/非目標

**目標：**
- 單身的 `openspec init` 設定完整的基於技能的工作流程的命令
- 為現有使用者提供遺留工件的乾淨遷移路徑
- 刪除與設定檔和舊斜線命令相關的所有程式碼
- 避免實驗性的精美使用者體驗（歡迎動畫、可搜尋的多選）

**非目標：**
- 同時支援兩個工作流程
- 提供使用舊工作流程的選項
- 向後相容性 `/openspec:*` 命令（重大更改）

## 決定

### 決策 1：合併到 init 中，而不是合併到 Experimental 中

**選擇**：重寫 `init` 做什麼 `experimental` 是，然後刪除 `experimental`.

**理由**： `init` 是規範的設定命令。用戶期望 `init` 建立他們的項目。 `experimental` 總是意味著暫時的。

**考慮的替代方案**：
- 保持 `experimental` 作為主命令 → 預設行為的令人困惑的名稱
- 建立新指令→不必要， `init` 已經存在

### 決策 2：帶有 Y/N 提示的舊版清理

**選擇**：偵測遺留工件，顯示發現的內容，提示 `"Legacy files detected. Upgrade and clean up? [Y/n]"`，如果確認則刪除。

**理由**：使用者應該知道哪些內容被刪除。一個 Y/N 簡單而決定性。無需多個選項。

**考慮的替代方案**：
- 多個選項（保留/刪除/取消）→ 過於複雜
- 靜默刪除 → 使用者可能會感到驚訝
- 只是警告而不刪除 → 留下痕跡

### 決策 3：以手術刪除遺留內容

**選擇**：對於具有混合內容（OpenSpec標記+使用者內容）的文件，僅刪除OpenSpec標記區塊。對於 100% OpenSpec 內容的文件，刪除整個文件。

**基本原理**：尊重使用者自訂。 CLAUDE.md 可能有 OpenSpec 以外的其他指示。

**邊緣情況**：
- **具有混合內容的設定檔**：僅刪除 `<!-- OPENSPEC:START -->` 到 `<!-- OPENSPEC:END -->` 堵塞
- **設定檔為 100% OpenSpec**：完全刪除檔案（檢查標記之外的內容是否為空白/空格）
- **舊斜槓指令目錄** (`.claude/commands/openspec/`): 刪除整個目錄（我們的）
- **`openspec/AGENTS.md`**：刪除（我們的）
- **根 `AGENTS.md`**：僅刪除OpenSpec標記區塊，保留其餘部分

### 決策 6：保留有遷移提示的 project.md

**選擇**：不自動刪除 `openspec/project.md`。保留它並顯示一條訊息，指導用戶手動將內容遷移到 `config.yaml`的 `context:` field.

**理由**：
- `project.md` 可能包含有價值的用戶編寫的專案文檔
- 新的工作流程使用 `config.yaml.context` 出於相同目的（自動注入到工件中）
- 自動刪除會遺失使用者內容；自動遷移比較複雜（需要LLM來壓縮）
- 使用者可以手動遷移或使用 `/opsx:explore` 獲得人工智慧幫助

**遷移路徑**：
1. 在遺留清理期間，偵測 `openspec/project.md` 但不要刪除
2. 在輸出中顯示：“openspec/project.md 仍然存在 - 將內容遷移到 config.yaml 的 context: 字段，然後刪除”
3. 使用者手動遷移或在探索模式下詢問 Claude：“help me migrate project.md to config.yaml”
4. 用戶準備好後刪除project.md

**為什麼不自動遷移？ **
- `project.md` 很詳細（部分、標題、佔位符）
- `config.yaml.context` 應該簡潔而密集
- LLM 壓縮是理想的，但會增加 init 的複雜性和不確定性
- 手動遷移讓用戶可以決定什麼是真正重要的

### 決策 4：實驗的隱藏別名

**選擇**：保留 `openspec experimental` 作為委託給的隱藏命令 `init`.

**理由**：學習過的用戶 `experimental` 過渡期間仍然可以使用它。隱藏意味著它不會顯示在幫助中。

### 決策 5：重複使用現有基礎設施

**選擇**：重複使用技能範本、命令適配器、歡迎畫面以及實驗中的多項選擇。

**理由**：已經建置並正在執行。只需要從 init 調用，而不是實驗性的。

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 具有自訂功能的用戶 `/openspec:*` 命令失去它們 | 發行說明中的文件；舊命令在 git 歷史記錄中 |
| 混合內容檢測可能不完善 | 保守方法：如果不確定，保留文件並發出警告 |
| 用戶因缺少設定檔而感到困惑 | 清除初始化輸出中有關更改內容的訊息 |
| `openspec update` 可能會壞掉 | 審查和更新 `update` 使用新結構的命令 |

## 建築學

### init 建立了什麼（合併後）

```
openspec/
  ├── config.yaml           # Schema settings (from experimental)
  ├── specs/                # Empty, for user's specs
  └── changes/              # Empty, for user's changes
      └── archive/

.<tool>/skills/             # 9 skills per selected tool
  ├── openspec-explore/SKILL.md
  ├── openspec-new-change/SKILL.md
  ├── openspec-continue-change/SKILL.md
  ├── openspec-apply-change/SKILL.md
  ├── openspec-ff-change/SKILL.md
  ├── openspec-verify-change/SKILL.md
  ├── openspec-sync-specs/SKILL.md
  ├── openspec-archive-change/SKILL.md
  └── openspec-bulk-archive-change/SKILL.md

.<tool>/commands/opsx/      # 9 slash commands per selected tool
  ├── explore.md
  ├── new.md
  ├── continue.md
  ├── apply.md
  ├── ff.md
  ├── verify.md
  ├── sync.md
  ├── archive.md
  └── bulk-archive.md
```

### init 不再創造什麼

- `CLAUDE.md`, `.cursorrules`, `.windsurfrules`等（設定檔）
- `openspec/AGENTS.md`
- `openspec/project.md`
- 根 `AGENTS.md` 存根
- `.claude/commands/openspec/` （舊的斜線命令）

### 遺留檢測目標

| 神器類型 | 檢測方法 | 去除方法 |
|--------------|------------------|----------------|
| 設定檔（CLAUDE.md等） | 文件存在且包含 OpenSpec 標記 | 移除標記區塊；如果之後為空則刪除文件 |
| 舊的斜槓指令目錄 | 目錄存在於 `.<tool>/commands/openspec/` | 刪除整個目錄 |
| openspec/AGENTS.md | 文件存在於 `openspec/AGENTS.md` | 刪除文件 |
| openspec/project.md | 文件存在於 `openspec/project.md` | **保留** - 僅顯示遷移提示 |
| 根代理.md | 文件存在於 `AGENTS.md` AND 包含 OpenSpec 標記 | 移除標記區塊；如果之後為空則刪除文件 |

### 要刪除的程式碼

- `src/core/configurators/` - 整個目錄（ToolRegistry，所有設定產生器）
- `src/core/configurators/slash/` - 整個目錄（SlashCommandRegistry，舊命令產生器）
- `src/core/templates/slash-command-templates.ts` - 老的 `/openspec:*` 內容
- `src/core/templates/claude-template.ts`
- `src/core/templates/cline-template.ts`
- `src/core/templates/costrict-template.ts`
- `src/core/templates/agents-template.ts`
- `src/core/templates/agents-root-stub.ts`
- `src/core/templates/project-template.ts`
- `src/commands/experimental/` - 整個目錄（合併到init中）
- 相關測試文件

### 遷移到 init 的程式碼

- 動畫歡迎畫面（`src/ui/welcome-screen.ts`) - 保持，從 init 調用
- 可搜尋多選（`src/prompts/searchable-multi-select.ts`) - 保持，從 init 調用
- 技能模板（`src/core/templates/skill-templates.ts`） - 保持
- 命令生成（`src/core/command-generation/`） - 保持
- 工具狀態檢測（來自 `experimental/setup.ts`) - 移至 init

## 開放式問題

1. **會發生什麼 `openspec update`?** - 已解決

   **當前行為**：更新 `openspec/AGENTS.md`，設定檔（`CLAUDE.md`等）透過 `ToolRegistry`，和舊的斜杠命令（`/openspec:*`） 透過 `SlashCommandRegistry`.

   **新行為**：重寫以重新整理技能和 opsx 命令：
   - 檢測哪些工具安裝了技能（檢查 `.claude/skills/openspec-*/`， ETC。 ）
   - 使用以下命令重新整理每個已安裝工具的所有 9 個技能文件 `skill-templates.ts`
   - 使用以下命令重新整理每個已安裝工具的所有 9 個 opsx 命令文件 `command-generation/` 適配器
   - 刪除進口 `ToolRegistry`, `SlashCommandRegistry`, `agentsTemplate`
   - 更新輸出訊息以反映技能/命令而不是設定檔

   **關鍵原則**：與目前更新相同-僅重新整理現有工具，不新增工具。

2. **我們應該保留 `openspec schemas` 和其他實驗子指令？ ** - 已解決

   **決定**：是的，保留它們。從所有子指令（狀態、指令、模式等）中刪除「[實驗]」標籤。參見任務 4.3。
