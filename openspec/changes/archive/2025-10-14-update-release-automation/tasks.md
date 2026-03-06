## 1. 發布工作流程自動化
- [x] 1.1 新增一個 `.github/workflows/release.yml` 執行在推送到 `main`，設定 pnpm + Node 20，安裝依賴項，並調用 `changesets/action@v1` 和 `publish: pnpm run release`.
- [x] 1.2 設定動作 `createGithubReleases: true` 並記錄所需的秘密（`NPM_TOKEN`, 預設 `GITHUB_TOKEN`）加上建議的並發保護措施。
- [x] 1.3 使用驗證工作流程 `act` 或進行試執行推送，以確認該操作在變更集存在時開啟發布 PR，並在發布 PR 合併落地時發布。

## 2. 套件發布腳本
- [x] 2.1 新增一個 `release` 腳本到 `package.json` 建置專案並執行 `changeset publish` 使用pnpm。
- [x] 2.2 確保腳本尊重現有的 `prepare`/`prepublishOnly` 掛鉤以避免重複構建，並在需要調整時更新文件或腳本。

## 3. 文檔記錄和恢復步驟
- [x] 3.1 更新維護者文件（例如README 或 `/docs`）使用端到端自動發布流程，明確刪除不再需要的手動標記/發布步驟，並解釋變更集如何驅動發布 PR。
- [x] 3.2 記錄失敗發布的後備步驟（重新執行工作流程、手動發布）以及必須在沒有掛起的變更集的情況下削減版本時的修補程式路徑。
