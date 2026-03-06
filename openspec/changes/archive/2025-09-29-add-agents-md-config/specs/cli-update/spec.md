## 修改後的要求
### 要求：更新行為
更新命令應以團隊友好的方式將 OpenSpec 指令檔更新為最新模板。

#### 場景：執行更新命令

- **何時** 使用者執行 `openspec update`
- **那麼**命令應：
  - 檢查是否 `openspec` 目錄存在
  - 代替 `openspec/AGENTS.md` 使用最新模板（完全替換）
  - 建立或重新整理根級別 `AGENTS.md` 使用託管標記區塊的檔案（如果遺失則建立）
  - **僅更新現有** AI 工具設定檔（例如 CLAUDE.md）
    - Check each registered AI tool configurator
    - For each configurator, check if its file exists
    - Update only files that already exist using their markers
    - Preserve user content outside markers
  - 顯示列出更新檔案的成功訊息

### 要求：與工具無關的更新
更新命令應以可預測且安全的方式處理文件更新，同時尊重團隊工具的選擇。

#### 場景：更新文件

- **何時**更新文件
- **然後** 完全替換 `openspec/AGENTS.md` 與最新的模板
- **和** 建立或更新根級別 `AGENTS.md` 使用 OpenSpec 標記
- **並且**使用標記僅更新**現有** AI 工具檔案中的 OpenSpec 託管區塊
- **並且**使用預設目錄名稱 `openspec`
- **並且** 是冪等的（重複執行沒有額外的效果）
- **並且**尊重團隊成員的 AI 工具選擇，不要在根目錄之外建立其他工具文件 `AGENTS.md`

### 需求：核心檔案始終更新
更新命令應始終更新核心 OpenSpec 檔案並顯示 ASCII 安全性成功訊息。

#### 場景：更新成功

- **何時** 更新成功完成
- **然後** 更換 `openspec/AGENTS.md` 與最新的模板
- **並且**確保根級別 `AGENTS.md` 透過標記塊來匹配最新模板
- **並**更新標記內現有的 AI 工具設定檔
- **並且**顯示訊息：“已更新 OpenSpec 說明”
