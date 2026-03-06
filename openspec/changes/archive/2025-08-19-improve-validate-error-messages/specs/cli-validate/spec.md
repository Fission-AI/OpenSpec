# 驗證命令

## 新增要求

### 要求：驗證應提供可行的補救措施
驗證輸出應包括修復每個錯誤的特定指南，包括預期結構、範例標頭以及用於驗證修復的建議命令。

#### 場景：在變化中沒有發現增量
- **何時** 使用零解析增量驗證更改
- **然後** 顯示錯誤“未找到增量”並提供指導：
  - 確保 `openspec/changes/{id}/specs/` 存在於 `.md` 文件
  - 使用增量標頭： `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements`
  - 每項要求必須至少包括一項 `#### Scenario:` 堵塞
  - 嘗試： `openspec change show {id} --json --deltas-only` 檢查解析的內容

#### 場景：缺少必要的部分
- **何時** 缺少必填部分
- **那麼**驗證器應包括預期的標頭名稱和最小框架：
  - 對於規格： `## Purpose`, `## Requirements`
  - 對於改變： `## Why`, `## What Changes`
  - 顯示缺失部分的範例片段

### 要求：驗證器應檢測可能的格式錯誤場景並發出修復警告
驗證器應識別看起來像場景的項目符號行（例如，以 WHEN/THEN/AND 開頭的行），並發出有針對性的警告，其中包含轉換範例 `#### Scenario:`.

#### 場景：需求下的 WHEN/THEN 項目符號
- **WHEN** 以 WHEN/THEN/AND 開頭的項目符號在沒有任何要求的情況下找到 `#### Scenario:` 標頭
- **THEN** 發出警告：“場景必須使用 '#### Scenario:' 標頭”，並顯示轉換模板：
```
#### Scenario: Short name
- **WHEN** ...
- **THEN** ...
- **AND** ...
```

### 要求：所有問題應包括檔案路徑和結構化位置
錯誤、警告和資訊訊息應包括：
- 來源檔案路徑（`openspec/changes/{id}/proposal.md`, `.../specs/{cap}/spec.md`)
- 結構化路徑（例如， `deltas[0].requirements[0].scenarios`)

#### 場景：Zod 驗證錯誤
- **何時** 模式驗證失敗
- **那麼**訊息應包括 `file`, `path`，以及修復提示（如果適用）

### 要求：無效結果應在人類可讀的輸出中包含後續步驟頁腳
當該項目無效且未使用時，CLI 應附加後續步驟頁腳 `--json`， 包括：
- 帶有計數的摘要行
- Top-3 指導要點（與最常見或阻塞錯誤相關）
- 重新執行的建議 `--json` 和/或調試命令

#### 場景：更改無效摘要
- **何時** 更改驗證失敗
- **然後** 用 2-3 個目標項目符號列印「後續步驟」並提出建議 `openspec change show <id> --json --deltas-only`


