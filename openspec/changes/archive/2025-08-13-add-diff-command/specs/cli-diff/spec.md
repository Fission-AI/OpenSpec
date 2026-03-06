# CLI Diff 指令規範

## 目的

這 `openspec diff` 該命令為開發人員提供了建議的規格更改與當前部署的規格之間的直觀比較。

## 命令語法

```bash
openspec diff [change-name]
```

## 行為

### 沒有參數

執行時 `openspec diff` 沒有參數
然後列出所有可用的更改 `changes/` 目錄（不包括存檔）
並提示用戶選擇更改

### 更改名稱

執行時 `openspec diff <change-name>`
然後比較所有規格文件 `changes/<change-name>/specs/` 以及相應的文件 `specs/`

### 差分輸出

對於更改中的每個規範文件：
- IF 檔案存在於兩個位置則顯示統一差異
- IF 檔案僅存在於變更中 THEN 顯示為新檔案（所有行均帶有 +）
- 如果檔案僅存在於目前規格中則顯示為已刪除（所有行均帶有 -）

### 顯示格式

diff 應使用標準統一 diff 格式：
- 前綴為的行 `-` 對於已刪除的內容
- 前綴為的行 `+` 添加內容
- 沒有前綴的行表示未更改的上下文
- 顯示正在比較的路徑的檔案頭

### 顏色支援

當終端支援顏色時：
- 刪除的行顯示為紅色
- 新增的行顯示為綠色
- 文件頭以粗體顯示
- 預設顏色的上下文線

### 錯誤處理

當指定的更改不存在時，顯示錯誤“更改'<name>' 未找到”
當沒有更改規格目錄時，則顯示“未發現 ' 的規格變更”<name>'"
當更改目錄不存在時，顯示“未找到 OpenSpec 更改目錄”

## 範例

```bash
# View diff for specific change
$ openspec diff add-auth-feature

--- specs/user-auth/spec.md
+++ changes/add-auth-feature/specs/user-auth/spec.md
@@ -10,6 +10,8 @@
 Users SHALL authenticate with email and password.
 
+Users MAY authenticate with OAuth providers.
+
 WHEN credentials are valid THEN issue JWT token.

# List all changes and select
$ openspec diff
Available changes:
  1. add-auth-feature
  2. update-payment-flow
  3. add-status-command
Select a change (1-3): 
```