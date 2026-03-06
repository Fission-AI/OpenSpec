## 情境

先前更改中新增的 Nix flake 在以下情況下需要手動維護：
1. 套件版本變更（必須更新 flake.nix 版本欄位）
2. 依賴項變更（必須更新 pnpmDeps 雜湊）

目前，這要求維護者：
- 手動編輯 flake.nix 版本
- 設定佔位符哈希
- 執行 nix build 出現錯誤
- 複製錯誤訊息中的哈希值
- 再次更新 flake.nix
- 驗證建置工作

這是乏味且容易出錯的，特別是對於不熟悉 Nix 的維護者來說。

## 目標

- 自動更新 flake 的版本和雜湊值。 nix
- 使腳本冪等且安全地執行多次
- 在執行過程中提供清晰的回饋
- 輕鬆整合到發布工作流程中

## Non-Goals

- 自動提交更改（維護者決定何時提交）
- 支援非pnpm套件管理器
- 處理超出 OpenSpec 用例的複雜 Nix 設定

## 決定

### 使用Bash代替Node.js腳本

**決定**：實作為 bash 腳本而不是 Node.js。

**理由**：
- 需要呼叫 bash 原生的 Nix 指令
- 在 bash 中使用 grep/sed 解析 Nix 輸出較簡單
- 維護者更新 flake。 nix 可能安裝了 Nix（bash 環境）
- Node.js 會為 shell 操作增加不必要的複雜性

**考慮的替代方案**：具有 child_process 的 Node.js 腳本 - 添加對 shell 操作的額外 npm 套件的依賴，這對於 Nix 工具來說不太自然。

### 從建置錯誤輸出中提取哈希值

**Decision**: Trigger intentional build failure with placeholder hash to get correct hash.

**基本原理**：這是更新固定輸出推導的標準 Nix 工作流程。不存在 API 來計算哈希而不構建。

**考慮的替代方案**：從 pnpm-lock.yaml 預先計算哈希 - 需要瞭解 Nix 的雜湊演算法和 pnpm 的鎖定檔案結構，脆弱且非標準。

### Use sed for in-place file editing

**決定**：使用 `sed -i` 用於更新 flake.nix 到位。

**基本原理**：簡單，可用於所有類似 Unix 的系統，處理所需的特定替換模式。

**考慮的替代方案**：
- 使用 Node.js 來解析/修改：簡單字串替換的過度殺傷力
- 手動的 `sed` 沒有 `-i`：需要臨時文件，比較複雜

### 哈希更新後驗證構建

**決定**：更新雜湊後始終執行驗證建置。

**Rationale**: Catches errors immediately, gives maintainer confidence the update worked.

**权衡**：需要额外的时间（约 30 秒），但可以防止碎片损坏。 nix 提交。

## 關鍵實施細節

### 路徑分辨率

腳本計算相對於其自身位置的路徑：
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
```

這允許從任何工作目錄執行。

### 錯誤處理

用途 `set -euo pipefail` 對於嚴格的錯誤處理：
- `-e`：任何命令失敗時退出
- `-u`：在未定義的變數存取時退出
- `-o pipefail`：捕獲管道中的故障

### 哈希提取模式

使用 grep 和 Perl 正規表示式來提取雜湊值：
```bash
grep -oP 'got:\s+\Ksha256-[A-Za-z0-9+/=]+'
```

無論周圍的文字如何，這都可以可靠地提取哈希值。

## 風險/權衡

**[風險]** 腳本採用標準 Nix 錯誤訊息格式 → **緩解**：如果提取失敗，腳本會出現錯誤並顯示完整輸出

**[風險]** 建置可能會因雜湊不匹配以外的原因失敗 → **緩解**：腳本在繼續之前檢查輸出中的哈希

**[權衡]** 需要安裝 Nix 才能執行 → **好處**：只有更新 flake 的維護者需要執行它，並且他們有 Nix

## 遷移計劃

1. 將腳本新增至腳本目錄
2. 文件位於scripts/README.md
3. 在下一個版本中使用來驗證工作流程
4. 如果需要提及腳本，請更新 CONTRIBUTING.md

沒有重大變化——純粹的附加工具。

## 開放式問題

無 - 簡單的自動化腳本。
