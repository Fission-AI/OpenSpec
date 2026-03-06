# 殼牌完井設計

## 概述

此設計為 shell 完成建立了一個基於插件的架構，優先考慮乾淨的 TypeScript 模式、可擴展性和可維護性。該系統將特定於 shell 的生成邏輯、動態完成資料提供者和安裝自動化之間的關注點分開。

**範圍：** 此提案僅實現 **Zsh 完成**（Oh My Zsh 優先順序）。該架構旨在支援 bash、fish 和未來提案中的 PowerShell。

## 本機 Shell 完成行為

**設計理念：** 我們與每個 shell 的本機完成系統集成，而不是嘗試自訂或統一行為。這確保了用戶熟悉的用戶體驗並降低了維護複雜性。

**注意：** 雖然下面記錄了所有四種 shell 行為以供架構參考，但**此提案中僅實現了 Zsh。 Bash、Fish 和 PowerShell 已記錄下來以指導未來的實現。

### Bash 完成行為

**互動模式：**
- **單一 TAB：** 如果僅存在一個符合項目則完成，否則不執行任何操作
- **雙TAB（TAB TAB）：**將所有可能的補全顯示為列表
- **輸入更多字元 + TAB:** 縮小匹配範圍並完成或顯示精煉列表

**OpenSpec 整合：**
```bash
# After installing: openspec completion install bash
openspec val<TAB>           # Completes to "openspec validate"
openspec validate <TAB><TAB>  # Shows: --all --changes --specs --strict --json [change-ids] [spec-ids]
openspec show add-<TAB><TAB>  # Shows all changes starting with "add-"
```

**實作：** 使用 bash-completion 框架 `_init_completion`, `compgen`， 和 `COMPREPLY` array.

### Zsh 完成行為（與 Oh My Zsh）

**互動模式：**
- **單一選項卡：**立即顯示包含所有符合項目的互動式選單
- **TAB / 箭頭鍵：** 瀏覽完成選項
- **輸入：** 選擇反白的選項
- **Ctrl+C / Esc:** 取消完成選單

**OpenSpec 整合：**
```zsh
# After installing: openspec completion install zsh
openspec val<TAB>    # Shows menu with "validate" and "view" highlighted
openspec show <TAB>  # Shows menu with all change IDs and spec IDs, categorized
```

**實作：** 使用 Zsh 完成系統 `_arguments`, `_describe`， 和 `compadd` 內建插件。 Oh My Zsh 自動提供增強的選單樣式。

### Fish 完成行為

**互動模式：**
- **鍵入時：** 灰色建議會自動即時顯示
- **向右箭頭 / Ctrl+F:** 接受建議
- **TAB:** 如果存在多個符合項，則顯示包含所有符合項目的選單
- **再按 TAB 鍵：** 循環選擇選項或導覽選單
- **輸入：** 接受目前選擇

**OpenSpec 整合：**
```fish
# After installing: openspec completion install fish
openspec val       # Gray suggestion shows "validate" immediately
openspec show a    # Real-time suggestions for changes starting with "a"
openspec <TAB>     # Shows all commands with descriptions in paged menu
```

**實作：** 使用 Fish 的聲明 `complete -c` 句法。補全內容自動加載自 `~/.config/fish/completions/`.

### PowerShell 完成行為

**互動模式：**
- **TAB：** 一次循環向前完成一個（內聯替換）
- **Shift+TAB:** 向後迴圈補全
- **Ctrl+Space:** 顯示 IntelliSense 樣式選單 (PSReadLine v2.2+)
- **箭頭鍵：** 導覽選單（如果顯示）

**OpenSpec 整合：**
```powershell
# After installing: openspec completion install powershell
openspec val<TAB>       # Cycles: validate → view → validate
openspec show <TAB>     # Cycles through change IDs one by one
openspec <Ctrl+Space>   # Shows IntelliSense menu with all commands
```

