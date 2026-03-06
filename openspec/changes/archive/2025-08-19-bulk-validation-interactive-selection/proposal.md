## 為什麼

目前，使用者必須透過指定每個 ID 來單獨驗證變更和規格。這會在以下情況下產生摩擦：
- 團隊希望在發布之前驗證所有更改/規範
- 開發人員需要確保多個相關變更的一致性  
- 使用者執行不帶參數的驗證命令並收到錯誤而不是有用的指導
- 子命令結構要求使用者提前知道他們是否正在驗證變更或規範

## 有什麼變化

- 新增的頂級 `validate` 帶有直覺標誌的命令（--all、--changes、--specs）
- 增強現有 `change validate` 和 `spec validate` 支援互動式選擇（向後相容）
- 未提供參數時預設互動式選擇
- 支援直接項目驗證： `openspec validate <item>` 具有自動類型檢測功能

## 影響

- 要建立的新規範：cli-validate
- 需要增強的規格：cli-change、cli-spec（用於向後相容）
- 受影響的代碼：src/cli/index.ts、src/commands/validate.ts（新）、src/commands/spec.ts、src/commands/change.ts