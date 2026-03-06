## 情境

這是工件追蹤器 POC 的 Slice 2。目標是提供用於以程式設計方式建立更改目錄的實用程式。

**目前狀態：** 沒有程式設計方式來建立變更。使用者必須手動建立目錄。

**建議狀態：** 用於透過名稱驗證進行變更建立的實用功能。

## 目標/非目標

### 目標
- **添加** `createChange()` 建立更改目錄的函數
- **添加** `validateChangeName()` 用於 kebab-case 驗證的函數
- **啟用**自動化（Claude命令、腳本）來建立更改

### Non-Goals
- 重構現有的 CLI 指令（它們運作正常）
- 建立抽象層或管理器類
- 改變方式 `ListCommand` 或者 `ChangeCommand` 工作

## 決定

### 決策 1：簡單效用函數

**選擇**：新增功能 `src/utils/change-utils.ts` - 沒有課。

```typescript
// src/utils/change-utils.ts

export function validateChangeName(name: string): { valid: boolean; error?: string }

export async function createChange(
  projectRoot: string,
  name: string
): Promise<void>
```

**為什麼**：
- 簡單，無抽象開銷
- 易於測試
- 易於在需要的地方導入
- 匹配現有的實用模式 `src/utils/`

**考慮的替代方案**：
- ChangeManager 類別：被拒絕 - 對 2 個功能進行過度設計
- 新增至現有指令：已拒絕 - 將 CLI 與可重複使用邏輯混合

### 決策 2：Kebab-Case 驗證模式

**選擇**：驗證名稱 `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

有效的： `add-auth`, `refactor-db`, `add-feature-2`, `refactor`
無效的： `Add-Auth`, `add auth`, `add_auth`, `-add-auth`, `add-auth-`, `add--auth`

**為什麼**：
- 檔案系統安全（無特殊字元）
- URL 安全性（用於未來的 Web UI）
- 與儲存庫中現有的變更命名一致

## 文件變更

### 新文件
- `src/utils/change-utils.ts` - 實用功能
- `src/utils/change-utils.test.ts` - 單元測試

### 修改文件
- 沒有任何

## 風險/權衡

| 風險 | 減輕 |
|------|------------|
| 功能可能無法涵蓋所有用例 | 從簡單開始，根據需要進行擴展 |
| 命名與未來工作衝突 | 使用清晰、具體的函數名稱 |
