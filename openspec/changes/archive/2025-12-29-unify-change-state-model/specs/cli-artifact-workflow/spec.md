# cli-artifact-workflow 規範增量

## 修改後的要求

### 要求：狀態命令

系統應顯示變更的工件完成狀態，包括鷹架（空）變更。

> **修復錯誤**：以前需要 `proposal.md` 透過存在 `getActiveChangeIds()`.

#### 場景：顯示所有狀態的狀態

- **何時** 使用者執行 `openspec status --change <id>`
- **然後** 系統會顯示每個工件以及狀態指示燈：
  - `[x]` 對於已完成的工件
  - `[ ]` 對於準備好的工件
  - `[-]` 對於被阻止的工件（列出了缺少的依賴項）

#### 場景：狀態顯示完成摘要

- **何時** 使用者執行 `openspec status --change <id>`
- **那麼** 輸出包含完成百分比和計數（例如，「2/4 工件完成」）

#### 場景：狀態JSON輸出

- **何時** 使用者執行 `openspec status --change <id> --json`
- **那麼** 系統輸出 JSON，其中包含changeName、schemaName、isComplete 和artifacts 陣列

#### 場景：腳手架變更狀態

- **何時** 使用者執行 `openspec status --change <id>` 在沒有工件的情況下進行更改
- **然後** 系統顯示所有工件及其狀態
- **和** 根工件（無依賴項）顯示為就緒 `[ ]`
- **和** 依賴工件顯示為被阻止 `[-]`

#### 場景：缺少更改參數

- **何時** 使用者執行 `openspec status` 沒有 `--change`
- **然後** 系統顯示錯誤以及可用更改列表
- **AND** 包含支架式變更（沒有proposal.md 的目錄）

#### 場景：未知變化

- **何時** 使用者執行 `openspec status --change unknown-id`
- **和**目錄 `openspec/changes/unknown-id/` 不存在
- **然後** 系統顯示一個錯誤，列出所有可用的更改目錄

### 要求：下一個命令

The system SHALL show which artifacts are ready to be created, including for scaffolded changes.

#### 場景：顯示準備好的工件

- **何時** 使用者執行 `openspec next --change <id>`
- **然後** 系統列出依賴項全部滿足的工件

#### 場景：沒有準備好工件

- **何時** 所有工件都完成或被阻止
- **然後** 系統指示沒有準備好任何工件（帶解釋）

#### 場景：所有工件均已完成

- **何時** 變更中的所有工件均已完成
- **THEN**系統提示變更完成

#### 場景：下一個 JSON 輸出

- **何時** 使用者執行 `openspec next --change <id> --json`
- **然後** 系統輸出 JSON 就緒工件 ID 數組

#### 場景：下一步是鷹架變革

- **何時** 使用者執行 `openspec next --change <id>` 在沒有工件的情況下進行更改
- **那麼**系統顯示根工件（例如“提案”）已準備好建立

### 要求：指令命令

系統應輸出用於建立工件的豐富指令，包括腳手架的變更。

#### 場景：顯示豐富的指令

- **何時** 使用者執行 `openspec instructions <artifact> --change <id>`
- **那麼**系統輸出：
  - 工件元資料（ID、輸出路徑、描述）
  - 模板內容
  - 依賴狀態（完成/缺失）
  - 解鎖的工件（完成後可用的東西）

#### 場景：指令JSON輸出

- **何時** 使用者執行 `openspec instructions <artifact> --change <id> --json`
- **那麼**系統輸出JSON符合ArtifactInstructions接口

#### 場景：未知神器

- **何時** 使用者執行 `openspec instructions unknown-artifact --change <id>`
- **然後** 系統顯示一錯誤，列出模式的有效工件 ID

#### 場景：具有未滿足的依賴關係的工件

- **何時** 使用者請求有關被封鎖工件的說明
- **然後** 系統顯示說明，並警告缺少依賴項

#### 場景：鷹架變更說明

- **何時** 使用者執行 `openspec instructions proposal --change <id>` 鷹架上的改變
- **然後** 系統輸出用於建立提案的範本和元資料
- **且** 不需要任何工件已經存在
