# 設計：新增/opsx:驗證技能

## 架構決策：透過設定命令動態生成

### 情境

所有現有的 opsx 實驗技能（explore、new、 continue、apply、ff、sync、archive）都是在使用者執行時動態產生的 `openspec artifact-experimental-setup`。它們不是簽入儲存庫的手動建立的檔案。

### 決定

**將驗證整合到現有的工件實驗設定係統中，而不是建立靜態技能文件。 **

### 基本原理

1. **一致性**：所有 7 種現有 opsx 技能都遵循此模式。新增驗證作為第 8 項技能應該遵循相同的架構。

2. **可維護性**：模板函數 `skill-templates.ts` 是唯一的事實來源。重新執行安裝程式時，對技能定義的變更會自動傳播到所有使用者。

3. **分發**：用戶執行時自動獲得驗證技能 `openspec artifact-experimental-setup`，就像所有其他 opsx 技能一樣。無需特殊安裝步驟。

4. **版本控制**：技能是根據已安裝的 npm 軟體包版本產生的，確保 CLI 版本和技能行為之間的一致性。

### 實施方式

#### 1. 模板函數

新增兩個模板函數 `src/core/templates/skill-templates.ts`:

```typescript
export function getVerifyChangeSkillTemplate(): SkillTemplate
export function getOpsxVerifyCommandTemplate(): CommandTemplate
```

它們會傳回技能定義（對於代理技能）和斜線命令定義（對於明確呼叫）。

#### 2. 設定集成

更新 `artifactExperimentalSetupCommand()` 在 `src/commands/artifact-workflow.ts`:

- 導入兩個模板函數
- 新增驗證到 `skills` 數組（位置8）
- 新增驗證到 `commands` 數組（位置8）
- 將幫助文字更新為列表 `/opsx:verify`

#### 3. 產生的工件

當用戶執行時 `openspec artifact-experimental-setup`，該命令建立：

- `.claude/skills/openspec-verify-change/SKILL.md` - 特工技能格式
- `.claude/commands/opsx/verify.md` - 斜槓指令格式

兩者都是從模板函數生成的，並自動添加 YAML frontmatter。

### 考慮的替代方案

**替代方案 1：儲存庫中的靜態技能文件**

創造 `.claude/skills/openspec-verify-change/SKILL.md` 作為 OpenSpec 儲存庫中的靜態檔案。

**被拒絕的原因是：**
- 與所有其他 opsx 技能不一致
- 需要使用者手動複製/更新文件
- 版本控制變得複雜（儲存庫版本與已安裝的軟體包版本）
- 打破既定模式

**替代方案 2：單獨驗證設定指令**

添加 `openspec setup-verify` 作為一個單獨的命令。

**被拒絕的原因是：**
- 設置體驗支離破碎
- 用戶需要執行多個命令
- 如果我們將來添加更多技能，則無法擴展
- 違背了「一次設置，獲得一切」的概念

### Trade-offs

**優點：**
- 與現有架構一致
- 用戶零額外設定負擔
- 易於更新和維護
- 自動版本相容

**缺點：**
- 初始實作稍微複雜一些（模板函數+整合）
- 需要瞭解設定係統（但這已經記錄在案）

### 確認

如果滿足以下條件，則實現正確遵循此設計：

1. 兩個模板函數都存在於 `skill-templates.ts`
2. 驗證出現在技能和命令數組中 `artifact-workflow.ts`
3. 幫助文本提及 `/opsx:verify`
4. 執行 `openspec artifact-experimental-setup` 生成技能和命令文件
5. 建置成功，沒有 TypeScript 錯誤
