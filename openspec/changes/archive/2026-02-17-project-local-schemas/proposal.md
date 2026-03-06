# 專案本地模式

## 概括

新增專案本地架構解析（`./openspec/schemas/`）作為模式查找鏈中的最高優先權。這使團隊能夠使用其儲存庫對自訂工作流程模式進行版本控制。

## 動機

目前，模式解析為 2 層：
1. 用戶覆蓋： `~/.local/share/openspec/schemas/<name>/`
2. 包內建： `<npm-package>/schemas/<name>/`

這會為團隊帶來摩擦：
- 必須透過 XDG 路徑為每台機器設定自訂架構
- 無法透過版本控制共享架構
- 團隊工作流程沒有單一的事實來源

## 設計決策

### 三級決議順序

```
1. ./openspec/schemas/<name>/                    # Project-local (NEW)
2. ~/.local/share/openspec/schemas/<name>/       # User global (XDG)
3. <npm-package>/schemas/<name>/                 # Package built-in
```

專案本地化具有最高優先級，從而能夠：
- 版本控制的自訂工作流程
- 透過 git 自動團隊共享
- 無需每台機器設置

### 分叉模型（非繼承）

自訂模式是完整的定義，而不是擴展。沒有 `extends` keyword.

**理由：** 簡單。繼承增加了複雜性（衝突解決、部分覆蓋、調試「這是從哪裡來的？」）。需要自訂工作流程的使用者可以完全定義它們。這使得心智模式變得簡單：
- 使用預設 → 設定路徑（請參閱項目設定變更）
- 需要不同的結構→分叉路徑（定義自己的）

### 目錄結構

```
openspec/
├── schemas/                      # Project-local schemas
│   └── my-workflow/
│       ├── schema.yaml           # Full schema definition
│       └── templates/
│           ├── artifact1.md
│           ├── artifact2.md
│           └── ...
└── changes/
```

### 模式命名

項目本地模式透過其目錄名稱引用：
- `openspec/schemas/my-workflow/` → 引用為 `my-workflow`
- 與 `--schema my-workflow` 旗幟
- 與 `schema: my-workflow` 在 config.yaml 中（請參閱專案設定變更）

## 範圍

### 範圍內

- 添加 `getProjectSchemasDir()` 解析器函數
- 更新 `getSchemaDir()` 首先檢查項目本地
- 更新 `listSchemas()` 包括項目模式
- 更新 `listSchemasWithInfo()` 包括 `source: 'project'`
- 更新 `schemasCommand` 輸出以顯示專案架構

### 超出範圍

- 架構管理CLI (`openspec schema copy/which/diff/reset`) - 未來的增強
- 模式繼承/擴展 - 明確不支援
- 模板級覆蓋（部分分叉）- 明確不支援

## 使用者體驗

### 建立自訂架構

```bash
# Create schema directory
mkdir -p openspec/schemas/my-workflow/templates

# Define schema
cat > openspec/schemas/my-workflow/schema.yaml << 'EOF'
name: my-workflow
version: 1
description: Our team's planning workflow

artifacts:
  - id: research
    generates: research.md
    template: research.md
    description: Background research
    requires: []

  - id: proposal
    generates: proposal.md
    template: proposal.md
    description: Change proposal
    requires: [research]

  - id: tasks
    generates: tasks.md
    template: tasks.md
    description: Implementation tasks
    requires: [proposal]
EOF

# Create templates
echo "# Research\n\n..." > openspec/schemas/my-workflow/templates/research.md
# ... etc
```

### 使用自訂架構

```bash
# Via CLI flag
openspec new change add-feature --schema my-workflow
openspec status --change add-feature --schema my-workflow

# Via config.yaml (requires project-config change)
# schema: my-workflow
```

### 團隊分享

```bash
# Commit to repo
git add openspec/schemas/
git commit -m "Add custom workflow schema"
git push

# Team members get it automatically
git pull
openspec status --change add-feature --schema my-workflow  # Just works
```

## 實施說明

### 要修改的文件

| 文件 | 變化 |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | 添加 `getProjectSchemasDir()`，更新解析順序 |
| `src/commands/artifact-workflow.ts` | 更新 `schemasCommand` 顯示來源 |

### 項目根檢測

使用現有的 `findProjectRoot()` 模式或目前工作目錄。專案本地模式目錄始終是 `./openspec/schemas/` 相對於專案根目錄。

### 來源說明

`listSchemasWithInfo()` 回報 `source: 'project' | 'user' | 'package'`。更新類型定義和實作。

## 測試注意事項

- 使用本機架構建立臨時項目，驗證解析優先權
- 驗證本機架構是否覆蓋同名的使用者覆蓋
- 核實 `listSchemas()` 包含專案架構
- 核實 `schemasCommand` 顯示正確的來源標籤

## 相關變更

- **專案設定**：新增 `config.yaml` 和 `schema` 可以引用項目本地模式的字段
