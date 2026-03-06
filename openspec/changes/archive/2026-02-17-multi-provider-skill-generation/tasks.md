## 1. 擴充AIToolOption接口

- [x] 1.1 添加 `skillsDir?: string` 字段到 `AIToolOption` 接口在 `src/core/config.ts`

## 2.將skillsDir加入AI_TOOLS

- [x] 2.1 添加 `skillsDir: '.claude'` 到Claude代碼工具入口
- [x] 2.2 添加 `skillsDir: '.cursor'` 到遊標工具條目
- [x] 2.3 添加 `skillsDir: '.windsurf'` 到 Windsurf 工具入口
- [x] 2.4 為其他具有已知代理技能規格支援的工具新增技能目錄（codex、opencode、roocode、kilocode、gemini、factory、github-copilot）

## 3. 建立命令產生類型

- [x] 3.1 建立 `src/core/command-generation/types.ts` 和 `CommandContent` 介面
- [x] 3.2 添加 `ToolCommandAdapter` types.ts 的接口
- [x] 3.3 從模組索引匯出類型

## 4. 實施工具命令適配器

- [x] 4.1 建立 `src/core/command-generation/adapters/claude.ts` 帶有 Claude frontmatter 格式
- [x] 4.2 建立 `src/core/command-generation/adapters/cursor.ts` 附 Cursor frontmatter 格式
- [x] 4.3 建立 `src/core/command-generation/adapters/windsurf.ts` 帶有 Windsurf frontmatter 格式
- [x] 4.4 為共用 YAML 格式化邏輯建立基本適配器或實用程式（如果適用）

## 5. 建立命令適配器註冊表

- [x] 5.1 建立 `src/core/command-generation/registry.ts` 和 `CommandAdapterRegistry` 班級
- [x] 5.2 在靜態初始化程序中註冊Claude、遊標、Windsurf 適配器
- [x] 5.3 添加 `get(toolId)` 和 `getAll()` 方法

## 6. 建立命令產生器

- [x] 6.1 建立 `src/core/command-generation/generator.ts` 和 `generateCommand()` 功能
- [x] 6.2 添加 `generateCommands()` 批次生成函數
- [x] 6.3 建立模組索引 `src/core/command-generation/index.ts` 出口公共API

## 7. 更新artifact-experimental-setup指令

- [x] 7.1 添加 `--tool <tool-id>` 命令的選項（必需） `src/commands/artifact-workflow.ts`
- [x] 7.2 新增驗證： `--tool` 需要標誌（如果缺少有效工具列表，則會出現錯誤）
- [x] 7.3 新增驗證：工具存在於AI_TOOLS中
- [x] 7.4 新增驗證：工具已設定 SkillsDir
- [x] 7.5 替換硬編碼 `.claude` 技能路徑與 `tool.skillsDir`
- [x] 7.6 將硬編碼指令生成替換為 `CommandAdapterRegistry.get()` + `generateCommands()`
- [x] 7.7 優雅地處理遺失的適配器（跳過帶有訊息的命令）
- [x] 7.8 更新輸出訊息以顯示目標工具名稱和路徑

## 8. 測試

- [x] 8.1 新增單元測試 `CommandContent` 和 `ToolCommandAdapter` 合約
- [x] 8.2 為Claude適配器新增單元測試（路徑+frontmatter格式）
- [x] 8.3 為Cursor適配器新增單元測試（路徑+frontmatter格式）
- [x] 8.4 新增單元測試 `CommandAdapterRegistry.get()` 缺少適配器盒
- [x] 8.5 新增整合測試 `--tool` 標誌驗證
- [x] 8.6 驗證跨平台路徑處理用途 `path.join()` 自始至終
