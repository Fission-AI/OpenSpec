# 變革創造規範

## 目的
提供用於建立和驗證 OpenSpec 更改目錄的程式設計實用程式。
## 要求
### 要求：創造變革
系統應提供以程式設計方式建立新更改目錄的功能。

#### 場景：創造改變
- **什麼時候** `createChange(projectRoot, 'add-auth')` 被稱為
- **然後**系統建立 `openspec/changes/add-auth/` 目錄

#### 場景：重複更改被拒絕
- **什麼時候** `createChange(projectRoot, 'add-auth')` 被稱為和 `openspec/changes/add-auth/` 已經存在
- **然後** 系統拋出錯誤，表示更改已存在

#### 場景：如果需要，建立父目錄
- **什麼時候** `createChange(projectRoot, 'add-auth')` 被稱為和 `openspec/changes/` 不存在
- **然後**系統建立包含父目錄的完整路徑

#### 場景：無效的更改名稱被拒絕
- **什麼時候** `createChange(projectRoot, 'Add Auth')` 使用無效名稱調用
- **然後** 系統拋出驗證錯誤

### 要求：更改名稱驗證
系統應驗證更改名稱是否遵循短橫線大小寫約定。

#### 場景：接受有效的烤肉串名稱
- **何時** 更改名稱，例如 `add-user-auth` 已驗證
- **那麼** 驗證返回 `{ valid: true }`

#### 場景：接受數字後綴
- **何時** 更改名稱，例如 `add-feature-2` 已驗證
- **那麼** 驗證返回 `{ valid: true }`

#### 場景：接受單字
- **何時** 更改名稱，例如 `refactor` 已驗證
- **那麼** 驗證返回 `{ valid: true }`

#### 場景：大寫字元被拒絕
- **何時** 更改名稱，例如 `Add-Auth` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：空間被拒絕
- **何時** 更改名稱，例如 `add auth` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：底線被拒絕
- **何時** 更改名稱，例如 `add_auth` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：特殊字元被拒絕
- **何時** 更改名稱，例如 `add-auth!` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：前導連字符被拒絕
- **何時** 更改名稱，例如 `-add-auth` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：尾隨連字符被拒絕
- **何時** 更改名稱，例如 `add-auth-` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

#### 場景：連續連字符被拒絕
- **何時** 更改名稱，例如 `add--auth` 已驗證
- **那麼** 驗證返回 `{ valid: false, error: "..." }`

