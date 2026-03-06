## 1. 實施
- [x] 1.1 在src/core/configurators/slash/cline.ts中建立ClineSlashCommandConfigurator類
- [x] 1.2 在src/core/configurators/cline.ts中建立ClineConfigurator類
- [x] 1.3 建立cline-template.ts用於模板導出
- [x] 1.4 定義Cline規則的檔案路徑(.clinerules/)
- [x] 1.5 建立 Cline 特定的 frontmatter（Markdown 標題格式）
- [x] 1.6 在slash/registry.ts中註冊Cline
- [x] 1.7 在configurators/registry.ts中註冊Cline
- [x] 1.8 將Cline加入到config.ts中的AI_TOOLS中
- [x] 1.9 在 templates/index.ts 中加入 getClineTemplate()
- [x] 1.10 使用 Cline 文件更新 README

## 2. 測試
- [x] 2.1 增加CLINE.md建立和更新的初始化測試
- [x] 2.2 新增.clinerules/檔案建立的初始化測試
- [x] 2.3 增加CLINE.md更新的更新測試
- [x] 2.4 新增.clinerules/檔案重新整理的更新測試
- [x] 2.5 測試與 openspec init --tools cline 的集成
- [x] 2.6 驗證所有 225 項測試均通過
