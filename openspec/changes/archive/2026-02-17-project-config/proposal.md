# 專案設定

## 概括

添加 `openspec/config.yaml` 支援專案級設定。這使團隊能夠透過提供注入到工件生成中的上下文和規則來自訂 OpenSpec 行為，而無需分叉架構。

## 動機

目前，自訂 OpenSpec 需要分叉整個架構：
- 即使新增一條規則也必須複製所有文件
- openspec 升級時遺失更新
- 高摩擦力，可進行簡單定制

大多數使用者不需要不同的工作流程結構。他們需要：
- 提供專案背景（技術堆疊、約定、約束）
- 新增特定工件的規則（需求、格式首選項）

## 設計決策

### 雙路徑模型

OpenSpec 客製化遵循兩條不同的路徑：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CONFIGURE (this change)         FORK (project-local-schemas)  │
│   ─────────────────────           ────────────────────────────  │
│                                                                 │
│   Use a preset schema             Define your own schema        │
│   + add context                   from scratch                  │
│   + add rules                                                   │
│                                                                 │
│   openspec/config.yaml            openspec/schemas/my-flow/     │
│                                                                 │
│   ✓ Simple                        ✓ Full control                │
│   ✓ Get updates                   ✗ You maintain everything     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 設定模式

```yaml
# openspec/config.yaml

# Required: which workflow schema to use
schema: spec-driven

# Optional: project context injected into all artifact prompts
context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful, documented in docs/api-conventions.md
  Testing: Jest + React Testing Library
  We value backwards compatibility for all public APIs

# Optional: per-artifact rules (additive)
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams and notify in #platform-changes
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
  tasks:
    - Each task should be completable in < 2 hours
    - Include acceptance criteria
```

### 設定中沒有什麼

為了保持模型簡單，明確排除了以下內容：

| 特徵 | 決定 | 基本原理 |
|---------|----------|-----------|
| `skip: [artifact]` | 不支援 | 結構性變化屬於岔路 |
| `add: [{...}]` | 不支援 | 結構性變化屬於岔路 |
| `extends: base` | 不支援 | 沒有繼承，fork 是完整副本 |
| `context: ./file.md` | 不支援（尚） | 從字串開始，如果需要，稍後新增文件引用 |

### 欄位定義

#### `schema` （必需的）

使用哪種工作流程架構。可以是：
- 內建名稱： `spec-driven`, `tdd`
- 專案本地架構名稱： `my-workflow` （需要專案本地模式變更）

這成為以下內容的預設架構：
- 沒有建立的新更改 `--schema` 旗幟
- 命令在更改時執行，無需 `.openspec.yaml` 元資料

#### `context` （選修的）

包含項目上下文的字串。注入所有工件提示中。

使用案例：
- 技術堆疊描述
- 連結到約定/風格指南
- 團隊限製或偏好
- 特定領域的上下文

#### `rules` （選修的）

每個工件的規則，由工件 ID 鍵入。模式內建指導的補充。

```yaml
rules:
  <artifact-id>:
    - Rule 1
    - Rule 2
```

規則被注入到特定工件的提示中，而不是所有提示中。

### 注射形式

為工件產生指令時：

```xml
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api-conventions.md
...
</context>

<rules>
- Include rollback plan
- Identify affected teams and notify in #platform-changes
</rules>

<template>
[Schema's built-in template content]
</template>
```

所有工件都會出現上下文。規則僅針對符合的工件出現。

### 設定建立策略

**為什麼要集成 `artifact-experimental-setup`?**

此功能針對**實驗工作流程使用者**。在實驗設定期間建立設定（而不是提供獨立命令）的決定是有意的：

**理由：**
1. **單一入口點** - 設定實驗功能的使用者已處於“設定模式”
2. **上下文計時** - 設定工作流程時自然設定項目預設值
3. **避免過早的 API 表面** - 無獨立 `openspec config init` 直到特色畢業
4. **實驗範圍** - 將設定保留為實驗功能，不穩定API
5. **漸進式揭露** - 使用者可以根據需要跳過並稍後手動建立

