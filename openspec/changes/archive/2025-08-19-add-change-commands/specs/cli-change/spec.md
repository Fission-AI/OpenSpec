## 新增要求

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