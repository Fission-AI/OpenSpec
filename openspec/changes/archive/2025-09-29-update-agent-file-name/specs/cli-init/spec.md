## 修改後的要求

### 需求：建立目錄
此命令應建立包含所有必需目錄和檔案的完整 OpenSpec 目錄結構。

#### 場景：建立 OpenSpec 結構
- **什麼時候** `openspec init` 被執行
- **然後** 建立以下目錄結構：
```
openspec/
├── project.md
├── AGENTS.md
├── specs/
└── changes/
    └── archive/
```

### 需求：文件生成
該命令應產生具有適當內容的所需模板檔案以供立即使用。

#### 場景：生成模板文件
- **何時** 初始化 OpenSpec
- **然後**生成 `AGENTS.md` 包含 AI 助理的完整 OpenSpec 指令
- **並**生成 `project.md` 帶有專案上下文模板

### 要求：AI工具設定詳細信息

此指令應使用標記系統使用 OpenSpec 特定指令正確設定選定的 AI 工具。

#### 場景：建立新的 CLAUDE.md
- **何時** CLAUDE.md 不存在
- **然後** 建立新文件，其中 OpenSpec 內容包含在標記中，包括對 `@openspec/AGENTS.md`

### 要求：成功輸出

該命令應在成功初始化後提供清晰、可操作的後續步驟。

#### 場景：顯示成功訊息
- **何時** 初始化成功完成
- **然後** 包含提示：“請解釋 openspec/AGENTS.md 中的 OpenSpec 工作流程以及我應該如何與您合作完成此專案”
