## 修改後的要求
### 要求：驗證應提供可行的補救措施
驗證輸出應包括修復每個錯誤的特定指南，包括預期結構、範例標頭以及用於驗證修復的建議命令。

#### 場景：在變化中沒有發現增量
- **何時** 使用零解析增量驗證更改
- **然後** 顯示錯誤“未找到增量”並提供指導：
  - 解釋變更規格必須包括 `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`， 或者 `## RENAMED Requirements`
  - 提醒作者文件必須位於 `openspec/changes/{id}/specs/<capability>/spec.md`
  - 包含明確的註釋：“規範增量文件不能以操作標題之前的標題開頭”
  - 建議執行 `openspec change show {id} --json --deltas-only` 用於調試

#### 場景：缺少必要的部分
- **何時** 缺少必填部分
- **然後** 包括預期的標頭名稱和最小框架：
  - 對於規格： `## Purpose`, `## Requirements`
  - 對於改變： `## Why`, `## What Changes`
  - 提供缺失部分的範例片段以及可供複製的佔位符散文
  - 提及快速參考部分 `openspec/AGENTS.md` 作為權威模板

#### 場景：缺少需求描述文本
- **何時** 需求標題在場景之前缺少描述性文本
- **THEN** 發出一個錯誤，解釋說 `### Requirement:` 任何行之前必須有敘述性文本 `#### Scenario:` 標頭
  - 顯示合規範例：“### Requirement: Foo”後面跟著“The system SHALL ...”
  - 建議在列出場景之前添加 1-2 個描述規範行為的句子
  - 參考預驗證清單 `openspec/AGENTS.md`

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
