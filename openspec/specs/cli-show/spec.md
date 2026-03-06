# cli-show 規範

## 目的
定義頂層 `openspec show` 用於互動式和直接顯示變更和規範內容的行為。

## 要求
### 要求：頂級 show 指令

CLI 應提供頂級 `show` 用於透過智慧選擇顯示更改和規格的命令。

#### 場景：互動選秀

- **何時**執行 `openspec show` 沒有參數
- **然後** 提示使用者選擇類型（變更或規格）
- **和** 顯示所選類型的可用項目列表
- **並** 顯示所選項目的內容

#### 場景：非互動環境不提示

- **給定** stdin 不是 TTY 或 `--no-interactive` 提供或環境變數 `OPEN_SPEC_INTERACTIVE=0`
- **何時**執行 `openspec show` 沒有參數
- **THEN** 不提示
- **並** 列印有用的提示以及範例 `openspec show <item>` 或者 `openspec change/spec show`
- **並且** 使用代碼 1 退出

#### 場景：直接物品展示

- **何時**執行 `openspec show <item-name>`
- **然後** 自動偵測項目是否為變更或規格
- **並** 顯示項目的內容
- **並且** 根據項目類型使用適當的格式

#### 場景：類型檢測和歧義處理

- **何時**執行 `openspec show <item-name>`
- **那麼**如果 `<item-name>` 唯一符合變更或規範，顯示該項目
- **AND** 如果兩者都匹配，則列印歧義錯誤並提出建議 `--type change|spec` 或使用 `openspec change show`/`openspec spec show`
- **AND** 如果兩者都不匹配，則列印 not-found 並帶有最接近的匹配建議

#### 場景：明確類型覆蓋

- **何時**執行 `openspec show --type change <item>`
- **然後**治療 `<item>` 作為更改 ID 並顯示它（跳過自動檢測）

- **何時**執行 `openspec show --type spec <item>`
- **然後**治療 `<item>` 作為規格 ID 並顯示它（跳過自動檢測）

### 需求：輸出格式選項

show 指令應支援與現有指令一致的各種輸出格式。

#### 場景：JSON輸出

- **何時**執行 `openspec show <item> --json`
- **THEN** 以 JSON 格式輸出該項目
- **和** 包括解析的元資料和結構
- **並** 保持與現有變更/規範顯示命令的格式一致性

#### 場景：標記範圍和授權

- **何時** 透過頂級命令顯示變更或規範
- **THEN** 接受常見標誌，例如 `--json`
- **AND** 將特定於類型的標誌傳遞給對應的實現
  - 僅更改標誌： `--deltas-only` （別名 `--requirements-only` 已棄用）
  - 僅規格標誌： `--requirements`, `--no-scenarios`, `-r/--requirement`
- **並且** 忽略檢測到的類型的不相關標誌並發出警告

### 要求：互動控制

- CLI 應尊重 `--no-interactive` 禁用提示。
- CLI 應尊重 `OPEN_SPEC_INTERACTIVE=0` 全域禁用提示。
- 僅當 stdin 是 TTY 且未停用互動性時才應顯示互動提示。

#### 場景：更改特定選項

- **何時** 顯示更改 `openspec show <change-name> --deltas-only`
- **THEN** 僅顯示 JSON 格式的增量
- **並** 保持與現有變更顯示選項的兼容性

#### 場景：特定於規範的選項  

- **何時** 顯示規格 `openspec show <spec-id> --requirements`
- **THEN** 僅顯示 JSON 格式的要求
- **並且** 支援其他規範選項（--no-scenarios、-r）
- **並**保持與現有規格顯示選項的兼容性

