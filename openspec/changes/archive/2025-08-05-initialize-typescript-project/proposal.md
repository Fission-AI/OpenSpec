# 初始化TypeScript項目

## 為什麼
OpenSpec 專案需要適當的 TypeScript 基礎來建立最小的 CLI，以幫助開發人員設定 OpenSpec 檔案結構並保持 AI 指令更新。

## 有什麼變化
- 使用 ESM 模組建立 TypeScript 專案設定（package.json、tsconfig.json）
- 為 CLI 實作設定基本目錄結構
- 設定建置腳本和開發工具
- 為 CLI 開發添加必要的依賴項
- 為 Node.js/TypeScript 專案建立 .gitignore
- 將最低 Node.js 版本設定為 20.19.0 以取得本機 ESM 支援

## 影響
- 受影響的規格：無（初始項目設定）
- 受影響的代碼：無（綠地專案）
- 新目錄：src/、dist/、node_modules/
- 新檔案：package.json、tsconfig.json、.gitignore、build.js