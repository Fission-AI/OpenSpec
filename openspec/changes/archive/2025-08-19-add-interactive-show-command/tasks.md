# 實施任務－新增互動表演指令

## 目標
- 添加頂級 `show` 具有智慧選擇和類型檢測功能的命令。
- 新增互動式選擇 `change show` 和 `spec show` 當沒有提供身分證件時。
- 保留原始優先輸出行為和現有的 JSON 格式/過濾器。
- 尊重 `--no-interactive` 和 `OPEN_SPEC_INTERACTIVE=0` consistently.

---

## 1)CLI接線
- [x] 在 `src/cli/index.ts` 新增頂級命令： `program.command('show [item-name]')`
  - 選項：
    - `--json`
    - `--type <type>` where `<type>` is `change|spec`
    - `--no-interactive`
    - Allow passing-through type-specific flags using `.allowUnknownOption(true)` so the top-level can forward flags to the underlying type handler.
  - 動作：實例化 `new ShowCommand().execute(itemName, options)`.
- [x] 更新 `change show` 接受子命令 `--no-interactive` 並將其傳遞給 `ChangeCommand.show(...)`.
- [x] 改變 `spec show` 子命令接受可選 ID (`show [spec-id]`）， 添加 `--no-interactive`，並傳遞給規範顯示實作。

驗收：
- `openspec show` 存在並在沒有參數時在非互動式上下文中列印有用的提示。
- 其他類型的未知標誌不會導致解析崩潰；他們會被適當地警告/忽略。

---

## 2）新模組： `src/commands/show.ts`
- [x] 創造 `ShowCommand` 和：
  - `execute(itemName?: string, options?: { json?: boolean; type?: string; noInteractive?: boolean; [k: string]: any })`
  - 當互動路徑 `!itemName` 並啟用互動：
    - Prompt: "What would you like to show?" → `change` or `spec`.
    - Load available IDs for the chosen type and prompt selection.
    - Delegate to type-specific show implementation.
  - 非互動路徑時 `!itemName`:
    - Print hint with examples:
      - `openspec show <item>`
      - `openspec change show`
      - `openspec spec show`
    - Exit with code 1.
  - 直接專案路徑時 `itemName` 提供：
    - Type override via `--type` takes precedence.
    - Otherwise detect using `getActiveChangeIds()` and `getSpecIds()`.
    - If ambiguous and no override: print error + suggestion to pass `--type` or use subcommands; exit code 1.
    - If unknown: print not-found with nearest-match suggestions; exit code 1.
    - On success: delegate to type-specific show.
- [x] 標誌範圍和傳遞：
  - 常見的： `--json` → 轉發至兩種類型。
  - 僅更改： `--deltas-only`, `--requirements-only` （已棄用的別名）。
  - 僅規格： `--requirements`, `--no-scenarios`, `-r/--requirement`.
  - 警告並忽略已解析類型的不相關標誌。

驗收：
- `openspec show <change-id> --json --deltas-only` 比賽 `openspec change show <id> --json --deltas-only` output.
- `openspec show <spec-id> --json --requirements` 比賽 `openspec spec show <id> --json --requirements` output.
- 模糊性和未發現的行為符合 `cli-show` spec.

---

## 3) 將規範顯示重構為可重複使用的API
- [x] 在 `src/commands/spec.ts`，將顯示邏輯提取到導出的 `SpecCommand` 和 `show(specId?: string, options?: { json?: boolean; requirements?: boolean; scenarios?: boolean; requirement?: string; noInteractive?: boolean })`.
  - 重用當前的助手（`parseSpecFromFile`, `filterSpec`，原始優先列印）。
  - 保持 `registerSpecCommand` 但委託給 `new SpecCommand().show(...)`.
- [x] 將 CLI spec show 子命令更新為可選參數和互動行為（請參閱第 4 節）。

驗收：
- 現存的 `spec show` 測試繼續通過。
- 新的 `SpecCommand.show` 可以從調用 `ShowCommand`.

---

## 4) 子命令中的向後相容交互
- [x] `src/commands/change.ts` → 延長 `show(changeName?: string, options?: { json?: boolean; requirementsOnly?: boolean; deltasOnly?: boolean; noInteractive?: boolean })`:
  - 什麼時候 `!changeName` 並啟用互動式：提示來自 `getActiveChangeIds()` 並顯示所選的變更。
  - 非互動式回退：保持目前行為（列印可用 ID + `openspec change list` 提示、設定 `process.exitCode = 1`).
- [x] `src/commands/spec.ts` → `SpecCommand.show` 如上所述：
  - 什麼時候 `!specId` 並啟用互動式：提示來自 `getSpecIds()` 並顯示所選規格。
  - 非互動式回退：列印與現有缺失行為相同的錯誤 `<spec-id>` 並設定非零退出代碼。

驗收：
- `openspec change show` 在非互動式列印清單提示並退出非零。
- `openspec spec show` 在非互動式中列印遺失參數錯誤並以非零值退出。

---

## 5）共享公用設施
- [x] 提煉 `nearestMatches` 和 `levenshtein` 從 `src/commands/validate.ts` 進入 `src/utils/match.ts` （導出的助手）。
- [x] 更新 `ValidateCommand` 和新的 `ShowCommand` 導入自 `utils/match`.

驗收：
- 使用共享助手建立成功並且沒有重複。

---

## 6) 提示、警告和訊息
- [x] Top-level `show` 提示（非互動式無參數）：
  - 線路包括： `openspec show <item>`, `openspec change show`, `openspec spec show`，和“或在互動終端中執行。”。
- [x] 含糊不清的消息表明 `--type change|spec` 和子命令。
- [x] 未找到建議最接近的匹配項（最多 5 個）。
- [x] 已解析類型的不相關標誌警告（列印到 stderr，不會崩潰）。

驗收：
- 訊息匹配 `cli-show` 規範其他地方使用的措詞意圖和風格。

---

## 7) 測試
添加鏡像現有模式的測試（透過非 TTY 模擬 `OPEN_SPEC_INTERACTIVE=0`).

- [x] `test/commands/show.test.ts`
  - 非互動式，無參數 → 列印提示並以非零值退出。
  - 直接項目檢測以瞭解變更和規格。
  - 兩者都存在時的歧義情況 → 錯誤和建議 `--type`.
  - 未找到案例→最近匹配建議。
  - 傳遞標誌：更改 `--json --deltas-only`, 規格 `--json --requirements`.
- [x] `test/commands/change.interactive-show.test.ts` （非互動式後備）
  - 確保 `openspec change show` 不含 args 列印可用 ID + 清單提示和非零退出。
- [x] `test/commands/spec.interactive-show.test.ts` （非互動式後備）
  - 確保 `openspec spec show` 沒有 args 會列印缺少參數錯誤和非零退出。

驗收：
- 建構後所有新測試均通過；現有測試中沒有回歸。

---

## 8) 文檔（可選但建議）
- [x] 更新 `openspec/README.md` 用法範例包括新的 `show` 具有類型檢測和標誌的命令。

---

## 9) 非功能檢查
- [x] 執行 `pnpm build` 和所有測試（`pnpm test`).
- [x] 確保沒有 linter/類型錯誤且訊息與現有樣式一致。

---

## 關於一致性的注意事項
- 遵循文字輸出的原始優先行為：直通文件內容，不含格式，鏡像當前 `change show` 和 `spec show`.
- 重複利用 `isInteractive` 和 `item-discovery` 一致提示行為的幫助者。
- 保持 JSON 輸出形狀與目前相同 `ChangeCommand.show` 和 `spec show` outputs.


