# 實施任務

## 1.CLI行為和幫助
- [x] 1.1 取消棄用頂層 `openspec list`;標記 `change list` 已棄用，並附有警告指出 `openspec list`
- [x] 1.2 增加對清單規格的支援 `openspec list --specs` 並保留 `--changes` 作為預設值
- [x] 1.3 更新命令說明和 `--help` 輸出以強調動詞-名詞模式
- [x] 1.4 保留 `openspec spec ...` 和 `openspec change ...` 命令有效，但列印棄用通知

## 2. 核心列表邏輯
- [x] 2.1 擴展 `src/core/list.ts` 接受模式： `changes` （預設）或 `specs`
- [x] 2.2 實施 `specs` 清單：掃描 `openspec/specs/*/spec.md`，透過解析器計算需求計數，一致地格式化輸出
- [x] 2.3 兩種模式共享輸出結構；保留目前文字表；確保未來變化中的 JSON 平價

## 3. 規格和約定
- [x] 3.1 更新 `openspec/specs/cli-list/spec.md` 記錄 `--specs` （並且預設更改）
- [x] 3.2 更新 `openspec/specs/openspec-conventions/spec.md` 要求動詞-名詞 CLI 設計和棄用指南

## 4. 測試和文檔
- [x] 4.1 更新測試：確保 `openspec list` 適用於變更和規格；保持 `change list` 測試但斷言警告
- [ ] 4.2 更新 README 和任何使用文件以顯示新的主要命令
- [ ] 4.3 在repo CHANGELOG或README中加入遷移註釋

## 5. 後續行動（可選，不在本次變更中）
- [ ] 5.1 考慮 `openspec show --specs/--changes` 用於沒有 id 的發現
- [ ] 5.2 考慮 JSON 輸出 `openspec list` 和 `--json` 對於兩種模式


