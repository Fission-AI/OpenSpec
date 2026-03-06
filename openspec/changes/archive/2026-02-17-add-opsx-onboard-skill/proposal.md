## 為什麼

執行的用戶 `openspec init` 留下了文件，但沒有明確的實際使用系統的路徑。 「我已經設定了OpenSpec」和「我瞭解工作流程」之間存在差距。入職技能將指導使用者完成程式碼庫中實際任務的第一個完整變更週期，並透過這樣做來教授工作流程。

## 有什麼變化

- 新增新的 `/opsx:onboard` 指導用戶完成第一次 OpenSpec 變更的技能
- 為編輯器整合添加相應的斜杠命令模板
- 該技能將：
  - 分析使用者的程式碼庫以建議適當範圍的入門任務
  - 瀏覽完整的工作流程（探索→新→提案→規格→設計→任務→應用程式→存檔）
  - 提供旁白，解釋每個步驟的發生
  - 導致使用者程式碼庫發生真正的、已實施的更改

## 能力

### 新功能
- `opsx-onboard-skill`：透過旁白和程式碼庫感知任務建議引導使用者完成第一個完整的 OpenSpec 工作流程週期的入門技能

### 修改後的功能
<!-- No existing specs are being modified - this is purely additive -->

## 影響

- `src/core/templates/skill-templates.ts`： 添加 `getOnboardSkillTemplate()` 和 `getOpsxOnboardCommandTemplate()` 功能
- `src/core/shared/skill-generation.ts`：將新的技能和命令範本註冊到 `getSkillTemplates()` 和 `getCommandTemplates()`
- 用戶執行 `openspec init` 或者 `openspec update` 將會產生新的技能/命令文件
