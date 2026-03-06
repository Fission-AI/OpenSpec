# CLI 更改指令規範

## 新增要求

### 需求：互動式驗證選擇

當未提供更改名稱時，更改驗證命令應支援互動式選擇。

#### 場景：互動式變更選擇以進行驗證

- **何時**執行 `openspec change validate` 沒有參數
- **然後** 顯示可用變更的互動式列表
- **並且**允許使用者選擇要驗證的更改
- **並** 驗證所選更改

#### 場景：非互動式回退保持當前行為

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec change validate` 不改名
- **THEN** 不交互提示
- **並** 列印現有提示，包括可用的更改 ID
- **和**設定 `process.exitCode = 1`