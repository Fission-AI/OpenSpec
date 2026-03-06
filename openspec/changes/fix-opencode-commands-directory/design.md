## 情境

OpenCode 適配器位於 `src/core/command-generation/adapters/opencode.ts` 目前生成命令檔位於 `.opencode/command/opsx-<id>.md` （單數 `command`）。 OpenCode的官方文件使用 `.opencode/commands/` （複數），程式碼庫中的所有其他適配器都遵循命令目錄的複數約定。遺留清理模組 `src/core/legacy-cleanup.ts` 也引用了用於檢測舊文物的單數形式。

## 目標/非目標

**目標：**
- 將OpenCode適配器路徑與OpenCode官方的一致 `.opencode/commands/` 習俗
- 新增舊的單一路徑 `.opencode/command/` 進行遺留清理，以便正確清理現有安裝
- 更新文件以反映正確的路徑
- 更新測試斷言以符合新路徑

**非目標：**
- 更改 OpenCode 技能路徑（`.opencode/skills/`) — 已經正確
- 修改任何其他適配器的目錄結構
- 新增遷移提示或互動式升級流程

## 決定

### 1.適配器中直接路徑重新命名

**決定：** 改變 `path.join('.opencode', 'command', ...)` 到 `path.join('.opencode', 'commands', ...)` 在適配器的 `getFilePath` method.

**基本原理：** 這是一個單行更改，與所有其他適配器的既定模式保持一致。不需要抽像或間接。

**考慮的替代方案：**
- 新增目錄名稱的設定選項 - 由於錯誤修復的過度設計而被拒絕
- 保留單數並添加複數作為別名 - 被拒絕，因為它會造成關於哪個是規範的歧義

### 2. 透過現有常數映射進行遺留清理

**決定：** 更新 `LEGACY_SLASH_COMMAND_PATHS` 條目為 `'opencode'` 從 `'.opencode/command/openspec-*.md'` 到 `'.opencode/command/opsx-*.md'` （舊的單一路徑成為遺留模式）並確保新路徑由目前命令產生管道處理。

**理由：** 現有的遺留清理基礎設施使用 `LEGACY_SLASH_COMMAND_PATHS` 作為顯式查找。舊的單一路徑模式已經與舊格式相符（`openspec-*` 來自舊 SlashCommandRegistry 時代的前綴）。目前的命令產生使用 `opsx-*` 前綴，所以我們還需要加入一個遺留模式 `opsx-*` 舊單一目錄中的檔案。

**考慮的替代方案：**
- 新增單獨的遷移腳本－拒絕；現有的遺留清理機制可以處理這種情況

### 3. 文件更新

**決定：** 更新 `docs/supported-tools.md` OpenCode 的表格條目來自 `.opencode/command/opsx-<id>.md` 到 `.opencode/commands/opsx-<id>.md`.

**理由：** 文件必須與實際產生的路徑相符。

## 風險/權衡

- **[現有安裝的檔案位於舊路徑]** → 透過遺留清理偵測來緩​​解 `.opencode/command/` 文物。下一個 `openspec init`，舊文件被清理並寫入新文件 `.opencode/commands/`.
- **[使用者在自訂腳本中引用舊路徑]** → 低風險。根據 OpenCode 的規範，舊路徑不正確，因此自訂引用已經未對齊。
