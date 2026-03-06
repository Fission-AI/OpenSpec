# CLI 更改指令規範

## 新增要求

### 需求：互動節目選擇

當未提供變更名稱時，change show 指令應支援互動式選擇。

#### 場景：互動改變節目選擇

- **何時**執行 `openspec change show` 沒有參數
- **然後** 顯示可用變更的互動式列表
- **並且**允許使用者選擇要顯示的更改
- **AND** 顯示所選的變更內容
- **並且** 維護所有現有的顯示選項（--json、--deltas-only）

#### 場景：非互動式回退保持當前行為

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec change show` 不改名
- **THEN** 不交互提示
- **並** 列印現有提示，包括可用的更改 ID
- **和**設定 `process.exitCode = 1`