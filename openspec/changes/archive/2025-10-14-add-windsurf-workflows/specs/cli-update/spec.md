## 修改後的要求
### 需求：Slash 指令更新
更新命令應重新整理已設定工具的現有斜杠命令文件，而不建立新的。

#### 場景：更新 Claude 程式碼的斜線指令
- **什麼時候** `.claude/commands/openspec/` 包含 `proposal.md`, `apply.md`， 和 `archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新遊標的斜杠指令
- **什麼時候** `.cursor/commands/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 OpenCode 的斜杠指令
- **什麼時候** `.opencode/command/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用共用範本重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：更新 Windsurf 的斜線命令
- **什麼時候** `.windsurf/workflows/` 包含 `openspec-proposal.md`, `openspec-apply.md`， 和 `openspec-archive.md`
- **然後** 使用包含 OpenSpec 標記的共享模板重新整理每個文件
- **並**確保範本包含相關工作流程階段的說明

#### 場景：缺少斜線指令文件
- **當**工具缺少斜線指令檔時
- **那麼** 在更新期間不要建立新文件
