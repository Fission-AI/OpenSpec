# CLI 規格 指令規格

## 新增要求

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