**實施：**用途 `Register-ArgumentCompleter` 帶有傳回的自訂腳本區塊 `[System.Management.Automation.CompletionResult]` objects.

### 比較表

| 殼       | 扳機         | 展示風格          | 導航           | 選擇      |
|-------------|-----------------|------------------------|----------------------|----------------|
| Bash        | 選項卡 選項卡         | 清單（列印一次）    | 輸入更多 + TAB      | Auto-complete  |
| Zsh         | TAB             | 互動選單       | TAB/Arrows           | 進入          |
| Fish        | TAB/Auto        | 即時+選單       | TAB/Arrows           | Enter/Right    |
| PowerShell  | TAB             | 直排自行車         | TAB/Shift+TAB        | 停止騎自行車   |

**關鍵見解：** 每個 shell 的完整 UX 都反映了其設計理念。我們尊重這些約定，而不是強迫統一。

## 架構原則

### 1. 基於插件的生成器系統

每個 shell 都有獨特的完成語法和約定。我們沒有建立具有分支邏輯的整體生成器，而是使用插件模式，其中每個 shell 都實作一個公共介面：

```typescript
interface CompletionGenerator {
  generate(): string;
  getInstallPath(): string;
  getConfigFile(): string;
}
```

**好處：**
- 無需修改現有生成器即可新增外殼
- 特定於 Shell 的邏輯是隔離且可測試的
- 類型安全性確保所有生成器實作所需的方法
- 易於維護和理解（每個生成器單一責任）

**實作類別：**
- `ZshCompletionGenerator` - 使用Zsh `_arguments` 和 `_describe` 功能
- `BashCompletionGenerator` - 用途 `_init_completion` 和 `compgen` built-ins
- `FishCompletionGenerator` - 用途 `complete -c` 聲明性語法
- `PowerShellCompletionGenerator` - 用途 `Register-ArgumentCompleter` 小指令

### 2. 集中命令註冊表

Shell 完成必須與實際的 CLI 命令保持同步。為了避免重複和漂移，我們維護單一事實來源：

```typescript
type CommandDefinition = {
  name: string;
  description: string;
  flags: FlagDefinition[];
  acceptsChangeId: boolean;
  acceptsSpecId: boolean;
  subcommands?: CommandDefinition[];
};

const COMMAND_REGISTRY: CommandDefinition[] = [
  {
    name: 'init',
    description: 'Initialize OpenSpec in your project',
    flags: [
      { name: '--tools', description: 'Configure AI tools non-interactively', hasValue: true }
    ],
    acceptsChangeId: false,
    acceptsSpecId: false
  },
  // ... all other commands
];
```

**好處：**
- 所有生成器都使用相同的命令定義
- 新增指令會自動傳播到所有 shell
- 只需在一處進行標誌更改
- 類型安全可防止拼字錯誤和缺失字段
- 更容易測試（模擬註冊表）

**TypeScript 糖：**
- 使用 `const` 只讀註冊表的斷言
- 利用命令類型的可區分聯合
- 使用 `satisfies` 操作員確保註冊表與介面匹配

### 3.動態完成提供者

更改和規範 ID 是特定於項目的，並在執行時發現。一個專門的提供者封裝了這個邏輯：

```typescript
class CompletionProvider {
  private changeCache: { ids: string[]; timestamp: number } | null = null;
  private specCache: { ids: string[]; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 2000;

  async getChangeIds(): Promise<string[]> {
    if (this.changeCache && Date.now() - this.changeCache.timestamp < this.CACHE_TTL_MS) {
      return this.changeCache.ids;
    }

    const ids = await discoverActiveChangeIds();
    this.changeCache = { ids, timestamp: Date.now() };
    return ids;
  }

  async getSpecIds(): Promise<string[]> {
    // Similar caching logic
  }

  isOpenSpecProject(): boolean {
    // Check for openspec/ directory
  }
}
```

