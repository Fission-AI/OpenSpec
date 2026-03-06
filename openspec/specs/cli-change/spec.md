# cli-change 規範

## 目的
定義 `openspec change` 用於顯示、列出和驗證變更建議和增量的命令行為。

## 要求
### 要求：更改命令

系統應提供 `change` 命令以及用於顯示、列出和驗證更改建議的子命令。

#### 場景：將變更顯示為 JSON

- **何時**執行 `openspec change show update-error --json`
- **THEN** 解析 markdown 變更文件
- **和** 提取變化結構和增量
- **AND** 將有效 JSON 輸出到標準輸出

#### 場景：列出所有更改

- **何時**執行 `openspec change list`
- **然後** 掃描 openspec/changes 目錄
- **並且** 傳回所有待處理變更的列表
- **並且** 支援 JSON 輸出 `--json` 旗幟

#### 場景：僅顯示需求變更

- **何時**執行 `openspec change show update-error --requirements-only`
- **THEN** 僅顯示需求變更（新增/修改/刪除/重新命名）
- **和** 排除更改部分的原因和內容

#### 場景：驗證變更結構

- **何時**執行 `openspec change validate update-error`
- **然後** 解析更改文件
- **和** 根據 Zod 模式進行驗證
- **並** 確保增量結構良好

### 需求：舊版相容性

系統應保持與現有系統的向後相容性 `list` 命令同時顯示棄用通知。

#### 場景：遺留清單命令

- **何時**執行 `openspec list`
- **THEN** 顯示目前變更清單（現有行為）
- **並且** 顯示棄用通知：“注意：'openspec list' 已棄用。請改用 'openspec change list'。”

#### 場景：帶有 --all 標誌的舊列表

- **何時**執行 `openspec list --all`
- **然後** 顯示所有變更（現有行為）
- **並且** 顯示相同的棄用通知

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

