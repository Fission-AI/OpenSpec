# 實施任務

## 1.更改命令：互動式驗證選擇
- [x] 1.1 添加 `--no-interactive` 標記為 `change validate` 在 `src/cli/index.ts`
- [x] 1.2 實現尊重 TTY 和的交互門 `OPEN_SPEC_INTERACTIVE=0` 在 `src/commands/change.ts`
- [x] 1.3 當沒有 `[change-name]` 提供並允許交互，提示活動更改列表（不包括 `archive/`) 並驗證所選的一個
- [x] 1.4 保留目前非互動式後備：列印可用的變更 ID 和提示，設定 `process.exitCode = 1`
- [x] 1.5 測試：增加互動式和非互動式流程的覆蓋範圍
  - 額外 `test/commands/change.interactive-validate.test.ts`

## 2. Spec 指令：互動式驗證選擇
- [x] 2.1 製作 `spec validate` 接受可選 `[spec-id]` 在 `src/commands/spec.ts` 登記
- [x] 2.2 添加 `--no-interactive` 標記為 `spec validate`
- [x] 2.3 實施尊重 TTY 的交互門和 `OPEN_SPEC_INTERACTIVE=0`
- [x] 2.4 當沒有 `[spec-id]` 提供並允許交互，提示選擇 `openspec/specs/*/spec.md` 並驗證所選規格
- [x] 2.5 當沒有spec-id且沒有互動性時保留目前的非互動回退：列印現有錯誤並退出程式碼非零
- [x] 2.6 測試：增加互動式和非互動式流程的覆蓋範圍
  - 額外 `test/commands/spec.interactive-validate.test.ts`

## 3.新頂層 `validate` 命令
- [x] 3.1 添加 `validate` 命令輸入 `src/cli/index.ts`
  - 選項： `--all`, `--changes`, `--specs`, `--type <change|spec>`, `--strict`, `--json`, `--no-interactive`
  - 用法： `openspec validate [item-name]`
- [x] 3.2 建立 `src/commands/validate.ts` 實施：
  - [x] 3.2.1 無參數時的互動式選擇器（選項：全部、變更、規格、特定項目）
  - [x] 3.2.2 帶有有用提示和退出程式碼的非互動式回退 1
  - [x] 3.2.3 透過自動類型檢測進行直接項目驗證
  - [x] 3.2.4 當名稱同時作為change和spec存在時出現歧義錯誤；建議 `--type` 或子命令
  - [x] 3.2.5 使用最近配對建議處理未知項目
  - [x] 3.2.6 批量驗證 `--all`, `--changes`, `--specs` （排除 `openspec/changes/archive/`)
  - [x] 3.2.7 尊重 `--strict` 和 `--json` 選項;每個規格 JSON 形狀
  - [x] 3.2.8 如果任何驗證失敗，則退出並回傳代碼 1
  - [x] 3.2.9 批量驗證的有限並發（預設 4-8）
  - [x] 3.2.10 批次執行期間的進度指示（目前專案、執行計數）

## 4. 實用程式和共享助手
- [x] 4.1 添加 `src/utils/interactive.ts` 和 `isInteractive(stdin: NodeJS.ReadStream, noInteractiveFlag?: boolean): boolean`
  - 考慮： `process.stdin.isTTY`, `--no-interactive`, `OPEN_SPEC_INTERACTIVE=0`
- [x] 4.2 添加 `src/utils/item-discovery.ts` 和：
  - `getActiveChangeIds(root = process.cwd()): Promise<string[]>` （排除 `archive/`)
  - `getSpecIds(root = process.cwd()): Promise<string[]>` （資料夾帶有 `spec.md`)
- [ ] 4.3 可選： `src/utils/concurrency.ts` 有界並行的助手
- [x] 4.4 重用 `src/core/validation/validator.ts` 用於專案驗證

## 5.JSON輸出（批次驗證）
- [x] 5.1 實現 JSON 架構：
  - `items: Array<{ id: string, type: "change"|"spec", valid: boolean, issues: Issue[], durationMs: number }>`
  - `summary: { totals: { items: number, passed: number, failed: number }, byType: { change?: { items: number, passed: number, failed: number }, spec?: { items: number, passed: number, failed: number } } }`
  - `version: "1.0"`
- [x] 5.2 確保進程退出代碼為 1（如果有） `items[].valid === false`
- [x] 5.3 Tests for JSON shape (keys, types, counts) and exit code behavior
  - 額外 `test/commands/validate.test.ts`

## 6. 進展與使用者體驗
- [x] 6.1 Use `ora` 或顯示目前項目和執行計數的最小控制台進度
- [x] 6.2 保持輸出穩定 `--json` 模式（沒有額外的日誌輸出到標準輸出；如果需要，請使用標準錯誤來取得進度）
- [x] 6.3 確保並發限制的回應能力

## 7. 測試
- [x] 7.1 新增頂級驗證測試： `test/commands/validate.test.ts`
  - 包括非互動式提示、--all JSON、--specs 並發、歧義錯誤
- [ ] 7.2 新增單元測試 `isInteractive` 和項目發現助手
- [x] 7.3 擴展現有的變更/規範命令測試以涵蓋互動式 `validate`
  - 額外 `test/commands/change.interactive-validate.test.ts`, `test/commands/spec.interactive-validate.test.ts`

## 8.CLI幫助和文檔
- [x] 8.1 更新指令描述/選項 `src/cli/index.ts`
- [x] 8.2 驗證幫助輸出包括 `validate` 命令和標誌
- [x] 8.3 確保現有規格 `openspec/changes/bulk-validation-interactive-selection/specs/*` 保持滿意

## 9. 不起作用
- [x] 9.1 程式碼風格與類型：導出APIs的顯式類型；避免 `any`
- [x] 9.2 無 linter 錯誤；穩定的格式化；避免不相關的重構
- [x] 9.3 維持不受影響命令的現有行為

## 10. 驗收標準映射
- [x] 交流-1： `openspec change validate` 沒有參數時的互動式選擇（僅限 TTY；尊重 `--no-interactive`/env) — 符合 cli-change 規範
- [x] 交流-2： `openspec spec validate` 沒有參數時的互動式選擇（僅限 TTY；尊重 `--no-interactive`/env) — 匹配 cli-spec 規範
- [x] AC-3：新 `openspec validate` 支援互動式選擇、批次/過濾驗證、JSON 模式、進度、並發、退出程式碼 — 符合 cli-validate 規範