**好處：**
- 快取可減少快速製表符完成過程中的檔案系統開銷
- 封裝項目檢測邏輯
- 易於使用模擬檔案系統進行測試
- 所有 shell 生成器共享

**設計決策：**
- 2 秒緩存 TTL 平衡新鮮度與效能
- 快取每個進程（非持久性）以避免跨會話的陳舊資料
- 在 OpenSpec 專案之外時正常降級

### 4. 單獨安裝邏輯

安裝涉及 shell 設定檔操作，這與生成不同。我們將這個問題分開：

```typescript
interface CompletionInstaller {
  install(): Promise<InstallResult>;
  uninstall(): Promise<UninstallResult>;
  isInstalled(): Promise<boolean>;
}
```

**特定於 Shell 的安裝程式：**
- `ZshInstaller` - 處理 Oh My Zsh（自訂完成）和標準 Zsh（fpath）
- `BashInstaller` - 檢測完成目錄和來源 `.bashrc`
- `FishInstaller` - 寫信給 `~/.config/fish/completions/` （自動加載）
- `PowerShellInstaller` - 附加到 PowerShell 設定檔

**好處：**
- 安裝邏輯不會污染產生器程式碼
- 可以測試安裝而不產生完成腳本
- 更容易處理邊緣情況（缺少目錄、權限、已安裝）

### 5. 類型安全的外殼檢測

我們使用 TypeScript 的文字類型和類型保護來進行 shell 偵測：

```typescript
type SupportedShell = 'bash' | 'zsh' | 'fish' | 'powershell';

function detectShell(): SupportedShell {
  const shellPath = process.env.SHELL || '';
  const shellName = path.basename(shellPath).toLowerCase();

  // PowerShell normalization
  if (shellName === 'pwsh' || shellName === 'powershell') {
    return 'powershell';
  }

  const supported: SupportedShell[] = ['bash', 'zsh', 'fish', 'powershell'];
  if (supported.includes(shellName as SupportedShell)) {
    return shellName as SupportedShell;
  }

  throw new Error(`Shell '${shellName}' is not supported. Supported: ${supported.join(', ')}`);
}
```

**好處：**
- 編譯時類型檢查可防止無效的 shell 名稱
- 輕鬆添加新外殼（添加到聯合類型）
- switch 語句中的類型縮小
- 清除不支援的 shell 的錯誤訊息

### 6.工廠模式實例化

工廠函數根據 shell 類型選擇適當的生成器/安裝程式：

```typescript
function createGenerator(shell: SupportedShell, provider: CompletionProvider): CompletionGenerator {
  switch (shell) {
    case 'bash': return new BashCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'zsh': return new ZshCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'fish': return new FishCompletionGenerator(COMMAND_REGISTRY, provider);
    case 'powershell': return new PowerShellCompletionGenerator(COMMAND_REGISTRY, provider);
  }
}
```

**好處：**
- 單點實例化
- 類型安全性確保徹底的切換（如果外殼類型缺失，則出現 TypeScript 錯誤）
- 易於注入依賴項（註冊表、提供者）

## 命令結構

**此提案（僅Zsh）：**
```
openspec completion
├── zsh               # Generate Zsh completion script
├── install [shell]   # Install Zsh completion (auto-detects or explicit zsh)
└── uninstall [shell] # Remove Zsh completion (auto-detects or explicit zsh)
```

**未來（後續提案後）：**
```
openspec completion
├── bash              # Generate Bash completion script (future)
├── zsh               # Generate Zsh completion script (this proposal)
├── fish              # Generate Fish completion script (future)
├── powershell        # Generate PowerShell completion script (future)
├── install [shell]   # Install completion (auto-detects or explicit shell)
└── uninstall [shell] # Remove completion (auto-detects or explicit shell)
```

## 文件組織