**進化路徑：**

```
Today (Experimental):
  openspec artifact-experimental-setup
    → prompts for config creation
    → creates .claude/skills/
    → creates openspec/config.yaml

Future (When graduating):
  openspec init
    → prompts for config creation
    → creates openspec/ directory
    → creates openspec/config.yaml

  + standalone commands:
    openspec config init
    openspec config validate
    openspec config set <key> <value>
```

**為什麼是可選的？ **

設定是**附加**，不是必要的：
- OpenSpec 無需設定即可運作（使用預設值）
- 用戶可以在設定過程中跳過並稍後手動新增
- 團隊可以從簡單的開始，並在感到摩擦時添加設定
- git 中沒有設定檔=沒問題，每個人都得到預設值

**設計原則：**系統從不*需要*設定，但在使用者需要自訂時可以輕鬆建立。

## 範圍

### 範圍內

**核心設定系統：**
- 定義 `ProjectConfig` 使用 Zod 模式輸入
- 添加 `readProjectConfig()` 具有優雅錯誤處理功能的函數
- 更新指令產生以注入上下文（所有工件）
- 更新指令產生以注入規則（每個工件）
- 更新架構解析以使用設定 `schema` 欄位設為預設值
- 更新 `openspec new change` 使用設定的模式作為預設值

**設定建立（實驗設定）：**
- 延長 `artifact-experimental-setup` 選擇性地建立設定的命令
- 模式選擇的互動式提示（帶有每個模式的描述）
- 項目上下文的互動式提示（可選多行輸入）
- 每個工件規則的互動式提示（可選）
- 建立後立即驗證設定
- 為稍後想要手動建立設定的使用者顯示清晰的「跳過」選項
- 顯示建立的設定位置和使用範例

### 超出範圍

- `skip` / `add` 用於結構變化（使用分叉路徑進行結構變化）
- 上下文的文件參考（`context: ./CONTEXT.md`) - 以字串開頭，如果需要稍後添加
- 全域用戶級設定（XDG目錄等）
- 與標準集成 `openspec init` （實驗畢業生時會添加）
- 獨立式 `openspec config init` 命令（可能會在將來的更改中添加）
- `openspec config validate` 命令（可能會在將來的更改中添加）
- 設定編輯/更新命令（用戶直接編輯YAML）

## 使用者體驗

### 設定設定（實驗工作流程）

當使用者設定實驗工作流程時，系統會提示他們選擇建立設定：

```bash
$ openspec artifact-experimental-setup

Setting up experimental artifact workflow...

✓ Created .claude/skills/openspec-explore/SKILL.md
✓ Created .claude/skills/openspec-new-change/SKILL.md
✓ Created .claude/skills/openspec-continue-change/SKILL.md
✓ Created .claude/skills/openspec-apply-change/SKILL.md
✓ Created .claude/skills/openspec-ff-change/SKILL.md
✓ Created .claude/skills/openspec-sync-specs/SKILL.md
✓ Created .claude/skills/openspec-archive-change/SKILL.md

✓ Created .claude/commands/opsx/explore.md
✓ Created .claude/commands/opsx/new.md
✓ Created .claude/commands/opsx/continue.md
✓ Created .claude/commands/opsx/apply.md
✓ Created .claude/commands/opsx/ff.md
✓ Created .claude/commands/opsx/sync.md
✓ Created .claude/commands/opsx/archive.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Configuration (Optional)

Configure project defaults for OpenSpec workflows.

? Create openspec/config.yaml? (Y/n) Y

? Default schema for new changes?
  ❯ spec-driven (proposal → specs → design → tasks)
    tdd (spec → tests → implementation → docs)

? Add project context? (optional)
  Context is shown to AI when creating artifacts.
  Examples: tech stack, conventions, style guides, domain knowledge

  Press Enter to skip, or type/paste context:
  │ Tech stack: TypeScript, React, Node.js, PostgreSQL
  │ API style: RESTful, documented in docs/api-conventions.md
  │ Testing: Jest + React Testing Library
  │ We value backwards compatibility for all public APIs
  │
  [Press Enter when done]

? Add per-artifact rules? (optional) (Y/n) Y

  Which artifacts should have custom rules?
  [Space to select, Enter when done]
  ◯ proposal
  ◉ specs
  ◯ design
  ◯ tasks

? Rules for specs artifact:
  Enter rules one per line, press Enter on empty line to finish:
  │ Use Given/When/Then format for scenarios
  │ Reference existing patterns before inventing new ones
  │
  [Empty line to finish]

✓ Created openspec/config.yaml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Setup Complete!

📖 Config created at: openspec/config.yaml
   • Default schema: spec-driven
   • Project context: Added (4 lines)
   • Rules: 1 artifact configured

Usage:
  • New changes automatically use 'spec-driven' schema
  • Context injected into all artifact instructions
  • Rules applied to matching artifacts

To share with team:
  git add openspec/config.yaml .claude/
  git commit -m "Setup OpenSpec experimental workflow with project config"

[Rest of experimental setup output...]
```

