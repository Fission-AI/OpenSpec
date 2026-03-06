# 設計：專案設定

## 情境

OpenSpec 目前有固定的架構解析順序：
1. `--schema` CLI 標誌
2. `.openspec.yaml` 在更改目錄中
3. 硬編碼預設值： `"spec-driven"`

這迫使想要專案級自訂的使用者分叉整個架構，即使是簡單的添加，例如注入技術堆疊上下文或添加特定於工件的規則。

該提案介紹了 `openspec/config.yaml` 作為位於預設模式和完全分叉之間的輕量級自訂層。它允許團隊：
- 設定預設架構
- 將專案上下文注入所有工件
- 新增每個工件的規則

**限制：**
- 不得破壞缺少設定的現有更改
- 必須保持「設定」（本）和「分叉」（專案本地模式）之間的清晰分離
- 設定僅是專案層級（無全域/使用者層級設定）

**主要利害關係人：**
- OpenSpec 需要輕度客製化而不分叉的用戶
- 團隊透過提交的設定共享工作流程約定

## 目標/非目標

**目標：**
- 載入和解析 `openspec/config.yaml` 使用 Zod 模式
- 使用設定的 `schema` 模式解析中的預設字段
- 注入 `context` 進入所有工件指令
- 注入 `rules` 僅符合工件指令
- 優雅地處理遺失或無效的設定（回退到預設值）

**非目標：**
- 架構的結構性變更（`skip`, `add`，繼承） - 屬於分叉路徑
- 上下文的文件參考（`context: ./file.md`) - 以字串開頭
- 全域用戶級設定（XDG 目錄等）
- 設定管理命令（`openspec config init`) - 現在手動建立
- 從舊設定遷移（沒有可遷移的現有設定）

## 決定

### 1. 設定檔格式：YAML vs JSON

**決定：** 使用YAML (`.yaml` 延伸、支援 `.yml` 別名）

**理由：**
- YAML 自然支援多行字串（`context: |`)
- 文件較多的內容更具可讀性
- 符合 `.openspec.yaml` 用於變更
- 易於解析現有的 `yaml` 圖書館

**考慮的替代方案：**
- JSON：較嚴格，但多行字串使用者體驗較差
- TOML：大多數使用者不太熟悉

### 2.設定位置：專案根 vs openspec/ 目錄

**決定：** `./openspec/config.yaml` （在 openspec 目錄中）

**理由：**
- 與同處一處 `openspec/schemas/` （專案本地模式）
- 保持項目根目錄乾淨
- OpenSpec 設定的自然命名空間
- 其他工具使用的鏡像結構（例如， `.github/`)

**考慮的替代方案：**
- `./openspec.config.yaml` in root：污染 root，所有權不太明確
- XDG 設定目錄：超出範圍，還沒有全域設定

### 3. 上下文注入：XML 標籤與 Markdown 部分

**決定：** 使用 XML 樣式標籤 `<context>` 和 `<rules>`

**理由：**
- 清除不與Markdown衝突的分隔符
- 代理可以輕鬆解析結構
- 匹配程式碼庫中特殊部分的現有模式

**範例：**
```xml
<context>
Tech stack: TypeScript, React
</context>

<rules>
- Include rollback plan
</rules>

<template>
## Summary
...
</template>
```

**考慮的替代方案：**
- Markdown 標頭：與範本內容衝突
- 評論：對代理商來說不太可見

### 4. 模式解析：插入位置

**決定：** 設定 `schema` 欄位位於更改元資料和硬編碼預設值之間

**新決議順序：**
1. `--schema` CLI 標誌（明確覆蓋）
2. `.openspec.yaml` 在更改目錄中（特定於更改的綁定）
3. **`openspec/config.yaml` 架構欄位**（新 - 專案預設值）
4. `"spec-driven"` （硬編碼後備）

**理由：**
- 保留 CLI 和更改等級覆蓋（最具體的勝利）
- 使設定充當“項目預設值”
- 向後相容（沒有與現有設定衝突）

### 5. 規則驗證：嚴格與寬鬆

**決定：** 對未知工件 ID 發出警告，不要出錯

