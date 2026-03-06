## 為什麼

沒有程式設計方式來建立新的更改目錄。使用者必須手動：
1. 創造 `openspec/changes/<name>/` 目錄
2. 建立一個 `proposal.md` 文件
3. 希望他們能正確命名

這很容易出錯並且會阻止自動化（例如 Claude 命令、腳本）。

**此提案新增：**
1. `createChange(projectRoot, name)` - 以程式設計方式建立更改目錄
2. `validateChangeName(name)` - 強制執行短橫線命名約定

## 有什麼變化

### 新實用程式

| 功能 | 描述 |
|----------|-------------|
| `createChange(projectRoot, name)` | 創造 `openspec/changes/<name>/` 目錄 |
| `validateChangeName(name)` | 退貨 `{ valid: boolean; error?: string }` |

### 名稱驗證規則

圖案： `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

| 有效的 | 無效的 |
|-------|---------|
| `add-auth` | `Add-Auth` （大寫） |
| `refactor-db` | `add auth` （空格） |
| `add-feature-2` | `add_auth` （底線） |
| `refactor` | `-add-auth` （前導連字號） |

### 地點

新文件： `src/utils/change-utils.ts`

簡單的實用函數 - 沒有類，沒有抽象層。

## 影響

- **受影響的規格**：無
- **受影響的代碼**：無（僅限新實用程式）
- **新文件**： `src/utils/change-utils.ts`
- **重大變更**：無