**此提案（僅Zsh）：**
```
src/
├── commands/
│   └── completion.ts              # CLI command registration (zsh, install, uninstall)
├── core/
│   └── completions/
│       ├── types.ts               # Interfaces: CompletionGenerator, CommandDefinition, etc.
│       ├── command-registry.ts    # Single source of truth for OpenSpec commands
│       ├── completion-provider.ts # Dynamic change/spec ID discovery with caching
│       ├── factory.ts             # Factory for instantiating Zsh generator/installer
│       ├── generators/
│       │   └── zsh-generator.ts   # Zsh completion script generator
│       └── installers/
│           └── zsh-installer.ts   # Handles Oh My Zsh + standard Zsh installation
└── utils/
    └── shell-detection.ts         # Shell detection (returns 'zsh' or throws)
```

**Future additions (bash, fish, powershell):**
- `generators/bash-generator.ts`, `fish-generator.ts`, `powershell-generator.ts`
- `installers/bash-installer.ts`, `fish-installer.ts`, `powershell-installer.ts`
- 更新 `shell-detection.ts` 支援其他 shell 類型

## 天哪Zsh優先

Zsh 實施優先考慮 Oh My Zsh 因為：
1. **流行度** - Oh My Zsh 是最受歡迎的 Zsh 設定框架
2. **約定** - 具有標準完成目錄（`~/.oh-my-zsh/custom/completions/`)
3. **檢測** - 易於透過以下方式檢測 `$ZSH` 環境變數
4. **後備** - 標準 Zsh 支援在未安裝 Oh My Zsh 時提供相容性

**安裝策略：**
```typescript
if (isOhMyZshInstalled()) {
  // Install to ~/.oh-my-zsh/custom/completions/_openspec
  // Automatically loaded by Oh My Zsh
} else {
  // Install to ~/.zsh/completions/_openspec
  // Update ~/.zshrc with fpath and compinit if needed
}
```

## 快取策略

動態完成將結果快取 2 秒，以平衡新鮮度與效能：

**為什麼是2秒？ **
- 典型的選項卡完成會話持續 < 2 秒
- 防止在快速切換期間重複檔案系統掃描
- 足夠短，在添加更改/規格時感覺“活躍”
- 每個進程自動過期（跨會話沒有陳舊資料）

**執行：**
```typescript
private changeCache: { ids: string[]; timestamp: number } | null = null;
private readonly CACHE_TTL_MS = 2000;

if (this.changeCache && Date.now() - this.changeCache.timestamp < this.CACHE_TTL_MS) {
  return this.changeCache.ids; // Use cached
}
// Refresh cache
```

## 錯誤處理哲學

完成應該優雅地降級而不是破壞工作流程：

1. **不支援的 shell** - 透過支援的 shell 清單清除錯誤
2. **不在 OpenSpec 專案中** - 跳過動態完成，僅提供靜態命令
3. **權限錯誤** - 建議替代安裝方法
4. **缺少設定目錄** - 透過使用者通知自動建立
5. **已安裝** - 提供重新安裝/更新
6. **未安裝（卸載期間）** - 正常退出並顯示資訊性訊息

## 測試策略

每個組件都是可獨立測試的：

1. **單元測試**
   - 使用模擬進行外殼檢測 `$SHELL` 環境變數
   - 生成器輸出驗證（正規表示式模式匹配）
   - 完成提供者快取行為
   - 命令註冊表結構驗證

2. **整合測試**
   - 安裝到暫存測試目錄
   - 設定檔修改
   - 端對端命令流程（產生→安裝→驗證）

3. **手動測試**
   - 真實的 shell 環境（天哪 Zsh、Bash、Fish、PowerShell）
   - OpenSpec 專案中的 Tab 完成行為
   - 動態變更/規格 ID 建議
   - 安裝/解除安裝工作流程

## TypeScript糖模式

### 1. 不可變資料的 const 斷言
```typescript
const COMMAND_REGISTRY = [
  { name: 'init', ... },
  { name: 'list', ... }
] as const;
```

### 2. 命令類型的區分聯合
```typescript
type Command =
  | { type: 'simple'; name: string }
  | { type: 'with-subcommands'; name: string; subcommands: Command[] };
```

