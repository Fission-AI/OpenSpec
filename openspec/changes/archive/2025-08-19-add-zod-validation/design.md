# 設計：Zod驗證框架

## 架構決策

### 驗證等級
三層驗證系統：
1. **錯誤**：阻止解析的結構問題（必須修復）
2. **警告**：應解決的品質問題（建議修復）
3. **資訊**：改進建議（可選）

**理由：** 
- 逐步執行允許團隊逐步採用驗證
- CI/CD 可能因錯誤而失敗，但最初允許警告
- 資訊等級提供指導而不阻塞

### 驗證規則層次結構

#### 規格驗證規則
```
ERROR level:
- Missing ## Overview or ## Requirements sections
- Invalid heading hierarchy
- Malformed requirement/scenario structure

WARNING level:
- Requirements without scenarios
- Requirements missing SHALL keyword
- Empty overview section

INFO level:
- Very long requirement text (>500 chars)
- Scenarios without Given/When/Then structure
```

#### 更改驗證規則
```
ERROR level:
- Missing ## Why or ## What Changes sections
- Invalid delta operation types
- Malformed delta structure

WARNING level:
- Why section too brief (<50 chars)
- Deltas without clear descriptions
- Missing requirements in ADDED/MODIFIED

INFO level:
- Very long why section (>1000 chars)
- Too many deltas in single change (>10)
```

### 嚴格模式
- **預設**：顯示所有級別，僅因錯誤而失敗
- **--strict 標誌**：錯誤和警告都失敗
- **用例**：CI/CD 管道的品質逐漸提高

### 存檔命令安全
**問題：** 無效的規格可能會被存檔，從而污染存檔。

**解決方案：** 
1. 預存檔驗證（預設行為）
2. --no-validate 有保護措施的標誌：
   - 互動式確認提示
   - 顯著的警告訊息
   - 帶有時間戳記的控制台日誌記錄
   - 不建議 CI/CD 使用

**理由：**
- 預設保護存檔完整性
- 允許緊急情況下的優先權並承擔責任
- 清除驗證繞過的審計跟踪

### 驗證報告格式
```json
{
  "valid": boolean,
  "issues": [
    {
      "level": "ERROR" | "WARNING" | "INFO",
      "path": "requirements[0].scenarios",
      "message": "Requirement must have at least one scenario",
      "line": 15,
      "column": 0
    }
  ],
  "summary": {
    "errors": 2,
    "warnings": 5,
    "info": 3
  }
}
```

**好處：**
- 機器可讀的工具集成
- 人性化的訊息
- 用於 IDE 整合的行/列信息
- 快速評估摘要

### 實施策略
1. **經過改進的 Zod 架構**：類型定義中的內建驗證
2. **自訂驗證器**：附加業務邏輯驗證
3. **可組合規則**：針對不同情境進行混合和匹配
4. **可擴充框架**：無需重構即可輕鬆新增規則