**理由：**
- 面向未來：如果模式增加了新的工件，舊的設定不會被破壞
- 開發經驗：打字錯誤會顯示警告，但不會停止工作流程
- 使用者可以逐步修復

**範例：**
```yaml
rules:
  proposal: [...]
  testplan: [...]  # Schema doesn't have this artifact → WARN, not ERROR
```

### 6. 錯誤處理：設定解析失敗

**決定：** 記錄警告並回退到預設值（不要停止命令）

**理由：**
- 設定中的語法錯誤不應破壞所有 OpenSpec
- 使用者可以增量修復設定
- 命令在設定開發期間仍然可用

**警告訊息：**
```
⚠️  Failed to parse openspec/config.yaml: [error details]
    Falling back to default schema (spec-driven)
```

## 實施計劃

### 第一階段：核心類型和負載

**文件： `src/core/project-config.ts` （新的）**

```typescript
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { findProjectRoot } from '../utils/path-utils';

/**
 * Zod schema for project configuration.
 *
 * Purpose:
 * 1. Documentation - clearly defines the config file structure
 * 2. Type safety - TypeScript infers ProjectConfig type from schema
 * 3. Runtime validation - uses safeParse() for resilient field-by-field validation
 *
 * Why Zod over manual validation:
 * - Helps understand OpenSpec's data interfaces at a glance
 * - Single source of truth for type and validation
 * - Consistent with other OpenSpec schemas
 */
export const ProjectConfigSchema = z.object({
  schema: z.string().min(1).describe('The workflow schema to use (e.g., "spec-driven", "tdd")'),
  context: z.string().optional().describe('Project context injected into all artifact instructions'),
  rules: z.record(
    z.string(),
    z.array(z.string())
  ).optional().describe('Per-artifact rules, keyed by artifact ID'),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

const MAX_CONTEXT_SIZE = 50 * 1024; // 50KB hard limit

/**
 * Read and parse openspec/config.yaml from project root.
 * Uses resilient parsing - validates each field independently using Zod safeParse.
 * Returns null if file doesn't exist.
 * Returns partial config if some fields are invalid (with warnings).
 */
export function readProjectConfig(): ProjectConfig | null {
  const projectRoot = findProjectRoot();

  // Try both .yaml and .yml, prefer .yaml
  let configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (!existsSync(configPath)) {
    configPath = path.join(projectRoot, 'openspec', 'config.yml');
    if (!existsSync(configPath)) {
      return null; // No config is OK
    }
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const raw = parseYaml(content);

    if (!raw || typeof raw !== 'object') {
      console.warn(`⚠️  openspec/config.yaml is not a valid YAML object`);
      return null;
    }

    const config: Partial<ProjectConfig> = {};

    // Parse schema field using Zod
    const schemaField = z.string().min(1);
    const schemaResult = schemaField.safeParse(raw.schema);
    if (schemaResult.success) {
      config.schema = schemaResult.data;
    } else if (raw.schema !== undefined) {
      console.warn(`⚠️  Invalid 'schema' field in config (must be non-empty string)`);
    }

    // Parse context field with size limit
    if (raw.context !== undefined) {
      const contextField = z.string();
      const contextResult = contextField.safeParse(raw.context);

      if (contextResult.success) {
        const contextSize = Buffer.byteLength(contextResult.data, 'utf-8');
        if (contextSize > MAX_CONTEXT_SIZE) {
          console.warn(
            `⚠️  Context too large (${(contextSize / 1024).toFixed(1)}KB, limit: ${MAX_CONTEXT_SIZE / 1024}KB)`
          );
          console.warn(`   Ignoring context field`);
        } else {
          config.context = contextResult.data;
        }
      } else {
        console.warn(`⚠️  Invalid 'context' field in config (must be string)`);
      }
    }

    // Parse rules field using Zod
    if (raw.rules !== undefined) {
      const rulesField = z.record(z.string(), z.array(z.string()));

      // First check if it's an object structure
      if (typeof raw.rules === 'object' && !Array.isArray(raw.rules)) {
        const parsedRules: Record<string, string[]> = {};
        let hasValidRules = false;

        for (const [artifactId, rules] of Object.entries(raw.rules)) {
          const rulesArrayResult = z.array(z.string()).safeParse(rules);

          if (rulesArrayResult.success) {
            // Filter out empty strings
            const validRules = rulesArrayResult.data.filter(r => r.length > 0);
            if (validRules.length > 0) {
              parsedRules[artifactId] = validRules;
              hasValidRules = true;
            }
            if (validRules.length < rulesArrayResult.data.length) {
              console.warn(
                `⚠️  Some rules for '${artifactId}' are empty strings, ignoring them`
              );
            }
          } else {
            console.warn(
              `⚠️  Rules for '${artifactId}' must be an array of strings, ignoring this artifact's rules`
            );
          }
        }

        if (hasValidRules) {
          config.rules = parsedRules;
        }
      } else {
        console.warn(`⚠️  Invalid 'rules' field in config (must be object)`);
      }
    }

    // Return partial config even if some fields failed
    return Object.keys(config).length > 0 ? (config as ProjectConfig) : null;

  } catch (error) {
    console.warn(`⚠️  Failed to parse openspec/config.yaml:`, error);
    return null;
  }
}

