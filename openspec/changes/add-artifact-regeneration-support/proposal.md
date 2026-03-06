# 添加神器再生支援

## 問題

目前，OPSX 工作流程中**無法重新產生工件**：

- `/opsx:apply` 只讀取磁碟上的所有內容
- `/opsx:continue` 只建立下一個工件 - 不會觸及現有的工件

如果您編輯 `design.md` 後 `tasks.md` 存在，您唯一的選擇是：
1. 手動刪除tasks.md，然後執行 `/opsx:continue`
2. 手動編輯tasks.md

該文件聲稱您可以“在飛行中更新工件並繼續”，但沒有實際支援這一點的機制。

## 建議的解決方案

兩部分：

### 第 1 部分：陳舊性檢測
新增工件陳舊性檢測 `/opsx:apply`:

1. **追蹤修改時間**：產生工件時，記錄其依賴項的 mtime
2. **檢測陳舊性**：何時 `/opsx:apply` 執行，檢查自生成tasks.md以來上游工件（design.md、specs）是否已被修改
3. **提示使用者**：如果過時，請詢問：“生成任務後修改了設計。您想使用以下命令重新生成任務嗎？” `/opsx:continue`?"

## 使用者體驗

### 視覺：無縫飛行中校正

這是我們想要啟用的工作流程（目前已記錄但不支援）：

```
You: /opsx:apply

AI:  Working through tasks...
     ✓ Task 1.1: Created caching layer
     ✓ Task 1.2: Added cache invalidation

     Working on 1.3: Implement TTL...
     I noticed the design assumes Redis, but your project uses
     in-memory caching. Should I update the design?

You: Yes, update it to use the existing cache module.

AI:  Updated design.md to use CacheManager from src/cache/
     Updated tasks.md with revised implementation steps
     Continuing implementation...
     ✓ Task 1.3: Implemented TTL using CacheManager
     ...
```

**無需重新啟動。 ** 只需更新工件並繼續。

### 過時警告使用者體驗

當使用者手動編輯上游工件時：

```
$ /opsx:apply

⚠️  Detected changes to upstream artifacts:
    - design.md modified 5 minutes ago (after tasks.md was generated)

Options:
1. Regenerate tasks (recommended)
2. Continue anyway with current tasks
3. Cancel

>
```

### 第二部分：再生能力

新增一種重新產生特定工件的方法：

```bash
# Option A: Flag on continue
/opsx:continue --regenerate tasks

# Option B: Separate command
/opsx:regenerate tasks

# Option C: Interactive prompt when staleness detected
/opsx:apply
# "Design changed. Regenerate tasks? [y/N]"
```

## 技術途徑

### 選項 A：元資料文件
店鋪 `.openspec-meta.json` 在更改目錄中：
```json
{
  "tasks.md": {
    "generated_at": "2025-01-24T10:00:00Z",
    "dependencies": {
      "design.md": "2025-01-24T09:55:00Z",
      "specs/feature/spec.md": "2025-01-24T09:50:00Z"
    }
  }
}
```

### 選項 B：前題
將 YAML frontmatter 加入到產生的工件中：
```markdown
---
generated_at: 2025-01-24T10:00:00Z
depends_on:
  - design.md@2025-01-24T09:55:00Z
---
# Tasks
...
```

### 選項 C：基於 Git
使用 git 檢測自下游上次修改以來上游檔案是否發生變更。不需要額外的元資料，但需要 git。

## Non-Goals

- 自動再生（使用者應始終選擇）
- 完全阻止（只是警告）
- 追蹤程式碼檔案更改（僅限工件依賴項）

## 依賴關係

- 應在之後實施 `fix-midflight-update-docs` 所以文件首先是準確的
- 如果需要，可以與該更改相結合

## 成功標準

- 當使用過時的工件進行應用時，使用者會收到警告
- 如果需要，清除再生路徑
- 沒有誤報（僅在真正過時時發出警告）
- 文件聲明成為事實
