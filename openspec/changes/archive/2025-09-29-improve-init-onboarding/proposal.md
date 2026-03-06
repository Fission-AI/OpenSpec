## 為什麼
目前的 `openspec init` 流程假定單一輔助選擇，並在 OpenSpec 結構已存在後停止。這使得入職感覺很僵化：團隊無法一次設定多個工具，他們不知道重新整理了哪些文件，並且即使涉及其他助手，成功副本也始終引用Claude。

## 有什麼變化
- 允許在期間選擇多個助手 `openspec init`，包括在單次執行中重新整理現有設定。
- 提供更豐富的入門副本，總結已建立或重新整理的工具文件，並指導使用者執行每個助理的後續步驟。
- 對齊產生的 AI 指令內容和規範，以便 CLAUDE.md 和 AGENTS.md 共享相同的 OpenSpec 指導。
- 更新規格和測試以涵蓋多選提示、改進的摘要和擴展模式協調。

## 影響
- 規格： `cli-init`
- 代碼： `src/core/init.ts`, `src/core/config.ts`, `src/core/templates/*`, `src/core/configurators/*`
- 測試： `test/core/init.test.ts`, `test/core/update.test.ts`
