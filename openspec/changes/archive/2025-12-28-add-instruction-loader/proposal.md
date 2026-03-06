## 為什麼

Slice 1（工件圖）提供圖操作和狀態偵測。 Slice 2 (change-utils) 提供變更建立。我們現在需要能夠加載工件模板並透過特定於更改的上下文來豐富它們，以便使用者/代理知道下一步要建立什麼。

## 有什麼變化

- 從架構目錄新增模板解析（使用來自 `restructure-schema-directories`)
- 新增指令豐富，將更改上下文注入模板
- 增加 CLI 輸出的狀態格式
- 新的 `instruction-loader` 能力

## 依賴關係

- 需要 `restructure-schema-directories` 首先實施（模式作為具有共置模板的目錄）

## 影響

- 受影響的規格：新 `instruction-loader` 規格
- 受影響的代碼： `src/core/artifact-graph/` （新文件）
- 建立在： `artifact-graph` （切片 1），使用 `ArtifactGraph`, `detectCompleted`, `resolveSchema`
