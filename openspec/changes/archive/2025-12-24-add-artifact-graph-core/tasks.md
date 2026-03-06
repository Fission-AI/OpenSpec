## 1. 類型定義
- [x] 1.1 建立 `src/core/artifact-graph/types.ts` 與 Zod 模式（`ArtifactSchema`, `SchemaYamlSchema`）並通過推斷類型 `z.infer<>`
- [x] 1.2 定義 `CompletedSet` （放<string>), `BlockedArtifacts`， 和 `ArtifactGraphResult` 執行時狀態的類型

## 2. 模式解析器
- [x] 2.1 建立 `src/core/artifact-graph/schema.ts` 通過 YAML 加載和 Zod 驗證 `.safeParse()`
- [x] 2.2 實作依賴引用驗證（確保 `requires` 引用有效的工件 ID）
- [x] 2.3 實現重複工件ID檢測
- [x] 2.4 在模式載入期間新增循環偵測（錯誤格式：「偵測到循環依賴：A → B → C → A」）

## 3. Artifact Graph 核心
- [x] 3.1 建立 `src/core/artifact-graph/graph.ts` 與 ArtifactGraph 類
- [x] 3.2 實施 `fromYaml(path)` - 從模式檔案載入圖表
- [x] 3.3 實施 `getBuildOrder()` - 透過卡恩演算法進行拓樸排序
- [x] 3.4 實施 `getArtifact(id)` - 檢索單一工件定義
- [x] 3.5 實施 `getAllArtifacts()` - 列出所有工件

## 4. 狀態檢測
- [x] 4.1 建立 `src/core/artifact-graph/state.ts` 具有狀態檢測邏輯
- [x] 4.2 實作簡單路徑的檔案存在檢查
- [x] 4.3 為多文件工件實現全域模式匹配
- [x] 4.4 實施 `detectCompleted(graph, changeDir)` - 掃描檔案系統並返回CompletedSet
- [x] 4.5 優雅地處理缺少的changeDir（返回空的CompletedSet）

## 5. 準備計算
- [x] 5.1 實施 `getNextArtifacts(graph, completed)` - 尋找所有部門都已完成的工件
- [x] 5.2 實施 `isComplete(graph, completed)` - 檢查所有工件是否已完成
- [x] 5.3 實施 `getBlocked(graph, completed)` - 返回 BlockedArtifacts 地圖（artifact → unmet deps）

## 6. 模式解析
- [x] 6.1 建立 `src/core/artifact-graph/resolver.ts` 具有模式解析邏輯
- [x] 6.2 添加 `getGlobalDataDir()` 到 `src/core/global-config.ts` （有平台回退的 XDG_DATA_HOME）
- [x] 6.3 實施 `resolveSchema(name)` - 全球的 （`${XDG_DATA_HOME}/openspec/schemas/`) → 內建後備

## 7. 內建模式
- [x] 7.1 建立 `src/core/artifact-graph/schemas/spec-driven.yaml` （預設：提案→規格→設計→任務）
- [x] 7.2 建立 `src/core/artifact-graph/schemas/tdd.yaml` （替代方案：測試→實施→文件）

## 8. Integration
- [x] 8.1 建立 `src/core/artifact-graph/index.ts` 與公共出口

## 9. 測試
- [x] 9.1 測試：解析有效模式 YAML 回傳正確的工件圖
- [x] 9.2 測試：解析無效模式（缺少欄位）拋出描述性錯誤
- [x] 9.3 測試：重複的工件 ID 會引發錯誤
- [x] 9.4 測試：無效 `requires` 引用引發識別無效 ID 的錯誤
- [x] 9.5 測試：模式中的循環拋出錯誤列出循環路徑（例如，「A → B → C → A」）
- [x] 9.6 測試：計算建置順序傳回正確的拓樸順序（線性鏈）
- [x] 9.7 測試：計算建造順序正確處理鑽石依賴性
- [x] 9.8 測試：獨立工件依穩定順序傳回
- [x] 9.9 測試：空/缺失的changeDir返回空的CompletedSet
- [x] 9.10 測試：文件存在將工件標記為已完成
- [x] 9.11 測試：當檔案存在時，Glob 模式 specs/*.md 偵測為完整
- [x] 9.12 測試：空目錄的 Glob 模式未標記為完成
- [x] 9.13 測試：當沒有完成任何操作時，getNextArtifacts 僅傳回根工件
- [x] 9.14 測試：當所有 deps 完成時，getNextArtifacts 包含工件
- [x] 9.15 測試：getBlocked 傳回工件，其中列出了所有未滿足的依賴項
- [x] 9.16 測試：當所有工件完成時，isComplete() 傳回 true
- [x] 9.17 測試：當某些工件不完整時，isComplete() 傳回 false
- [x] 9.18 測試：模式解析在內建之前找到全域覆蓋
- [x] 9.19 測試：當沒有全域時，模式解析回退到內建
