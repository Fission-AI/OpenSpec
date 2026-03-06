## 為什麼
在 OpenSpec 中添加對 Cline（VS Code 擴展）的支援，使開發人員能夠使用 Cline 的 AI 驅動的編碼功能來實現規範驅動的開發工作流程。

## 有什麼變化
- 新增用於提案、應用和歸檔操作的 Cline 斜線命令設定器
- 新增 Cline root CLINE.md 設定器以取得專案級說明
- 新增 Cline 範本匯出
- 更新工具和斜線命令註冊表以包含 Cline
- 添加全面的測試覆蓋率
- **破壞性**：無 - 這是附加功能

## 影響
- 受影響的規範：cli-init（新工具選項）
- 受影響的程式碼：src/core/configurators/slash/cline.ts、src/core/configurators/cline.ts、登錄文件
- 新檔案：.clinerules/openspec-*.md、CLINE.md