**關鍵的使用者體驗決策：**

1. **安裝過程中提示** - 自然的地方，因為使用者已經在設定實驗性功能
2. **每一步可選** - 清除跳過選項，無強製設定
3. **引導提示** - 模式描述、範例上下文、工件選擇
4. **立即驗證** - 設定在建立後進行驗證，錯誤立即顯示
5. **清晰的輸出** - 準確顯示建立的內容以及它如何影響工作流程

### 設定設定（手動建立）

使用者也可以手動建立設定（或在設定過程中跳過並稍後新增）：

```bash
# Create config file manually
cat > openspec/config.yaml << 'EOF'
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js
  We follow REST conventions documented in docs/api.md
  All changes require backwards compatibility consideration

rules:
  proposal:
    - Must include rollback plan
    - Must identify affected teams
  specs:
    - Use Given/When/Then format
EOF
```

### 對工作流程的影響

建立設定後，它會透過三種方式影響實驗工作流程：

**1.預設架構選擇**

```bash
# Before config: must specify schema
/opsx:new my-feature --schema spec-driven

# After config (with schema: spec-driven): schema is automatic
/opsx:new my-feature
# Automatically uses spec-driven from config

# Override still works
/opsx:new my-feature --schema tdd
# Uses tdd, ignoring config
```

**2.上下文注入（所有工件）**

```bash
# Get instructions for any artifact
openspec instructions proposal --change my-feature

# Output now includes project context:
<context>
Tech stack: TypeScript, React, Node.js, PostgreSQL
API style: RESTful, documented in docs/api-conventions.md
Testing: Jest + React Testing Library
We value backwards compatibility for all public APIs
</context>

<template>
[Schema's proposal template]
</template>
```

上下文出現在**所有工件**（提案、規格、設計、任務）的說明中。

**3.規則注入（每個工件）**

```bash
# Get instructions for artifact with rules configured
openspec instructions specs --change my-feature

# Output includes artifact-specific rules:
<context>
[Project context]
</context>

<rules>
- Use Given/When/Then format for scenarios
- Reference existing patterns before inventing new ones
</rules>

<template>
[Schema's specs template]
</template>
```

規則僅針對其設定的**特定工件**顯示。

**沒有規則的工件**（例如設計、任務）不會得到 `<rules>` 部分：

```bash
openspec instructions design --change my-feature
# Output: <context> then <template> only (no rules)
```

### 團隊分享

```bash
# Commit config
git add openspec/config.yaml
git commit -m "Add project config with context and rules"

# Everyone gets the same context and rules automatically
```

## 實施說明

### 要修改/建立的文件

| 文件 | 變化 |
|------|---------|
| `src/core/project-config.ts` | **新檔案：** 類型、解析、讀取、驗證助手 |
| `src/core/artifact-graph/instruction-loader.ts` | 注入上下文（所有工件）和規則（每個工件） |
| `src/utils/change-utils.ts` | 使用設定模式作為預設值 `createChange()` |
| `src/utils/change-metadata.ts` | 更新 `resolveSchemaForChange()` 檢查設定 |
| `src/commands/artifact-workflow.ts` | 延長 `artifactExperimentalSetupCommand()` 提示建立設定 |
| `src/core/config-prompts.ts` | **新檔案：** 設定建立的互動式提示（可重複使用） |

