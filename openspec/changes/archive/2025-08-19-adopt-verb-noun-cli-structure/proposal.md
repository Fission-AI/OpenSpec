# 更改：採用動詞–名詞 CLI 結構（棄用基於名詞的命令）

## 為什麼

最廣泛使用的CLIs（git、docker、kubectl）以操作（動詞）開頭，後面接著物件（名詞）。這符合用戶的想法：「做 X 到 Y」。使用動詞作為頂級命令可以提高清晰度、可發現性和可擴展性。

## 有什麼變化

- 將頂級動詞命令提升為主要入口點： `list`, `show`, `validate`, `diff`, `archive`.
- 棄用基於名詞的頂級命令： `openspec spec ...` 和 `openspec change ...`.
- 在適用的情況下透過標誌引入一致的名詞範圍（例如， `--changes`, `--specs`）並保留智能預設值。
- 澄清消歧義 `show` 和 `validate` 當名字發生衝突時。

### 映射（從 → 到）

- **列表**
  - 從： `openspec change list`
  - 到： `openspec list --changes` （預設），或 `openspec list --specs`

- **展示**
  - 從： `openspec spec show <spec-id>` / `openspec change show <change-id>`
  - 到： `openspec show <item-id>` 具有自動檢測、使用 `--type spec|change` 如果有歧義

- **證實**
  - 從： `openspec spec validate <spec-id>` / `openspec change validate <change-id>`
  - 到： `openspec validate <item-id> --type spec|change`，或批量： `openspec validate --specs` / `--changes` / `--all`

### 向後相容性

- 保持 `openspec spec` 和 `openspec change` 提供一個發布週期的棄用警告。
- 更新說明文本以引導使用者找到動詞-名詞的替代形式。

## 影響

- **受影響的規格**：
  - `cli-list`：新增支援 `--specs` 和明確的 `--changes` （預設保留更改）
  - `openspec-conventions`：加上建立動詞-名詞的明確要求CLI設計和棄用指南
- **受影響的代碼**：
  - `src/cli/index.ts`: 取消棄用頂級 `list`;標記 `change list` 已棄用；確保幫助文字和警告對齊
  - `src/core/list.ts`：支援透過以下方式列出規格 `--specs` 並預設更改；共享輸出形狀
  - 可選後續措施：收緊 `show`/`validate` 幫助和歧義處理

## 顯式變更

**CLI設計**
- 來自：帶有名詞的混合模型（`spec`, `change`) 和一些頂級動詞； `openspec list` 目前已棄用
- 至：動詞作為主要： `openspec list|show|validate|diff|archive`;透過標誌或項目 ID 限定範圍的名詞；名詞指令已棄用
- 原因：與常見的CLIs對齊；改善使用者體驗；更簡單的心理模型
- 影響：不破壞，有棄用期；使用者逐步遷移

**上市行為**
- 從： `openspec change list` （基本的）， `openspec list` （已棄用）
- 到： `openspec list` 作為主要的，預設為 `--changes`;添加 `--specs` 列出規格
- 原因：動詞-名詞風格一致；更好的可發現性
- 影響：新選項；預設保留現有行為

## 推出和棄用政策

- 顯示某個版本的基於名詞的命令的棄用警告。
- 記錄新用法 `openspec/README.md` 和 CLI 幫助。
- 在發布一個版本後，請考慮刪除基於名詞的命令，或保留為精簡別名而不發出警告。

## 開放式問題

- 應該 `show` 也接受 `--changes`/`--specs` 沒有 id 就可以發現？ （超出此處的範圍；目前自動檢測和 `--type` 保持。 ）


