# 技術設計

## 技術選擇

### TypeScript 設定
- **嚴格模式**：啟用所有嚴格類型檢查以更好地理解 AI
- **目標**：ES2022 現代 JavaScript 功能
- **模組**：ES2022 現代 ESM 支援
- **模組解析**：正確套件解析的節點
- **輸出**：已編譯的 JavaScript 的 dist/ 目錄
- **來源映射**：啟用直接偵錯TypeScript
- **聲明文件**：為類型定義產生 .d.ts 文件
- **ES Module Interop**：true 以獲得更好的 CommonJS 相容性
- **跳過庫檢查**： false 以確保所有類型都經過驗證

### 封裝結構
```
openspec
├── bin/            # CLI entry point
├── dist/           # Compiled JavaScript
├── src/            # TypeScript source
│   ├── cli/        # Command implementations
│   ├── core/       # Core OpenSpec logic
│   └── utils/      # Shared utilities
├── package.json
├── tsconfig.json
└── build.js        # Build script
```

### 依賴策略
- **最小依賴**：僅必要的套件
- **指揮官**：業界標準CLI 框架
- **@inquirer/prompts**：現代提示庫
- **沒有繁重的框架**：直接、可讀的實現

### 建構方法
- 透過 tsc 進行本機 TypeScript 編譯
- 簡單的 build.js 腳本用於打包
- 不需要複雜的建置工具鏈
- ESM 輸出在導入中具有正確的 .js 副檔名

### 開發流程
1. `pnpm install` - 安裝依賴項
2. `pnpm run build` - 編譯TypeScript
3. `pnpm run dev` - 開發模式
4. `pnpm link` - 本地測試CLI

### Node.js 要求
- **最低版本**：Node.js 20.19.0
- **推薦**：Node.js 22 LTS
- **基本原理**：完全支援 ESM，無需標誌，現代 JavaScript 功能

### ESM 設定
- **封裝類型**： `"type": "module"` 在 package.json 中
- **檔案副檔名**：在 TypeScript 導入中使用 .js 副檔名（正確編譯）
- **頂級等待**：可用於更乾淨的非同步初始化
- **面向未來**：符合 JavaScript 標準

### TypeScript 最佳實踐
- **TypeScript 中的所有程式碼**：src/ 中沒有 .js 文件，只有 .ts
- **顯式類型**：與推理相比，偏好顯式類型，這樣可以增加清晰度
- **介面優於類型**：將介面用於物件形狀，將類型用於聯合/別名
- **No any**：嚴格模式防止隱式any，需要時使用unknown
- **非同步/等待**：現代非同步模式貫穿始終