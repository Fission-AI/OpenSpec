## 新增要求

### 要求：堆疊規劃命令
The change CLI SHALL provide commands for dependency-aware sequencing of active changes.

#### 場景：顯示依賴圖
- **何時** 使用者執行 `openspec change graph`
- **那麼** CLI 應顯示活動變更的依賴關係
- **並且** 應包括確定性的建議執行順序

#### 場景：顯示下一個未封鎖的更改
- **何時** 使用者執行 `openspec change next`
- **那麼** CLI 應列出未被未解決的依賴項阻止的更改
- **並且** 當有多個選項可用時應使用確定性平局打破

### 要求：分離式大變鷹架
更改 CLI 應支援現有大型更改的腳手架子切片。

#### 場景：拆分命令腳手架子級更改
- **何時** 使用者執行 `openspec change split <change-id>`
- **那麼** CLI 應使用提案/任務存根建立子變更目錄
- **且**產生的元資料應包括 `parent` 和依賴關係連結回源更改

#### 場景：對已拆分的變更重新執行拆分
- **何時** 使用者執行 `openspec change split <change-id>` 對於其產生的子目錄已存在的父級
- **那麼** CLI 將失敗並出現確定性、可操作的錯誤
- **且** 不應改變現有的子變更內容，除非要求明確覆蓋模式
