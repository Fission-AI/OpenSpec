# cli-spec 規範

## 目的
定義 `openspec spec` 用於列出、顯示和驗證真實來源規範的命令行為。

## 要求
### 要求：互動式規格展示

當沒有提供spec-id 時，spec show 指令應支援互動式選擇。

#### 場景：展會互動規格選擇

- **何時**執行 `openspec spec show` 沒有參數
- **然後** 顯示可用規格的互動式列表
- **並且**允許使用者選擇要顯示的規格
- **並** 顯示選定的規格內容
- **AND** maintain all existing show options (--json, --requirements, --no-scenarios, -r)

#### 場景：非互動式回退保持當前行為

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec spec show` 沒有spec-id
- **THEN** 不交互提示
- **並且** 列印缺少spec-id 的現有錯誤訊息
- **並** 設定非零退出代碼

### 要求：規範命令

系統應提供 `spec` 命令以及用於顯示、列出和驗證規範的子命令。

#### 場景：將規格顯示為 JSON

- **何時**執行 `openspec spec show init --json`
- **然後** 解析 markdown 規範文件
- **和** 分層提取標題和內容
- **AND** 將有效 JSON 輸出到標準輸出

#### 場景：列出所有規格

- **何時**執行 `openspec spec list`
- **然後** 掃描 openspec/specs 目錄
- **和** 傳回所有可用功能的列表
- **並且** 支援 JSON 輸出 `--json` 旗幟

#### 場景：過濾規格內容

- **何時**執行 `openspec spec show init --requirements`
- **THEN** 僅顯示需求名稱和 SHALL 語句
- **並**排除場景內容

#### 場景：驗證規範結構

- **何時**執行 `openspec spec validate init`
- **然後** 解析規範文件
- **和** 根據 Zod 模式進行驗證
- **並**報告任何結構性問題

### 需求：JSON 架構定義

系統應定義準確表示執行時間驗證規範結構的 Zod 模式。

#### 場景：模式驗證

- **何時** 將規範解析為 JSON
- **然後** 使用 Zod 模式驗證結構
- **並** 確保所有必填欄位都存在
- **並且** 為驗證失敗提供清晰的錯誤訊息

### 要求：互動式規格驗證

當沒有提供規範 ID 時，規範驗證命令應支援互動式選擇。

#### 場景：互動式規格選擇以進行驗證

- **何時**執行 `openspec spec validate` 沒有參數
- **然後** 顯示可用規格的互動式列表
- **並且**允許使用者選擇要驗證的規範
- **並** 驗證所選規格
- **並** 維護所有現有的驗證選項（--strict、--json）

#### 場景：非互動式回退保持當前行為

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec spec validate` 沒有spec-id
- **THEN** 不交互提示
- **並且** 列印缺少spec-id 的現有錯誤訊息
- **並** 設定非零退出代碼