### 設定位置

始終在 `./openspec/config.yaml` 相對於專案根目錄。為了簡單起見，沒有 XDG/全域設定。

### 決議訂單更新

模式選擇順序變成：

```
1. --schema CLI flag                    # Explicit override
2. .openspec.yaml in change directory   # Change-specific binding
3. openspec/config.yaml schema field    # Project default (NEW)
4. "spec-driven"                        # Hardcoded fallback
```

### 驗證

- `schema` 必須是有效的架構名稱（存在於解析中）
- `context` 必須是字串
- `rules` 必須是帶有字串鍵（工件 ID）和陣列值的對象
- 中的未知工件 ID `rules` 應該警告，而不是錯誤（允許向前兼容）

### 實驗設定集成

**更改為 `artifactExperimentalSetupCommand()` 在 `src/commands/artifact-workflow.ts`:**

建立技能和命令後，設定命令將：

1. **顯示節標題：**
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 Project Configuration (Optional)
   Configure project defaults for OpenSpec workflows.
   ```

2. **提示：创建設定？ **
   - 是/否提示，預設“是”
   - 如果否 → 跳過整個設定部分，顯示使用說明
   - 如果是 → 繼續詳細提示

3. **提示：架構選擇**
   - 使用 `listSchemasWithInfo()` 取得可用的模式
   - 顯示每個內容的描述和工件流程
   - 預設為第一個模式（可能是“規範驅動”）

4. **提示：專案背景**
   - 多行輸入（或編輯器，如果可用）
   - 顯示範例：“技術堆疊、約定、風格指南”
   - 允許為空（跳過）

5. **提示：每個工件的規則**
   - 是/否提示，預設“否”（規則不太常見）
   - 如果是：
     - Show checklist of artifacts from selected schema
     - For each selected artifact, prompt for rules (line-by-line input)
     - Allow empty line to finish each artifact's rules

6. **建立並驗證設定：**
   - 建造 `ProjectConfig` 來自輸入的對象
   - 使用 Zod 架構進行驗證
   - 寫信給 `openspec/config.yaml` 使用 YAML 序列化器
   - 如果驗證失敗，顯示錯誤並要求重試或跳過

7. **顯示成功摘要：**
   - 建立的設定的路徑
   - 摘要：使用的模式、新增的上下文（行數）、規則數
   - 顯示設定如何影響工作流程的用法範例
   - 建議將設定提交到 git

**錯誤處理：**
- 模式選擇無效 → 顯示可用模式以及模糊匹配建議，然後重試
- 上下文太大 (>50KB) → 錯誤拒絕，要求減少大小
- 規則引用無效工件 → 警告但繼續（前向相容）
- 文件寫入失敗→顯示錯誤，建議手動建立
- 設定已存在 → 顯示訊息，跳過設定部分，繼續設定
- 使用者取消 (Ctrl+C) → 記錄“設定建立已取消”，繼續其餘設定（技能/指令已建立）

**如果設定已經存在：**

什麼時候 `openspec/config.yaml` 已經存在：

```bash
$ openspec artifact-experimental-setup

[Skills and commands created...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Configuration

ℹ️  openspec/config.yaml already exists. Skipping config creation.

   To update config, edit openspec/config.yaml manually or:
   1. Delete openspec/config.yaml
   2. Run openspec artifact-experimental-setup again

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Rest of setup output...]
```

這可以防止意外覆蓋使用者的設定。

**實施方式：**

建立單獨的 `src/core/config-prompts.ts` 模組：

```typescript
export interface ConfigPromptResult {
  createConfig: boolean;
  schema?: string;
  context?: string;
  rules?: Record<string, string[]>;
}

