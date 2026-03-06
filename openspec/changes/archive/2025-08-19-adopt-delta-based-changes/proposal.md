# 採用基於增量的規格變更

## 為什麼

目前在變更提案中儲存完整的未來狀態的方法會帶來糟糕的審核體驗。當審查 GitHub 上的更改時，審閱者會看到整個規範文件（通常超過 100 行）以綠色“添加”，從而無法識別實際更改的內容。隨著最近採用結構化格式，我們現在有了清晰的部分邊界，可以實現更好的方法：僅儲存添加和修改。

## 有什麼變化

僅儲存實際變更的需求，而不儲存完整的未來狀態：

- **新增的要求**：引入新功能
- **修改的要求**：現有要求被更改（必須與當前標題相符）
- **刪除的要求**：已棄用的功能
- **重新命名要求**：明確標頭變更（例如， `FROM: Old Name` → `TO: New Name`)

歸檔命令將使用標準化標頭匹配（修剪前導/尾隨空格）以程式設計方式應用這些增量，而不是手動複製整個檔案。

## 影響

**受影響的規範**：openspec-conventions、cli-archive、cli-diff

**好處**：
- GitHub 差異僅顯示實際變更（25 行而不是 150 多行）
- 審閱者可以立即看到新增、修改或刪除的內容
- 當兩個變更修改相同的需求時，衝突會更加明顯
- Archive 命令可以以程式設計方式應用更改

**格式**：僅限增量格式 - 所有變更都必須使用 ADDED/MODIFIED/REMOVED 部分。

## 例子

不儲存 150 行完整的未來規範，而只儲存：

```markdown
# User Authentication - Changes

## ADDED Requirements

### Requirement: OAuth Support
Users SHALL authenticate via OAuth providers including Google and GitHub.

#### Scenario: OAuth login flow
- **WHEN** user selects OAuth provider
- **THEN** redirect to provider authorization
- **AND** exchange authorization code for tokens

## MODIFIED Requirements

### Requirement: Session Management
Sessions SHALL expire after 30 minutes of inactivity.

#### Scenario: Inactive session timeout  
- **WHEN** no activity for 30 minutes ← (was 60 minutes)
- **THEN** invalidate session token
- **AND** require re-authentication

## RENAMED Requirements
- FROM: `### Requirement: Basic Authentication`
- TO: `### Requirement: Email Authentication`
```

這使得審查更加集中並且變更更加明確。

## 衝突解決

當兩個變更修改相同的需求標頭時，Git 自然會偵測到衝突。這實際上比全狀態儲存更好，在全狀態儲存中，Git 可能會默默地合併不相容的變更。

## 決策和產品指南

為了保持歸檔流程精簡且可預測，需要做出以下決定：

- 新規範建立：當目標規範不存在時，自動產生最小框架並僅插入新增的需求。骨架格式：
  - `# [Spec Name] Specification`
  - `## Purpose` 帶佔位符：“TBD — 由歸檔更改 [更改名稱] 建立。歸檔後更新目的。”
  - `## Requirements`
  - 如果不存在的規範包含 MODIFIED/REMOVED/RENAMED，則中止並先透過 ADDED-only 進行建立。

- 需求識別：透過精確的標題來匹配需求 `### Requirement: [Name]` 僅修剪標準化和區分大小寫的比較。使用需求區塊提取器，保留準確的標頭並捕獲主要規格和增量檔案的完整內容（包括場景）。

- 應用程式順序與原子性：依 RENAMED → REMOVED → MODIFIED → ADDED 的順序套用增量。首先驗證所有操作，在記憶體中應用，然後將每個規範寫入一次。如果驗證失敗，則中止而不寫入部分結果。顯示所有規格的總計總計行： `Totals: + A, ~ M, - R, → N`.

- 驗證矩陣：強制 MODIFIED/REMOVED 存在；添加不存在； RENAMED FROM 存在，而 TO 不存在；所有操作後不重複；並且沒有橫截面衝突（例如，MODIFIED 和 REMOVED 中的相同項目）。當重新命名和修改應用於相同專案時，MODIFIED 必須引用 NEW 標頭。

- 冪等性：保持 v1 簡單。在前提條件失敗時中止（例如，ADDED 已存在）並出現明顯錯誤。不要在 v1 中實現空操作檢測。

- 輸出和使用者體驗：對於每個規範，使用標準符號顯示操作計數 `+ ~ - →`。可以選擇在末尾包含一個簡短的匯總總計行。保持訊息簡潔且可操作。

- 錯誤訊息：將訊息標準化為 `[spec] [operation] failed for header "### Requirement: X" — reason`。中止時，明確聲明： `Aborted. No files were changed.`
- 小節：要求下的任何小節（例如， `#### Scenario: ...`) 在解析和應用過程中逐字保留。

- 向後相容性：拒絕現有規範的完整未來狀態規範副本，並指導轉換為增量。允許使用上面的框架透過僅添加的增量來建立全新的規格。

- 試運轉：延後到 v1 以保持最小範圍。