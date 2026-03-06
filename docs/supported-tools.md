# 支援的工具

OpenSpec 可與許多 AI 編碼助理搭配使用。當你執行時 `openspec init`, OpenSpec 使用您的活動設定檔/工作流程選擇和交付模式設定選定的工具。

## 它是如何運作的

對於每個選定的工具，OpenSpec 可以安裝：

1. **技能**（如果交付包含技能）： `.../skills/openspec-*/SKILL.md`
2. **命令**（如果交付包含命令）：特定於工具 `opsx-*` 命令檔案

預設情況下，OpenSpec 使用 `core` 簡介，其中包括：
- `propose`
- `explore`
- `apply`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`） 透過 `openspec config profile`，然後執行 `openspec update`.

## 工具目錄參考

| 工具（ID） | 技能路徑模式 | 命令路徑模式 |
|-----------|---------------------|----------------------|
| 亞馬遜 Q 開發人員 (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| 反重力（`antigravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| 奧吉（`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| Claude 代碼 (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| 克萊恩（`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| 代碼夥伴（`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex（`codex`) | `.codex/skills/openspec-*/SKILL.md` | `$CODEX_HOME/prompts/opsx-<id>.md`\* |
| 繼續 （`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| 嚴格限制 (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| 壓碎 （`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| 游標 (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| 工廠機器人（`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| 雙子座 CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub 副駕駛 (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| iFlow（`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| 基洛代碼（`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kiro（`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| 開放代碼（`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| 圓周率 (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| 科德爾（`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen 代碼 (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.toml` |
| 屋頂代碼 (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| 特雷 (`trae`) | `.trae/skills/openspec-*/SKILL.md` | 未產生（無命令適配器；使用基於技能的 `/openspec-*` 調用） |
| 風帆衝浪（`windsurf`) | `.windsurf/skills/openspec-*/SKILL.md` | `.windsurf/workflows/opsx-<id>.md` |

\* Codex 指令安裝在全域 Codex 主目錄中（`$CODEX_HOME/prompts/` 如果設置，否則 `~/.codex/prompts/`），而不是您的專案目錄。

\*\* GitHub Copilot 提示檔案在 IDE 擴充功能（VS Code、JetBrains、Visual Studio）中被識別為自訂斜線命令。副駕駛 CLI 目前未消耗 `.github/prompts/*.prompt.md` directly.

## 非互動式設定

對於 CI/CD 或腳本化安裝，請使用 `--tools` （並且可選地 `--profile`):

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**可用工具 ID（`--tools`):** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

## 工作流程相關安裝

OpenSpec 根據選定的工作流程安裝工作流程工件：

- **核心設定檔（預設）：** `propose`, `explore`, `apply`, `archive`
- **自訂選擇：** 所有工作流程 ID 的任何子集：
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

換句話說，技能/命令計數取決於設定檔和交付，而不是固定的。

## 產生的技能名稱

當透過設定檔/工作流程設定選擇時，OpenSpec 會產生以下技能：

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

看 [命令](commands.md) 對於命令行為和 [CLI](cli.md) 為了 `init`/`update` options.

## 有關的

- [CLI參考](cli.md) — 終端命令
- [命令](commands.md) — 斜線指令與技能
- [入門](getting-started.md) — 首次設定