export async function promptForConfig(): Promise<ConfigPromptResult> {
  // Prompt logic using inquirer or similar
  // Returns structured result for config creation
  // Throws ExitPromptError on Ctrl+C (handled by caller)
}
```

**設定指令中的 Ctrl+C 處理：**

```typescript
try {
  const configResult = await promptForConfig();
  if (configResult.createConfig) {
    writeConfigFile(configResult);
    console.log('✓ Created openspec/config.yaml');
  }
} catch (error) {
  if (error.name === 'ExitPromptError') {
    console.log('\nℹ️  Config creation cancelled');
    console.log('   Skills and commands already created');
    console.log('   Run setup again to create config later');
    // Continue with rest of setup (not a fatal error)
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

這使得提示可以與設定命令分開重複使用和測試。

### 依賴關係

**互動式提示庫：**

實驗設定指令將需要一個用於設定建立流程的互動式提示庫。選項：

1. **@inquirer/prompts**（推薦）
   - 現代，可搖樹，TypeScript-first
   - 單獨進口： `@inquirer/input`, `@inquirer/confirm`, `@inquirer/checkbox`, `@inquirer/editor`
   - 已在OpenSpec中使用（如果沒有，輕量添加）

2. **詢問者**（經典）
   - 更成熟、更大的生態系統
   - 較重 bun 尺寸
   - 具有所有提示類型的單一套件

**需要提示：**
- `confirm` - “建立設定？” “新增規則？”
- `select` - 帶有描述的模式選擇
- `editor` 或多行 `input` - 專案背景
- `checkbox` - 規則的工件選擇
- `input` （重複） - 規則輸入（逐行）

**替代方案（無依賴性）：**

使用 Node 的內建 `readline` 對於基本提示：
- 更多程式碼需要編寫
- 不太完善的使用者體驗（沒有箭頭鍵導航，核取方塊選擇）
- 零依賴成本

**建議：** 使用 `@inquirer/prompts` 以獲得最佳使用者體驗。設定設定是一項一次性操作，使用者體驗很重要。

### YAML 序列化

設定建立需要 YAML 序列化：

- **yaml** 套件（已經是依賴項）
- 使用 `yaml.stringify()` 寫入設定
- 保留多行字串 `|` 字面風格
- 格式：2 個空格縮進，除非需要，否則不加引號

例子：
```typescript
import { stringify } from 'yaml';

const config = {
  schema: 'spec-driven',
  context: 'Multi-line\ncontext\nhere',
  rules: { proposal: ['Rule 1', 'Rule 2'] }
};

const yamlContent = stringify(config, {
  indent: 2,
  defaultStringType: 'QUOTE_DOUBLE',
  defaultKeyType: 'PLAIN',
});
// context will use | literal style automatically for multi-line
```

## 測試注意事項

**核心設定功能：**
- 使用所有欄位（架構、上下文、規則）建立設定，驗證解析
- 建立最小設定（僅模式），驗證解析
- 驗證所有工件的指令輸出是否出現上下文
- 驗證規則僅針對符合的工件（並非所有工件）顯示
- 驗證設定中的架構是否用於新更改
- 驗證CLI `--schema` 標誌覆蓋設定
- 驗證變更 `.openspec.yaml` 覆蓋設定
- 驗證對遺失設定的妥善處理（回退到預設值）
- 驗證對無效 YAML 語法的優雅處理（警告、後備）
- 驗證對無效模式的優雅處理（警告，顯示有效模式）
- 驗證規則中的未知工件 ID 會發出警告，但不會停止

**架構解析優先權：**
- 測試所有四個層級的模式解析：
  1. CLI 標誌 `--schema` （最高優先權）
  2. 更改元資料 `.openspec.yaml`
  3. 專案設定 `openspec/config.yaml`
  4. 硬編碼預設“規範驅動”（最低優先級）
- 驗證每個級別是否正確覆蓋較低級別

**上下文與規則注入：**
- 驗證上下文注入使用 `<context>` XML 樣式標籤
- 驗證規則注入使用 `<rules>` 帶有項目符號的 XML 樣式標籤
- 驗證注入順序： `<context>` → `<rules>` → `<template>`
- 驗證多行上下文是否已保留
- 驗證上下文/規則中的特殊字元未轉義
- 驗證空上下文/規則不會建立標籤

**實驗設定集成：**
- 測試 `artifact-experimental-setup` 使用者跳過設定建立
- 測試 `artifact-experimental-setup` 使用最少的設定（僅限架構）
- 測試 `artifact-experimental-setup` 具有完整的設定（架構+上下文+規則）
- 從可用模式中測試模式選擇
- 測試多行上下文輸入
- 測試每個工件規則提示
- 測試工件選擇（核取方塊）
- 設定建立期間測試驗證錯誤
- 測試檔案寫入錯誤（權限等）
- 驗證所建立的設定可以被解析 `readProjectConfig()`
- 驗證成功摘要顯示正確的訊息

**邊緣情況：**
- 設定檔存在但為空 → 視為無效，警告
- 設定有 `.yml` 擴展名而不是 `.yaml` → 兩者都接受
- 兩個都 `.yaml` 和 `.yml` 存在 → 更喜歡 `.yaml`
- 上下文包含YAML-重要字元→在輸出中正確轉義
- 規則陣列包含空字串→過濾掉或警告
- 架構引用不存在的架構→建議錯誤
- 子目錄中的設定（不是專案根目錄）→ 找不到，使用預設值

**向後相容性：**
- 沒有設定的現有項目可以繼續工作
- 現有的變化與 `.openspec.yaml` 元資料不受設定影響
- 將設定新增至現有項目不會破壞正在進行的更改

**整合測試：**
- 建立設定 → 建立變更 → 驗證使用的架構
- 建立設定 → 取得說明 → 驗證注入的上下文
- 建立設定 → 取得說明 → 驗證注入的規則
- 更新設定 → 驗證變更立即反映（無快取）
- 執行 `artifact-experimental-setup` → 建立設定 → 建立變更 → 驗證流程

## 相關變更

- **專案本地架構**：啟用 `schema: my-workflow` 引用項目本地模式

## 附錄：完整設定架構

```typescript
import { z } from 'zod';

// Zod schema serves as both runtime validation and documentation
// Type is inferred from schema for type safety
export const ProjectConfigSchema = z.object({
  // Required: which schema to use (e.g., "spec-driven", "tdd", or project-local schema name)
  schema: z.string().min(1).describe('The workflow schema to use (e.g., "spec-driven", "tdd")'),

  // Optional: project context (injected into all artifact instructions)
  // Max size: 50KB (enforced during parsing)
  context: z.string().optional().describe('Project context injected into all artifact instructions'),

  // Optional: per-artifact rules (additive to schema's built-in guidance)
  rules: z.record(
    z.string(),           // artifact ID
    z.array(z.string())   // list of rules
  ).optional().describe('Per-artifact rules, keyed by artifact ID'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// Note: Parsing uses safeParse() on individual fields for resilient error handling
// Invalid fields are warned about but don't prevent other fields from being loaded
```

## 附錄：視覺摘要

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User provides:                                                │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ openspec/config.yaml                                    │   │
│   │                                                         │   │
│   │ schema: spec-driven                                     │   │
│   │ context: "We use React, TypeScript..."                  │   │
│   │ rules:                                                  │   │
│   │   proposal: [...]                                       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ OpenSpec merges:                                        │   │
│   │                                                         │   │
│   │   Schema (spec-driven)                                  │   │
│   │   + User's context                                      │   │
│   │   + User's rules                                        │   │
│   │   ─────────────────────────                             │   │
│   │   = Enriched instructions                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Agent sees (for proposal artifact):                     │   │
│   │                                                         │   │
│   │ <context>                                               │   │
│   │ We use React, TypeScript...                             │   │
│   │ </context>                                              │   │
│   │                                                         │   │
│   │ <rules>                                                 │   │
│   │ - Include rollback plan                                 │   │
│   │ - Identify affected teams                               │   │
│   │ </rules>                                                │   │
│   │                                                         │   │
│   │ <template>                                              │   │
│   │ [Built-in proposal template]                            │   │
│   │ </template>                                             │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
