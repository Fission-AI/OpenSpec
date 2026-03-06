# cli-artifact-workflow Delta 規範

## 目的

添加 `--tool` 標誌到 `artifact-experimental-setup` 用於多提供者支援的命令。

## 新增要求

### 要求：工具選擇標誌

這 `artifact-experimental-setup` 命令應接受 `--tool <tool-id>` 用於指定目標 AI 工具的標誌。

#### 場景：透過flag指定工具

- **何時** 使用者執行 `openspec artifact-experimental-setup --tool cursor`
- **那麼**技能文件生成於 `.cursor/skills/`
- **AND** 指令檔是使用 Cursor 的 frontmatter 格式產生的

#### 場景：缺少工具標誌

- **何時** 使用者執行 `openspec artifact-experimental-setup` 沒有 `--tool`
- **然後** 系統顯示錯誤，要求 `--tool` 旗幟
- **AND** 在錯誤訊息中列出有效的工具 ID

#### 場景：未知工具 ID

- **何時** 使用者執行 `openspec artifact-experimental-setup --tool unknown-tool`
- **並且** 工具 ID 不在 `AI_TOOLS`
- **然後** 系統顯示錯誤，列出有效的工具 ID

#### 場景：沒有技能目錄的工具

- **何時** 使用者指定的工具沒有 `skillsDir` 設定好的
- **然後** 系統顯示錯誤，指示工具不支援技能生成

#### 場景：沒有命令適配器的工具

- **何時** 使用者指定具有以下功能的工具： `skillsDir` 但沒有註冊命令適配器
- **那麼**技能文件產生成功
- **AND** 命令產生被跳過並顯示資訊性訊息

### 需求：輸出訊息

設定命令應顯示有關生成內容的清晰輸出。

#### 場景：在輸出中顯示目標工具

- **何時** 設定命令成功執行
- **THEN** 輸出包含目標工具名稱（例如，「設定遊標...」）

#### 場景：顯示生成的路徑

- **何時** 設定指令完成
- **THEN** 輸出列出所有產生的技能檔案路徑
- **AND** 列出所有產生的命令檔案路徑（如果適用）

#### 場景：顯示跳過的命令訊息

- **WHEN** 由於缺少適配器而跳過命令生成
- **THEN** 輸出包括訊息：「命令產生已跳過 - 沒有適配器 <tool>"