/**
 * Validate artifact IDs in rules against a schema's artifacts.
 * Called during instruction loading (when schema is known).
 * Returns warnings for unknown artifact IDs.
 */
export function validateConfigRules(
  rules: Record<string, string[]>,
  validArtifactIds: Set<string>,
  schemaName: string
): string[] {
  const warnings: string[] = [];

  for (const artifactId of Object.keys(rules)) {
    if (!validArtifactIds.has(artifactId)) {
      const validIds = Array.from(validArtifactIds).sort().join(', ');
      warnings.push(
        `Unknown artifact ID in rules: "${artifactId}". ` +
        `Valid IDs for schema "${schemaName}": ${validIds}`
      );
    }
  }

  return warnings;
}

/**
 * Suggest valid schema names when user provides invalid schema.
 * Uses fuzzy matching to find similar names.
 */
export function suggestSchemas(
  invalidSchemaName: string,
  availableSchemas: { name: string; isBuiltIn: boolean }[]
): string {
  // Simple fuzzy match: Levenshtein distance
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // Find closest matches (distance <= 3)
  const suggestions = availableSchemas
    .map(s => ({ ...s, distance: levenshtein(invalidSchemaName, s.name) }))
    .filter(s => s.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const builtIn = availableSchemas.filter(s => s.isBuiltIn).map(s => s.name);
  const projectLocal = availableSchemas.filter(s => !s.isBuiltIn).map(s => s.name);

  let message = `❌ Schema '${invalidSchemaName}' not found in openspec/config.yaml\n\n`;

  if (suggestions.length > 0) {
    message += `Did you mean one of these?\n`;
    suggestions.forEach(s => {
      const type = s.isBuiltIn ? 'built-in' : 'project-local';
      message += `  - ${s.name} (${type})\n`;
    });
    message += '\n';
  }

  message += `Available schemas:\n`;
  if (builtIn.length > 0) {
    message += `  Built-in: ${builtIn.join(', ')}\n`;
  }
  if (projectLocal.length > 0) {
    message += `  Project-local: ${projectLocal.join(', ')}\n`;
  } else {
    message += `  Project-local: (none found)\n`;
  }

  message += `\nFix: Edit openspec/config.yaml and change 'schema: ${invalidSchemaName}' to a valid schema name`;

  return message;
}
```

### 第 2 階段：模式解析

**文件： `src/utils/change-metadata.ts`**

更新 `resolveSchemaForChange()` 檢查設定：

```typescript
export function resolveSchemaForChange(
  changeName: string,
  cliSchema?: string
): string {
  // 1. CLI flag wins
  if (cliSchema) {
    return cliSchema;
  }

  // 2. Change metadata (.openspec.yaml)
  const metadata = readChangeMetadata(changeName);
  if (metadata?.schema) {
    return metadata.schema;
  }

  // 3. Project config (NEW)
  const projectConfig = readProjectConfig();
  if (projectConfig?.schema) {
    return projectConfig.schema;
  }

  // 4. Hardcoded default
  return 'spec-driven';
}
```

**文件： `src/utils/change-utils.ts`**

更新 `createNewChange()` 使用設定模式：

```typescript
export function createNewChange(
  changeName: string,
  schema?: string
): void {
  // Use schema from config if not specified
  const resolvedSchema = schema ?? readProjectConfig()?.schema ?? 'spec-driven';

  // ... rest of change creation logic
}
```

### 第 3 階段：指令注入與驗證

**文件： `src/core/artifact-graph/instruction-loader.ts`**

更新 `loadInstructions()` 注入上下文、規則並驗證工件 ID：

```typescript
// Session-level cache for validation warnings (avoid repeating same warnings)
const shownWarnings = new Set<string>();

export function loadInstructions(
  changeName: string,
  artifactId: string
): InstructionOutput {
  const projectConfig = readProjectConfig();

  // Load base instructions from schema
  const baseInstructions = loadSchemaInstructions(changeName, artifactId);
  const schema = getSchemaForChange(changeName); // Assumes we have schema loaded

  // Validate rules artifact IDs (only once per session)
  if (projectConfig?.rules) {
    const validArtifactIds = new Set(schema.artifacts.map(a => a.id));
    const warnings = validateConfigRules(
      projectConfig.rules,
      validArtifactIds,
      schema.name
    );

    // Show each unique warning only once per session
    for (const warning of warnings) {
      if (!shownWarnings.has(warning)) {
        console.warn(`⚠️  ${warning}`);
        shownWarnings.add(warning);
      }
    }
  }

  // Build enriched instruction with XML sections
  let enrichedInstruction = '';

  // Add context (all artifacts)
  if (projectConfig?.context) {
    enrichedInstruction += `<context>\n${projectConfig.context}\n</context>\n\n`;
  }

  // Add rules (only for matching artifact)
  const rulesForArtifact = projectConfig?.rules?.[artifactId];
  if (rulesForArtifact && rulesForArtifact.length > 0) {
    enrichedInstruction += `<rules>\n`;
    for (const rule of rulesForArtifact) {
      enrichedInstruction += `- ${rule}\n`;
    }
    enrichedInstruction += `</rules>\n\n`;
  }

  // Add original template
  enrichedInstruction += `<template>\n${baseInstructions.template}\n</template>`;

  return {
    ...baseInstructions,
    instruction: enrichedInstruction,
  };
}
```

**關於驗證時間的注意事項：** 規則在指令載入期間（而不是在設定載入時）延遲驗證，因為：
1. 設定載入時架構未知（循環依賴）
2. 當使用者實際使用該功能時顯示警告（更好的使用者體驗）
3. 每個會話緩存驗證警告以避免垃圾郵件

### 第 4 階段：效能與快取

**為什麼設定被多次讀取：**

```typescript
// Example: "openspec instructions proposal --change my-feature"

// 1. Schema resolution (to know which schema to use)
resolveSchemaForChange('my-feature')
  → readProjectConfig()  // Read #1

// 2. Instruction loading (to inject context and rules)
loadInstructions('my-feature', 'proposal')
  → readProjectConfig()  // Read #2

// Result: Config read twice per command
// More complex commands may read 3-5 times
```

**績效策略：**

V1 方法：無緩存，每次都讀取新鮮設定
- 更簡單的實施
- 沒有緩存失效的複雜性
- Acceptable if config reads are fast enough

**基準目標：**
- 典型設定（1KB 上下文，5 個工件規則）：每次讀取 **< 10ms**（即使 5 倍也難以察覺）
- 大型設定（50KB 上下文限制）：每次讀取 **< 50ms**（極少數情況下可接受）

**如果基準測試失敗：** 新增簡單的快取：

```typescript
// Simple in-memory cache with no invalidation
let cachedConfig: { mtime: number; config: ProjectConfig | null } | null = null;

export function readProjectConfig(): ProjectConfig | null {
  const projectRoot = findProjectRoot();
  const configPath = path.join(projectRoot, 'openspec', 'config.yaml');

  if (!existsSync(configPath)) {
    return null;
  }

  const stats = statSync(configPath);
  const mtime = stats.mtimeMs;

  // Return cached config if file hasn't changed
  if (cachedConfig && cachedConfig.mtime === mtime) {
    return cachedConfig.config;
  }

  // Read and parse config
  const config = parseConfigFile(configPath); // Extracted logic

  // Cache result
  cachedConfig = { mtime, config };
  return config;
}
```

**效能測試任務：** 新增到第6階段（測試）
- 測量典型設定讀取時間（1KB 上下文）
- 測量大型設定讀取時間（50KB 上下文限制）
- 測量單一命令內的重複讀取
- 記錄結果，僅在需要時新增快取

## 資料流

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  User runs: openspec instructions proposal --change foo     │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  resolveSchemaForChange("foo")                               │
│                                                              │
│  1. Check CLI flag ✗                                         │
│  2. Check .openspec.yaml ✗                                   │
│  3. Check openspec/config.yaml ✓ → "spec-driven"             │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  loadInstructions("foo", "proposal")                         │
│                                                              │
│  1. Load spec-driven/artifacts/proposal.yaml                 │
│  2. Read openspec/config.yaml                                │
│  3. Build enriched instruction:                              │
│     - <context>...</context>                                 │
│     - <rules>...</rules>  (if rules.proposal exists)         │
│     - <template>...</template>                               │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Return InstructionOutput with enriched content              │
│                                                              │
│  Agent sees project context + rules + schema template        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 風險/權衡

**[風險]** 設定拼字錯誤被默默忽略（例如，規則中的工件 ID 錯誤）
→ **緩解：** 在設定載入期間驗證未知工件 ID 並發出警告。不要出錯以允許向前相容。

**[風險]** 情境變得太大，污染所有工件指令
→ **緩解措施：** 文件建議大小（< 500 個字元）。如果這成為問題，請稍後添加每個工件上下文覆蓋。

**[風險]** YAML 解析錯誤會破壞 OpenSpec 指令
→ **緩解：** 捕捉解析錯誤，記錄警告，回退到預設值。命令仍然有效。

**[風險]** 跨指令的設定快取不正確
→ **緩解措施：** 讀取每個版本的最新設定 `readProjectConfig()` 稱呼。 v1 沒有快取層（簡單性高於效能）。

**[權衡]** 上下文被注入到所有工件中
→ **好處：** 整個工作流程中一致的專案知識
→ **成本：** 無法將上下文範圍限製到特定工件（還）
→ **未來：** 添加 `context: { global: "...", proposal: "..." }` 如果需要的話

**[權衡]** 規則使用工件 ID，而不是人名
→ **好處：** 穩定的識別碼（ID 不會改變）
→ **成本：** 使用者需要從模式中瞭解工件 ID
→ **緩解：** 記錄常見工件 ID，顯示在 `openspec status` 輸出

## 遷移計劃

**無需遷移** - 這是一項沒有現有狀態的新功能。

**推出步驟：**
1. 在功能標誌後面載入設定進行部署（可選，為了安全）
2. 使用內部專案進行測試（此儲存庫）
3. README 中的文件及範例
4. 刪除功能標誌（如果使用）

**回滾策略：**
- 設定僅是附加的（不會破壞現有的變更）
- 如果發現錯誤，可以使用 env var 停用設定解析
- 使用者可以刪除設定檔以恢復舊行為

## 開放式問題

**問：上下文是否應該支援文件引用（`context: ./CONTEXT.md`)?**
**A（延遲）：** 僅從字串開始。如果使用者請求，稍後新增文件引用。保持 v1 的簡單。

**問：我們該支援嗎 `.yml` 別名除了 `.yaml`?**
**A：** 是的，檢查兩個擴充。更喜歡 `.yaml` 在文件中，但接受 `.yml` 適合喜歡它的用戶。

**問：如果設定的架構欄位引用不存在的架構怎麼辦？ **
**答：** 架構解析將在下游失敗。嘗試載入架構時顯示錯誤，建議有效的架構名稱。

**問：是否應該根據已解析模式的工件 ID 來驗證規則？ **
**答：** 是的，驗證並警告，但不要停止。如果架構發生變化，這可以實現向前相容性。
