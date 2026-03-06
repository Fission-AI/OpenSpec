## 為什麼
今天的流程要求維護人員合併變更集 PR，剪切標籤，並手動起草 GitHub 版本。 GitHub 版本發布後，npm 發布將從我們現有的工作流程執行。人機互動步驟（版本控制、標記、發行說明）會減慢我們的速度，並導致 npm、標記和變更日誌之間存在漂移的風險。

## 有什麼變化
- 使用單 `changesets/action` 推至 `main` 開啟/更新版本 PR，或在合併發布 PR 時，使用儲存庫機密自動執行我們的發布指令。
- 添加一個 `release` 建置並執行的腳本 `changeset publish` 因此該操作可以端到端地處理版本升級、變更日誌提交、npm 發布和 GitHub 發布。
- 使能夠 `createGithubReleases: true` 因此，發布後立即根據變更集資料建立 GitHub 版本。
- 記錄自動化流程、所需的機密、護欄和復原步驟（回溯、修補程式）。

## 兩階段部署（兩個 PR）
1) 第一階段－試執行（未發布）
   - 更新現有的 `release-prepare.yml` 接線 `changesets/action` 和 `createGithubReleases: true` 和無操作 `publish` 命令（例如， `echo 'dry run'`).
   - 保持 `.github/workflows/release-publish.yml` 完好無損的。當我們驗證版本 PR 行為和權限是否正確時，這可以避免任何發布路徑變更。
   - 新增存儲庫防護（`if: github.repository == 'Fission-AI/OpenSpec'`）和一個用於安全的並發群組。

2) 第 2 階段 — 啟用發布與整合
   - 添加 `"release": "pnpm run build && pnpm exec changeset publish"` 到 `package.json`.
   - 改變 `release-prepare.yml` 使用 `with: publish: pnpm run release` 和 `env: NPM_TOKEN: \\${{ secrets.NPM_TOKEN }}` 加上預設值 `GITHUB_TOKEN`.
   - 消除 `.github/workflows/release-publish.yml` 以避免雙重發布。現在，當版本 PR 合併時，就會進行發布。

## 護欄
- 並行: `concurrency: { group: release-\\${{ github.ref }}, cancel-in-progress: false }` 關於序列化版本的工作流程。
- 儲存庫/分支防護：僅在上游執行發布邏輯 `main` (`if: github.repository == 'Fission-AI/OpenSpec' && github.ref == 'refs/heads/main'`).
- 權限：確保 `contents: write` 和 `pull-requests: write` 用於開啟/更新版本PR； `packages: read` optional.

## 回滾和修補程序
- 回滾：恢復發布 PR 合併（恢復版本衝突/變更日誌）；如果建立了標籤或GitHub版本，則刪除該標籤並發布；如有必要，棄用 npm 版本（`npm deprecate @fission-ai/openspec@x.y.z 'reason'`).
- 修補程序（緊急，無掛起的變更集）：為修復建立變更集並合併發布 PR；在緊急情況下，執行手動發布/發布，但透過新增後續變更集來協調版本來與變更集協調。

## 所需的秘密
- `NPM_TOKEN` 具有出版權 `@fission-ai` scope.
- 預設 `GITHUB_TOKEN` （由 GitHub 提供）用於開啟/更新版本 PR 並建立 GitHub 版本。

## 維護者流程如何變化
| 步 | 目前流程 | 未來的進程 |
| --- | --- | --- |
| 準備發布 | 合併變更集 PR，然後手動起草發行說明和標籤 | 合併發布PR；操作自動更新版本並處理變更日誌 |
| 發布npm包 | GitHub 釋放後會自動發生 | 透過自動發生 `changeset publish` 由動作調用 |
| GitHub釋放 | 手動起草並與變更日誌同步 | 操作從變更集資料建立 GitHub 版本 |
| Docs/process | 遵循手動標記/發布步驟 | 文件描述了自動化流程+恢復和修補程式路徑 |

## 影響
- 自動化：重複利用 `.github/workflows/release-prepare.yml` （第一階段：試執行，第二階段：發布）並刪除 `.github/workflows/release-publish.yml` 在第二階段。
- 包元資料：新增 `release` 腳本到 `package.json`.
- 文件：更新 README 或 `/docs` 顯示自動化流程、秘密、護欄和恢復步驟。

## 驗收標準
- 第一階段：合併到 `main` 開啟/更新版本 PR；合併時，操作的 `publish` 步驟為空操作；沒有發生 npm 發布；日誌確認預期行為； GitHub 版本建立已連接，但由於沒有發布而處於惰性狀態。
- 第 2 階段：合併到 `main` 執行 `pnpm run release` 來自行動； npm 包發布成功；GitHub 版本自動建立； `.github/workflows/release-publish.yml` 被刪除；不會發生重複發布。
