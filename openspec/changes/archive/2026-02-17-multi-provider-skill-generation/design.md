## 情境

這 `artifact-experimental-setup` 指令為 AI 編碼助手產生技能檔和 opsx 斜線指令。目前它硬編碼路徑 `.claude/skills` 和 `.claude/commands/opsx`.

現有的 `AI_TOOLS` 數組中 `config.ts` 列出了 22 個 AI 工具，但缺少路徑資訊。還有一個現有的 `SlashCommandConfigurator` 系統適用於舊的工作流程指令，但它與舊的 3 個命令（提案、應用、存檔）緊密耦合，並且無法輕鬆擴展為 9 個 opsx 命令。

每個人工智慧工具都具有：
- 不同的技能目錄約定（`.claude/skills/`, `.cursor/skills/`， ETC。 ）
- 不同的命令檔路徑（`.claude/commands/opsx/`, `.cursor/commands/`， ETC。 ）
- 不同的 frontmatter 格式（YAML 鍵，結構因工具而異）

## 目標/非目標

**目標：**
- 支援遵循代理技能規範的任何 AI 工具的技能生成
- 透過適配器支援使用特定於工具的格式產生命令
- 需要明確的工具選擇（無預設值）
- 建立通用的、可擴展的命令產生系統

**非目標：**
- Codex 以外的工具的全域路徑安裝（Codex 目前使用絕對適配器路徑）
- 在單一命令中產生多工具（未來增強）
- 與現有的 SlashCommandConfigurator 統一（目前是單獨的系統）

## 決定

### 1.添加 `skillsDir` 到 `AIToolOption` 介面

**決定**：新增單個 `skillsDir` 字段到現有介面。不 `commandsDir` 或者 `globalSkillsDir`.

```typescript
interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
  skillsDir?: string;  // e.g., '.claude' - /skills suffix per Agent Skills spec
}
```

**理由**：
- 技能遵循特工技能規範： `<toolDir>/skills/` - 後綴為標準
- 命令需要按工具格式化，由適配器處理（不是簡單的路徑）
- 支援全域路徑 - Codex 適配器透過 os.homedir() 返回絕對路徑

### 2.命令產生的策略/適配器模式

**決定**：使用特定於工具的適配器建立通用命令產生。

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CommandContent                              │
│  (tool-agnostic: id, name, description, category, tags, body)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   generateCommand(content, adapter)              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Claude  │   │  Cursor  │   │ Windsurf │
        │ Adapter  │   │ Adapter  │   │ Adapter  │
        └──────────┘   └──────────┘   └──────────┘
```

**接口：**

```typescript
// Tool-agnostic command data
interface CommandContent {
  id: string;           // e.g., 'explore', 'new', 'apply'
  name: string;         // e.g., 'OpenSpec Explore'
  description: string;  // e.g., 'Enter explore mode...'
  category: string;     // e.g., 'OpenSpec'
  tags: string[];       // e.g., ['openspec', 'explore']
  body: string;         // The command instructions
}

// Per-tool formatting strategy
interface ToolCommandAdapter {
  toolId: string;
  getFilePath(commandId: string): string;
  formatFile(content: CommandContent): string;
}
```

**理由**：
- 將「生成什麼」與「如何格式化」分開
- 每個工具的 frontmatter 怪癖都封裝在其適配器中
- 透過實現適配器介面輕鬆新增工具
- 所有工具共享的正文內容

**考慮的替代方案**：擴展現有的 SlashCommandConfigurator
- 被拒絕：與舊的 3 個命令緊密耦合，需要重大重構

### 3.適配器註冊表模式

**決定**：建立 `CommandAdapterRegistry` 與現有的相似 `SlashCommandRegistry`.

```typescript
class CommandAdapterRegistry {
  private static adapters: Map<string, ToolCommandAdapter> = new Map();

  static get(toolId: string): ToolCommandAdapter | undefined;
  static getAll(): ToolCommandAdapter[];
}
```

**理由**：
- 與現有程式碼庫模式一致
- 透過工具 ID 輕鬆找到
- 集中註冊

### 4. 所需工具標誌

**決定**：需要 `--tool` flag - 如果省略則出錯。

**理由**：
- 明確的工具選擇避免假設
- 符合不提供預設值的項目約定
- 使用者必須有意識地選擇自己的目標工具

## 風險/權衡

**[風險]適配器維護負擔** → 每個新工具都需要一個適配器。透過簡單的介面來緩解 - 大多數適配器大約有 20 條線。

**[風險] Frontmatter 格式漂移** → 工具可能會改變其格式。透過將格式封裝在適配器中來緩解 - 單一位置更新。

**[權衡] 兩個命令系統** → 舊的 SlashCommandConfigurator 和新的 CommandAdapterRegistry 共存。目前可以接受 - 如果需要的話可以稍後統一。

**[權衡] SkillsDir 可選** → 沒有設定 SkillsDir 的工具將會出錯。可接受 - 我們在測試工具時新增路徑。

## 實施方式

1. 添加 `skillsDir` 到 `AIToolOption` 並填滿已知工具
2. 創造 `CommandContent` 和 `ToolCommandAdapter` 介面
3. 為 Claude、Cursor、Windsurf 實作適配器（從 3 開始）
4. 創造 `CommandAdapterRegistry`
5. 創造 `generateCommand()` 功能
6. 更新 `artifact-experimental-setup` 使用新系統
7. 添加 `--tool` 帶有驗證的標誌
