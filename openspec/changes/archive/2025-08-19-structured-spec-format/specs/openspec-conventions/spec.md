# OpenSpec 約定規範

## 新增要求

### 要求：採用結構化格式

行為規範應採用結構化格式 `### Requirement:` 和 `#### Scenario:` 標頭作為預設值。

#### 場景：使用結構化標題來表達行為

- **何時** 記錄行為要求
- **然後**使用 `### Requirement:` 對於要求
- **和**使用 `#### Scenario:` 適用於粗體 WHEN/THEN/AND 關鍵字的場景

## 目的

OpenSpec 約定應定義如何記錄系統功能、如何提出和追蹤變更以及規範如何隨時間演變。此元規範充當 OpenSpec 自己的約定的事實來源。

## 核心原則

該系統應遵循以下原則：
- 規格反映了目前建置和部署的內容
- 更改包含應更改內容的建議
- 人工智慧驅動文件流程
- 規範是與部署的程式碼保持同步的即時文檔

## 目錄結構

當 OpenSpec 項目初始化時
那麼它應該有這樣的結構：
```
openspec/
├── project.md              # Project-specific context
├── README.md               # AI assistant instructions
├── specs/                  # Current deployed capabilities
│   └── [capability]/       # Single, focused capability
│       ├── spec.md         # WHAT and WHY
│       └── design.md       # HOW (optional, for established patterns)
└── changes/                # Proposed changes
    ├── [change-name]/      # Descriptive change identifier
    │   ├── proposal.md     # Why, what, and impact
    │   ├── tasks.md        # Implementation checklist
    │   ├── design.md       # Technical decisions (optional)
    │   └── specs/          # Complete future state
    │       └── [capability]/
    │           └── spec.md # Clean markdown (no diff syntax)
    └── archive/            # Completed changes
        └── YYYY-MM-DD-[name]/
```

## 規格格式

### 要求：行為規範的結構化格式

行為規範應使用具有一致的節標題和關鍵字的結構化格式，以確保視覺一致性和可解析性。

#### 場景：撰寫需求部分

- **何時** 在行為規範中記錄要求
- **那麼** 使用有格式的 3 級標題 `### Requirement: [Name]`
- **AND** 緊接在後的是描述核心行為的 SHALL 語句
- **並且** 保持需求名稱具有描述性且少於 50 個字符

#### 場景：記錄場景

- **何時** 記錄特定行為或用例
- **那麼** 使用有格式的 4 級標題 `#### Scenario: [Description]`
- **並且** 使用有粗體關鍵字的要點作為步驟：
  - **給定**初始狀態（可選）
  - **WHEN** 用於條件或觸發器
  - **然後** 預期結果
  - **和** 用於其他結果或條件

#### 場景：新增實作細節

- **何時** 步驟需要更多詳細信息
- **那麼** 在主要步驟下使用子項目符號
- **並且**保持一致的縮排
  - 子項目符號提供範例或細節
  - 保持子項目符號簡潔

### 要求：格式靈活性

結構化格式應是行為規範的預設格式，但當更適合內容類型時可以使用替代格式。

#### 場景：記錄 API 規格

- **何時** 記錄 REST API 端點或 GraphQL 模式
- **那麼** OpenAPI、GraphQL SDL 或類似格式可以使用
- **並且** 規範應清楚地表明正在使用的格式
- **並且**行為方面仍應遵循結構化格式

#### 場景：記錄資料模式

- **何時** 記錄資料結構、資料庫模式或設定
- **那麼** JSON 可以使用架構、SQL DDL 或類似格式
- **並且**包括行為規則和約束的結構化格式

#### 場景：使用簡化格式

- **何時** 記錄簡單的功能，無需複雜的場景
- **THEN** 可以使用沒有完整結構的簡化 WHEN/THEN 格式
- **並且** 這應該在能力範圍內一致

## 更改儲存約定

### 未來狀態儲存

建立變更提案時
然後儲存受影響規格的完整未來狀態
並使用乾淨的 markdown 不使用 diff 語法

這 `changes/[name]/specs/` 目錄應包含：
- 完整的規格文件，因為它們在更改後仍然存在
- 乾淨的降價，沒有 `+` 或者 `-` 前綴
- 最終預期狀態的所有格式和結構

### 提案格式

何時記錄更改
那麼提案應明確描述每項變更：

```markdown
**[Section or Behavior Name]**
- From: [current state/requirement]
- To: [future state/requirement]
- Reason: [why this change is needed]
- Impact: [breaking/non-breaking, who's affected]
```

這種顯式格式彌補了沒有內聯差異的缺陷，並確保審閱者準確地理解將發生什麼變化。

## 改變生命週期

變更過程應遵循以下狀態：

1. **提案**：人工智慧透過未來的狀態規範和明確的提案創造變化
2. **審查**：人類審查提案和未來狀態
3. **批准**：變更已批准實施
4. **實施**：遵循tasks.md清單（可跨越多個PR）
5. **部署**：更改已部署到生產中
6. **更新**：規格 `specs/` 已更新以符合部署的實際情況
7. **存檔**：更改已移至 `archive/YYYY-MM-DD-[name]/`

## 檢視更改

當審查提議的變更時
然後審閱者可以使用以下方式進行比較：
- GitHub 提交更改時的 PR 差異視圖
- 命令列： `diff -u specs/[capability]/spec.md changes/[name]/specs/[capability]/spec.md`
- 任何比較當前狀態與未來狀態的視覺差異工具

該系統依賴工具來產生差異而不是儲存它們。

## 能力命名

能力應使用：
- 動詞-名詞模式（例如， `user-auth`, `payment-capture`)
- 連字符的小寫名稱
- 單一焦點（每種能力一個責任）
- 無嵌套（扁平結構下 `specs/`)

## 當變更需要提案時

應為以下內容建立提案：
- 新特性或功能
- 對現有行為的重大改變
- 架構或模式變化
- 改變行為的效能優化
- 影響存取模式的安全性更新

以下情況不需要提案：
- 錯誤修復恢復預期行為
- 錯字或格式修復
- 不間斷的依賴更新
- 添加對現有行為的測試
- 文件說明

## 為什麼要採用這種方法

清潔的未來狀態儲存提供：
- **可讀性**：無 diff 語法污染
- **人工智慧相容性**：人工智慧工具理解的標準降價
- **簡單**：無需特殊解析或處理
- **與工具無關**：任何差異工具都可以顯示更改
- **明確意圖**：明確的提案文件推理

結構化格式新增：
- **視覺一致性**：需求和場景前綴使各個部分易於識別
- **可解析性**：一致的結構支援工具和自動化
- **靈活性**：在適當的情況下支援替代格式
- **逐步採用**：現有規範可以逐步遷移