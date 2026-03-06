# ai-工具路徑規範

## 目的
定義用於在工具特定目錄中產生 OpenSpec 技能和指令的 AI 工具路徑元資料。

## 要求
### 需求：AIToolOption SkillsDir 字段

這 `AIToolOption` 介面應包括一個可選的 `skillsDir` 技能生成路徑設定欄位。

#### 場景：介麵包含skillsDir字段

- **何時** 工具條目定義於 `AI_TOOLS` 支援技能生成
- **那麼**它應該包括 `skillsDir` 指定專案本地基底目錄的欄位（例如， `.claude`)

#### 場景：技能路徑遵循代理技能規範

- **何時** 為工具產生技能 `skillsDir: '.claude'`
- **那麼**技能應寫入 `<projectRoot>/<skillsDir>/skills/`
- **和** `/skills` 依代理技能規範附加後綴

### 需求：支援的工具的路徑設定

這 `AI_TOOLS` 數組應包括 `skillsDir` 瞭解支援代理技能規範的工具。

#### 場景：Claude 已定義程式碼路徑

- **何時**查找 `claude` 工具
- **然後** `skillsDir` 應是 `.claude`

#### 場景：已定義遊標路徑

- **何時**查找 `cursor` 工具
- **然後** `skillsDir` 應是 `.cursor`

#### 場景：已定義風帆路徑

- **何時**查找 `windsurf` 工具
- **然後** `skillsDir` 應是 `.windsurf`

#### 場景：沒有技能的工具Dir

- **何時**工具沒有 `skillsDir` 定義的
- **那麼**技能產生將出現錯誤，並顯示訊息指示不支援該工具

### 需求：跨平台路徑處理

系統應正確處理跨作業系統的路徑。

#### 場景：Windows 上的路徑構建

- **何時** 在 Windows 建立技能路徑
- **那麼**系統要使用 `path.join()` 用於所有路徑構建
- **且** 不應硬編碼正斜杠

#### 場景：Unix上的路徑建設

- **何時** 在 macOS 或 Linux 上建立技能路徑
- **那麼**系統要使用 `path.join()` 為了一致性

