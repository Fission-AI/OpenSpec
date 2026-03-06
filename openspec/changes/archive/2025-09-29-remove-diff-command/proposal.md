# 刪除 Diff 指令

## 問題

這 `openspec diff` 由於以下幾個原因，命令給 OpenSpec CLI 添加了不必要的複雜性：

1. **冗餘功能**： `openspec show` 命令已經透過結構化 JSON 輸出和 Markdown 渲染提供了全面的變化視覺化
2. **維護負擔**：diff 指令需要單獨的依賴項（jest-diff）和額外的程式碼複雜度（約 227 行）
3. **價值有限**：開發人員可以使用現有工具實現更好的差異視覺化：
   - 實際檔案更改的 Git diff
   - 這 `show` 用於結構化變更檢視的命令
   - 用於直接比較規格文件的標準 diff 實用程序
4. **與動詞-名詞模式不一致**：此指令不遵循其他指令遷移到的首選動詞優先指令結構

## 解決方案

刪除 `openspec diff` 完全指揮並引導使用者找到更合適的替代方案：

1. **用於檢視更改內容**：使用 `openspec show <change-name>` 其中規定：
   - 結構化 JSON 輸出 `--json` 旗幟
   - Markdown 呈現為人類可讀的格式
   - 僅限增量的視圖 `--deltas-only` 旗幟
   - 全規格內容視覺化

2. **用於比較文件**：使用標準工具：
   - `git diff` 用於版本控制比較
   - 用於逐個文件比較的系統差異實用程序
   - 用於視覺比較的 IDE diff 檢視器

## 好處

- **降低複雜性**：刪除約 227 行程式碼和 jest-diff 依賴項
- **更清晰的使用者旅程**：將使用者引導至規範的 `show` 檢視更改的命令
- **減少維護**：需要維護和測試的命令更少
- **更好的對齊**：專注於核心 OpenSpec 工作流程，沒有冗餘功能

## 執行

### 要刪除的文件
- `/src/core/diff.ts` - 整個 diff 指令的實現
- `/openspec/specs/cli-diff/spec.md` - diff 命令規範

### 要更新的文件
- `/src/cli/index.ts` - 刪除 diff 指令註冊（第 8、84-96 行）
- `/package.json` - 刪除 jest-diff 依賴
- `/README.md` - 刪除 diff 命令文檔
- `/openspec/README.md` - 刪除 diff 指令引用
- 各種文檔文件提到 `openspec diff`

### 使用者遷移指南

目前使用的用戶 `openspec diff` 應過渡到：

```bash
# Before
openspec diff add-feature

# After - view the change proposal
openspec show add-feature

# After - view only the deltas
openspec show add-feature --json --deltas-only

# After - use git for file comparisons
git diff openspec/specs openspec/changes/add-feature/specs
```

## 風險

- **使用者中斷**：現有使用者可能有工作流程，取決於 diff 命令
  - 緩解措施：提供明確的遷移指南和棄用期限
  
- **視覺差異遺失**：彩色的統一差異格式將不再可用
  - 緩解措施：使用者可以使用 git diff 或其他工具進行直覺比較

## 成功指標

- 成功刪除且沒有損壞的依賴項
- 更新文件以反映更改
- 無需 diff 命令即可通過測試
- 透過刪除 jest-diff 依賴項來減少套件大小