## 為什麼

OpenCode 適配器使用 `.opencode/command/` （單數）其命令目錄，但 OpenCode 的官方文件指定 `.opencode/commands/` （複數）。程式碼庫中的每個其他適配器也使用複數目錄名稱（`.claude/commands/`, `.cursor/commands/`, `.factory/commands/`， ETC。 ）。這種不一致是在 2025 年 10 月引入的，但沒有記錄理由。修復 [#748](https://github.com/Fission-AI/OpenSpec/issues/748).

## 有什麼變化

- OpenCode 適配器路徑更改自 `.opencode/command/` 到 `.opencode/commands/`
- 遺留清理添加 `.opencode/command/` （舊的單一路徑）用於向後相容
- 更新文件以反映新的複數路徑

## 能力

### 新功能

_None._

### 修改後的功能

- `command-generation`：OpenCode 適配器路徑從單數更改 `command/` 改為複數 `commands/` 以符合 OpenCode 的官方目錄約定

## 影響

- `src/core/command-generation/adapters/opencode.ts` — 適配器路徑
- `src/core/legacy-cleanup.ts` — 遺留清理模式+新增舊的單一路徑
- `docs/supported-tools.md` — 文件表
- `test/core/command-generation/adapters.test.ts` — 測試斷言
