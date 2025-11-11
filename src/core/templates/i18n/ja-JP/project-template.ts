import { ProjectContext } from '../../project-template.js';

export const projectTemplate = (context: ProjectContext = {}) => `# ${context.projectName || 'プロジェクト'} コンテキスト

## 目的
${context.description || '[プロジェクトの目的と目標を説明してください]'}

## 技術スタック
${context.techStack?.length ? context.techStack.map(tech => `- ${tech}`).join('\n') : '- [主要な技術をリストしてください]\n- [例：TypeScript, React, Node.js]'}

## プロジェクト規則

### コードスタイル
[コードスタイルの好み、フォーマット規則、命名規則を説明してください]

### アーキテクチャパターン
[アーキテクチャの決定とパターンを文書化してください]

### テスト戦略
[テストアプローチと要件を説明してください]

### Git ワークフロー
[ブランチ戦略とコミット規則を説明してください]

## ドメインコンテキスト
[AI アシスタントが理解する必要があるドメイン固有の知識を追加してください]

## 重要な制約
[技術的、ビジネス的、または規制上の制約をリストしてください]

## 外部依存関係
[主要な外部サービス、API、またはシステムを文書化してください]
`;

