# 命令生成規範

## 目的

定義一個通用命令產生系統，透過策略/適配器模式支援多種 AI 工具，將命令內容與特定於工具的格式分開。

## 新增要求

### 需求：CommandContent介面

系統應定義一個與工具無關的 `CommandContent` 命令資料介面。

#### 場景：CommandContent 結構

- **何時** 定義要產生的命令
- **然後** `CommandContent` 應包括：
  - `id`：字串標識符（例如，「探索」、「應用」）
  - `name`：人類可讀的名稱（例如“OpenSpec Explore”）
  - `description`：命令用途的簡要描述
  - `category`：分組類別（例如“OpenSpec”）
  - `tags`：標籤字串數組
  - `body`：命令指令內容

### 需求：ToolCommandAdapter 介面

系統應定義一個 `ToolCommandAdapter` 每個工具格式化的介面。

#### 場景：Adapter介面結構

- **何時**實施工具適配器
- **然後** `ToolCommandAdapter` 應要求：
  - `toolId`：字串標識符匹配 `AIToolOption.value`
  - `getFilePath(commandId: string)`：傳回指令的檔案路徑（相對於專案根目錄，或全域範圍工具的絕對路徑，例如 Codex）
  - `formatFile(content: CommandContent)`：返回帶有 frontmatter 的完整文件內容

#### 場景：Claude 適配器格式化

- **何時** 格式化 Claude 代碼的命令
- **那麼** 適配器應輸出 YAML frontmatter `name`, `description`, `category`, `tags` 領域
- **並且**文件路徑應遵循模式 `.claude/commands/opsx/<id>.md`

#### 場景：遊標適配器格式化

- **何時** 格式化遊標指令
- **那麼** 適配器應輸出 YAML frontmatter `name` 作為 `/opsx-<id>`, `id`, `category`, `description` 領域
- **並且**文件路徑應遵循模式 `.cursor/commands/opsx-<id>.md`

#### 場景：Windsurf 適配器格式化

- **何時** 格式化 Windsurf 指令
- **那麼** 適配器應輸出 YAML frontmatter `name`, `description`, `category`, `tags` 領域
- **並且**文件路徑應遵循模式 `.windsurf/workflows/opsx-<id>.md`

### 需求：命令產生器功能

系統應提供 `generateCommand` 將內容與適配器結合的功能。

#### 場景：生成命令文件

- **何時**打電話 `generateCommand(content, adapter)`
- **那麼**它應該回傳一個物件：
  - `path`：檔案路徑來自 `adapter.getFilePath(content.id)`
  - `fileContent`：格式化的內容來自 `adapter.formatFile(content)`

#### 場景：產生多個命令

- **何時** 為工具產生所有 opsx 指令
- **然後** 系統應迭代命令內容並使用工具的適配器產生每個命令內容

### 需求：CommandAdapterRegistry

系統應提供一個用於尋找工具適配器的註冊表。

#### 場景：透過工具ID取得適配器

- **何時**打電話 `CommandAdapterRegistry.get('cursor')`
- **那麼**它應該會傳回遊標適配器，如果未註冊則傳回未定義

#### 場景：取得所有適配器

- **何時**打電話 `CommandAdapterRegistry.getAll()`
- **那麼** 它應傳回所有已註冊適配器的陣列

#### 場景：找不到適配器

- **何時** 尋找未註冊工具的適配器
- **然後** `CommandAdapterRegistry.get()` 應回傳未定義
- **並且**呼叫者應適當處理遺失的適配器

### 要求：共享命令正文內容

命令的正文內容應在所有工具之間共用。

#### 場景：跨工具的相同指令

- **何時** 為 Claude 和遊標產生「探索」指令
- **那麼**兩者應使用相同的 `body` 內容
- **並且**只有 frontmatter 和檔案路徑應該不同
