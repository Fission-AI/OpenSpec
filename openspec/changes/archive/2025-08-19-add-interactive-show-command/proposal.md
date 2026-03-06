## 為什麼

使用者經常需要檢視變更和規格，但必須提前知道他們正在檢視的是變更還是規格。目前子命令結構（`change show`, `spec show`) 在下列情況下產生摩擦：
- 使用者希望快速檢視某個項目而不記住其類型
- 探索程式碼庫需要在不同的 show 指令之間切換
- 顯示不帶參數的命令返回錯誤而不是有用的指導

## 有什麼變化

- 新增的頂級 `show` 用於透過智慧選擇顯示變更或規格的命令
- 支援直接項目顯示： `openspec show <item>` 具有自動類型檢測功能
- 未提供參數時的互動式選擇
- 增強現有 `change show` 和 `spec show` 支援互動式選擇（向後相容）
- 維護所有現有格式選項（--json、--deltas-only、--requirements 等）

## 影響

- 要建立的新規範：cli-show
- 需要增強的規格：cli-change、cli-spec（用於向後相容）
- 受影響的程式碼：src/cli/index.ts、src/commands/show.ts（新）、src/commands/spec.ts、src/commands/change.ts