### 3. 字串的模板文字類型
```typescript
type ShellConfigFile = `~/.${SupportedShell}rc` | `~/.${SupportedShell}_profile`;
```

### 4. 滿足類型驗證的操作員要求
```typescript
const config = {
  shell: 'zsh',
  path: '~/.zshrc'
} satisfies ShellConfig;
```

### 5. 可選連結和空合併
```typescript
const path = process.env.ZSH ?? `${os.homedir()}/.oh-my-zsh`;
```

### 6. 使用 Promise.all 進行非同步/等待以實現並行操作
```typescript
const [changes, specs] = await Promise.all([
  provider.getChangeIds(),
  provider.getSpecIds()
]);
```

## 可擴展性考慮因素

### 新增外殼

1. 定義外殼在 `SupportedShell` 聯合型
2. 建立生成器類別實現 `CompletionGenerator`
3. 建立安裝程式類別實現 `CompletionInstaller`
4. 將案例新增至工廠功能
5. Add command registration in CLI
6. 編寫測試

**TypeScript 將強制**更新所有 switch 語句（詳盡檢查）。

### 新增指令

1. 添加 `COMMAND_REGISTRY` 具有適當的元資料
2. 所有生成器都會自動包含它
3. 更新測試以驗證新命令是否出現

### 改變完成行為

動態完成邏輯集中在 `CompletionProvider`，使行為變更變得微不足道，而無需觸及特定於 shell 的程式碼。

## 權衡和決策

### 決定：單獨的生成器與模板引擎

**選擇：** 每個 shell 單獨的生成器類

**替代方案：** 具有特定於 shell 的模板的模板引擎

**理由：**
- Shell 完成語法根本不同（不只是文字替換）
- 類別的類型安全性比模板更好
- 邏輯複雜度（快取、動態完成）不適合用於範本範例
- 更容易調試和測試專用類

### 決策：2 秒快取 TTL

**選擇：** 2秒快取

**替代方案：** 無快取（慢）、更長的快取（陳舊）、持久快取（複雜）

**理由：**
- 平衡性能與新鮮度
- 匹配典型的使用者互動模式
- 實作簡單（沒有失效複雜性）
- 進程退出時自動清理

### 決定：天哪Zsh檢測

**選擇：** 檢查 `$ZSH` 首先是環境變量，然後是 `~/.oh-my-zsh/` 目錄

**理由：**
- `$ZSH` 由 Oh My Zsh 初始化設定（可靠）
- 目錄檢查是非互動式場景的後備方案
- 標準 Zsh 作為最終後備

### 決策：安裝自動化與手動說明

**Chosen:** Automated installation with install/uninstall commands

**替代方案：** 產生腳本並提供手動安裝說明

**理由：**
- 更好的使用者體驗（一個命令與多個手動步驟）
- 減少手動設定的錯誤
- 符合使用者對現代 CLI 工具的期望
- 仍然支援透過腳本產生到標準輸出的手動工作流程

## 未來的增強功能

1. **上下文標誌完成** - 僅建議當前命令的有效標誌
2. **模糊匹配** - 允許更改/規範 ID 的部分匹配
3. **豐富的描述** - 在完成建議中包含「為什麼」部分（取決於 shell）
4. **完成統計** - 追蹤分析的完成使用情況
5. **自訂完成掛鉤** - 允許專案擴充完成
6. **MCP 整合** - 透過模型上下文協定提供補全

## 參考

- [Bash 可程式完成](https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion.html)
- [Zsh完成系統](https://zsh.sourceforge.io/Doc/Release/Completion-System.html)
- [Fish 完成狀況](https://fishshell.com/docs/current/completions.html)
- [PowerShell 參數完成者](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter)
- [天哪 Zsh 自訂完成](https://github.com/ohmyzsh/ohmyzsh/wiki/Customization#adding-custom-completions)
