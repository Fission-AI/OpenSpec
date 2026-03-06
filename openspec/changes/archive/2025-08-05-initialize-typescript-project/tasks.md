# 任務

## 1. 項目設定
- [x] 1.1 使用專案元資料、腳本和ESM設定建立package.json
- [x] 1.2 使用 tsconfig.json 設定 TypeScript 以獲得 ESM 輸出
- [x] 1.3 為Node.js/TypeScript項目新增.gitignore
- [x] 1.4 將 Node.js 引擎要求設定為 >=20.19.0

## 2. 目錄結構
- [x] 2.1 建立原始碼目錄src/
- [x] 2.2 為CLI指令建立src/cli/
- [x] 2.3 Create src/core/ for core OpenSpec logic
- [x] 2.4 Create src/utils/ for shared utilities

## 3. 建置設定
- [x] 3.1 建立build.js進行原生%TypeScript編譯
- [x] 3.2 設定開發腳本（build、dev）
- [x] 3.3 設定 ESM 導出的套件入口點
- [x] 3.4 為 ESM 設定正確的檔案副檔名處理

## 4. 初始依賴關係
- [x] 4.1 添加 TypeScript 作為開發依賴
- [x] 4.2 為CLI 框架新增指揮官
- [x] 4.3 新增@inquirer/prompts進行使用者交互
- [x] 4.4 新增必要的類型定義