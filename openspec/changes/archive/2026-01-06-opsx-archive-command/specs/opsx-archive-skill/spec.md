## 新增要求

### 需求：OPSX 存檔技能

系統應提供 `/opsx:archive` 歸檔實驗工作流程中已完成的變更的技能。

#### 場景：歸檔更改並完成所有工件

- **何時** 代理執行 `/opsx:archive` 更改名稱
- **且** 架構中的所有工件均已完成
- **且**所有任務已完成
- **然後** 代理程式將變更移至 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **AND** displays success message with archived location

#### 場景：更改選擇提示

- **何時** 代理執行 `/opsx:archive` 沒有指定更改
- **然後** 代理程式提示使用者從可用變更中進行選擇
- **AND** shows only active changes (excludes archive/)

### Requirement: Artifact Completion Check

The skill SHALL check artifact completion status using the artifact graph before archiving.

#### 場景：不完整的工件警告

- **WHEN** agent checks artifact status
- **且** 一個或多個工件的狀態不同於 `done`
- **然後** 顯示警告，列出不完整的工件
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### 場景：所有工件均已完成

- **WHEN** agent checks artifact status
- **AND** all artifacts have status `done`
- **THEN** proceed without warning

### 要求：任務完成檢查

該技能應在存檔之前從tasks.md檢查任務完成狀態。

#### 場景：發現未完成的任務

- **WHEN** agent reads tasks.md
- **並且**發現不完整的任務（標記為 `- [ ]`)
- **然後** 顯示警告，顯示未完成任務的計數
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### 場景：所有任務完成

- **WHEN** agent reads tasks.md
- **並且** 所有任務均已完成（標記為 `- [x]`)
- **然後** 繼續執行，而不會出現與任務相關的警告

#### 場景：沒有任務文件

- **何時**tasks.md 不存在
- **然後** 繼續執行，而不會出現與任務相關的警告

### 需求：規格同步提示

如果規格存在，則技能應在存檔之前提示同步增量規格。

#### 場景：Delta 規格存在

- **何時** 代理檢查增量規格
- **和** `specs/` 目錄存在於與規格文件的變更中
- **然後** 提示使用者：“此變更有增量規格。您想在存檔之前將它們同步到主要規格嗎？”
- **並且** 如果使用者確認，則執行 `/opsx:sync` 邏輯
- **並且** 無論同步選擇如何都繼續存檔

#### 場景：無增量規格

- **何時** 代理檢查增量規格
- **並且**沒有 `specs/` 目錄或不存在規格文件
- **然後** 在沒有同步提示的情況下繼續

### 需求：存檔過程

技能應將變更移至帶有日期前綴的存檔資料夾。

#### 場景：成功歸檔

- **何時** 歸檔更改
- **然後**建立 `archive/` 目錄（如果不存在）
- **AND** generate target name as `YYYY-MM-DD-<change-name>` 使用目前日期
- **並且** 將整個更改目錄移動到存檔位置
- **並**保留 `.openspec.yaml` 存檔更改中的文件

#### 場景：存檔已存在

- **何時** 目標存檔目錄已存在
- **然後** 失敗並顯示錯誤訊息
- **並**建議重命名現有存檔或使用不同的日期

### 需求：技能輸出

此技能應提供有關存檔操作的清晰回饋。

#### 場景：存檔完成並同步

- **何時** 同步規格後存檔完成
- **然後** 顯示摘要：
  - 規格已同步（來自 `/opsx:sync` 輸出）
  - 更改存檔位置
  - 使用的架構

#### 場景：存檔完成但未同步

- **何時** 存檔完成但未同步規格
- **然後** 顯示摘要：
  - 請注意，規格未同步（如果適用）
  - 更改存檔位置
  - 使用的架構

#### 場景：存檔完整但有警告

- **何時** 歸檔完成但工件或任務不完整
- **然後** 包括有關不完整內容的註釋
- **並**建議審查存檔是否是故意的
