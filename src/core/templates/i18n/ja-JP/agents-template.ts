export const agentsTemplate = `# OpenSpec 説明

仕様駆動開発に OpenSpec を使用する AI コーディングアシスタント向けの説明。

## クイックチェックリスト

- 既存の作業を検索：\`openspec spec list --long\`、\`openspec list\`（全文検索の場合のみ \`rg\` を使用）
- スコープを決定：新機能 vs 既存機能の変更
- 一意の \`change-id\` を選択：kebab-case、動詞主導（\`add-\`、\`update-\`、\`remove-\`、\`refactor-\`）
- スキャフォールド：\`proposal.md\`、\`tasks.md\`、\`design.md\`（必要な場合のみ）、および影響を受ける機能ごとのデルタ仕様
- デルタを記述：\`## ADDED|MODIFIED|REMOVED|RENAMED Requirements\` を使用；要件ごとに少なくとも1つの \`#### Scenario:\` を含める
- 検証：\`openspec validate [change-id] --strict\` を実行して問題を修正
- 承認をリクエスト：提案が承認されるまで実装を開始しない

## 3段階のワークフロー

### ステージ 1：変更の作成
以下の場合に提案を作成：
- 機能や機能性を追加
- 破壊的変更（API、スキーマ）を行う
- アーキテクチャやパターンを変更
- パフォーマンスを最適化（動作を変更）
- セキュリティパターンを更新

トリガー（例）：
- "変更提案を作成するのを手伝って"
- "変更を計画するのを手伝って"
- "提案を作成したい"
- "仕様提案を作成したい"
- "仕様を作成したい"

緩いマッチングガイダンス：
- 次のいずれかを含む：\`proposal\`、\`change\`、\`spec\`
- 次のいずれかと組み合わせる：\`create\`、\`plan\`、\`make\`、\`start\`、\`help\`

提案をスキップする場合：
- バグ修正（意図された動作を復元）
- タイプミス、フォーマット、コメント
- 依存関係の更新（非破壊的）
- 設定の変更
- 既存の動作のテスト

**ワークフロー**
1. \`openspec/project.md\`、\`openspec list\`、および \`openspec list --specs\` を確認して、現在のコンテキストを理解する。
2. 一意の動詞主導の \`change-id\` を選択し、\`openspec/changes/<id>/\` の下に \`proposal.md\`、\`tasks.md\`、オプションの \`design.md\`、および仕様デルタを作成する。
3. 要件ごとに少なくとも1つの \`#### Scenario:\` を含む \`## ADDED|MODIFIED|REMOVED Requirements\` を使用して仕様デルタを起草する。
4. \`openspec validate <id> --strict\` を実行し、提案を共有する前にすべての問題を解決する。

### ステージ 2：変更の実装
これらのステップを TODO として追跡し、1つずつ完了する。
1. **proposal.md を読む** - 構築される内容を理解する
2. **design.md を読む**（存在する場合） - 技術的決定を確認する
3. **tasks.md を読む** - 実装チェックリストを取得する
4. **タスクを順番に実装する** - 順番に完了する
5. **完了を確認する** - ステータスを更新する前に、\`tasks.md\` のすべての項目が完了していることを確認する
6. **チェックリストを更新する** - すべての作業が完了した後、各タスクを \`- [x]\` に設定して、リストが現実を反映するようにする
7. **承認ゲート** - 提案がレビューされ承認されるまで実装を開始しない

### ステージ 3：変更のアーカイブ
デプロイ後、別の PR を作成して：
- \`changes/[name]/\` → \`changes/archive/YYYY-MM-DD-[name]/\` に移動
- 機能が変更された場合は \`specs/\` を更新
- ツールのみの変更には \`openspec archive <change-id> --skip-specs --yes\` を使用（常に変更 ID を明示的に渡す）
- \`openspec validate --strict\` を実行して、アーカイブされた変更がチェックを通過することを確認する

## タスクの前

**コンテキストチェックリスト：**
- [ ] \`specs/[capability]/spec.md\` で関連する仕様を読む
- [ ] \`changes/\` の保留中の変更で競合を確認する
- [ ] 規則について \`openspec/project.md\` を読む
- [ ] \`openspec list\` を実行してアクティブな変更を表示する
- [ ] \`openspec list --specs\` を実行して既存の機能を表示する

**仕様を作成する前：**
- 常に機能が既に存在するかどうかを確認する
- 重複を作成するよりも既存の仕様を変更することを優先する
- \`openspec show [spec]\` を使用して現在の状態を確認する
- リクエストが曖昧な場合、スキャフォールドの前に1〜2つの明確化の質問をする

### 検索ガイダンス
- 仕様を列挙：\`openspec spec list --long\`（またはスクリプト用に \`--json\`）
- 変更を列挙：\`openspec list\`（または \`openspec change list --json\` - 非推奨だが利用可能）
- 詳細を表示：
  - 仕様：\`openspec show <spec-id> --type spec\`（フィルターに \`--json\` を使用）
  - 変更：\`openspec show <change-id> --json --deltas-only\`
- 全文検索（ripgrep を使用）：\`rg -n "Requirement:|Scenario:" openspec/specs\`

## クイックスタート

### CLI コマンド

\`\`\`bash
# 基本コマンド
openspec list                  # アクティブな変更をリスト
openspec list --specs          # 仕様をリスト
openspec show [item]           # 変更または仕様を表示
openspec validate [item]       # 変更または仕様を検証
openspec archive <change-id> [--yes|-y]   # デプロイ後にアーカイブ（非対話式実行に --yes を追加）

# プロジェクト管理
openspec init [path]           # OpenSpec を初期化
openspec update [path]         # 説明ファイルを更新

# 対話モード
openspec show                  # 選択のプロンプト
openspec validate              # 一括検証モード

# デバッグ
openspec show [change] --json --deltas-only
openspec validate [change] --strict
\`\`\`

### コマンドフラグ

- \`--json\` - 機械可読出力
- \`--type change|spec\` - 項目の曖昧さを解消
- \`--strict\` - 包括的な検証
- \`--no-interactive\` - プロンプトを無効化
- \`--skip-specs\` - 仕様更新なしでアーカイブ
- \`--yes\`/\`-y\` - 確認プロンプトをスキップ（非対話式アーカイブ）

## ディレクトリ構造

\`\`\`
openspec/
├── project.md              # プロジェクト規則
├── specs/                  # 現在の真実 - 構築されているもの
│   └── [capability]/       # 単一の焦点を絞った機能
│       ├── spec.md         # 要件とシナリオ
│       └── design.md       # 技術パターン
├── changes/                # 提案 - 変更すべきもの
│   ├── [change-name]/
│   │   ├── proposal.md     # 理由、内容、影響
│   │   ├── tasks.md        # 実装チェックリスト
│   │   ├── design.md       # 技術的決定（オプション；基準を参照）
│   │   └── specs/          # デルタ変更
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # 完了した変更
\`\`\`

## 変更提案の作成

### 決定木

\`\`\`
新しいリクエスト？
├─ 仕様動作を復元するバグ修正？ → 直接修正
├─ タイプミス/フォーマット/コメント？ → 直接修正
├─ 新機能/能力？ → 提案を作成
├─ 破壊的変更？ → 提案を作成
├─ アーキテクチャ変更？ → 提案を作成
└─ 不明確？ → 提案を作成（より安全）
\`\`\`

### 提案構造

1. **ディレクトリを作成：** \`changes/[change-id]/\`（kebab-case、動詞主導、一意）

2. **proposal.md を記述：**
\`\`\`markdown
# 変更：[変更の簡単な説明]

## 理由
[問題/機会について1〜2文]

## 変更内容
- [変更の箇条書きリスト]
- [破壊的変更を **BREAKING** でマーク]

## 影響
- 影響を受ける仕様：[機能をリスト]
- 影響を受けるコード：[キーファイル/システム]
\`\`\`

3. **仕様デルタを作成：** \`specs/[capability]/spec.md\`
\`\`\`markdown
## ADDED Requirements
### Requirement: 新機能
システムは...を提供する必要がある

#### Scenario: 成功ケース
- **WHEN** ユーザーがアクションを実行
- **THEN** 期待される結果

## MODIFIED Requirements
### Requirement: 既存機能
[完全な変更後の要件]

## REMOVED Requirements
### Requirement: 古い機能
**理由**：[削除する理由]
**移行**：[処理方法]
\`\`\`
複数の機能が影響を受ける場合、\`changes/[change-id]/specs/<capability>/spec.md\` の下に複数のデルタファイルを作成する—機能ごとに1つ。

4. **tasks.md を作成：**
\`\`\`markdown
## 1. 実装
- [ ] 1.1 データベーススキーマを作成
- [ ] 1.2 API エンドポイントを実装
- [ ] 1.3 フロントエンドコンポーネントを追加
- [ ] 1.4 テストを記述
\`\`\`

5. **必要に応じて design.md を作成：**
以下のいずれかが該当する場合は \`design.md\` を作成；それ以外の場合は省略：
- 横断的変更（複数のサービス/モジュール）または新しいアーキテクチャパターン
- 新しい外部依存関係または重要なデータモデルの変更
- セキュリティ、パフォーマンス、または移行の複雑さ
- コーディング前に技術的決定から利益を得る曖昧さ

最小限の \`design.md\` スケルトン：
\`\`\`markdown
## コンテキスト
[背景、制約、ステークホルダー]

## 目標 / 非目標
- 目標：[...]
- 非目標：[...]

## 決定
- 決定：[何と理由]
- 検討された代替案：[オプション + 理由]

## リスク / トレードオフ
- [リスク] → 緩和策

## 移行計画
[ステップ、ロールバック]

## 未解決の問題
- [...]
\`\`\`

## 仕様ファイル形式

### 重要：シナリオのフォーマット

**正しい**（#### ヘッダーを使用）：
\`\`\`markdown
#### Scenario: ユーザーログイン成功
- **WHEN** 有効な認証情報が提供される
- **THEN** JWT トークンを返す
\`\`\`

**間違い**（箇条書きや太字を使用しない）：
\`\`\`markdown
- **Scenario: ユーザーログイン**  ❌
**Scenario**: ユーザーログイン     ❌
### Scenario: ユーザーログイン      ❌
\`\`\`

各要件には少なくとも1つのシナリオが必要です。

### 要件の表現
- 規範的要件には SHALL/MUST を使用（意図的に非規範的でない限り should/may を避ける）

### デルタ操作

- \`## ADDED Requirements\` - 新機能
- \`## MODIFIED Requirements\` - 変更された動作
- \`## REMOVED Requirements\` - 非推奨機能
- \`## RENAMED Requirements\` - 名前の変更

\`trim(header)\` と一致するヘッダー - 空白は無視される。

#### ADDED と MODIFIED を使用するタイミング
- ADDED：独立した要件として存在できる新しい機能またはサブ機能を導入する。変更が直交的（例：「スラッシュコマンド設定」の追加）で、既存の要件のセマンティクスを変更しない場合、ADDED を優先する。
- MODIFIED：既存の要件の動作、スコープ、または受け入れ基準を変更する。常に完全な、更新された要件内容（ヘッダー + すべてのシナリオ）を貼り付ける。アーカイバーは、ここで提供する内容で要件全体を置き換える；部分的なデルタは以前の詳細を失う。
- RENAMED：名前のみが変更される場合に使用する。動作も変更する場合は、RENAMED（名前）と MODIFIED（内容）を新しい名前を参照して使用する。

よくある落とし穴：以前のテキストを含めずに MODIFIED を使用して新しい懸念事項を追加する。これにより、アーカイブ時に詳細が失われる。既存の要件を明示的に変更していない場合は、代わりに ADDED の下に新しい要件を追加する。

MODIFIED 要件を正しく作成する：
1) \`openspec/specs/<capability>/spec.md\` で既存の要件を見つける。
2) 要件ブロック全体（\`### Requirement: ...\` からそのシナリオまで）をコピーする。
3) \`## MODIFIED Requirements\` の下に貼り付けて、新しい動作を反映するように編集する。
4) ヘッダーテキストが正確に一致することを確認（空白に依存しない）し、少なくとも1つの \`#### Scenario:\` を保持する。

RENAMED の例：
\`\`\`markdown
## RENAMED Requirements
- FROM: \`### Requirement: Login\`
- TO: \`### Requirement: User Authentication\`
\`\`\`

## トラブルシューティング

### 一般的なエラー

**"変更には少なくとも1つのデルタが必要です"**
- \`changes/[name]/specs/\` が .md ファイルで存在することを確認
- ファイルに操作プレフィックス（## ADDED Requirements）があることを確認

**"要件には少なくとも1つのシナリオが必要です"**
- シナリオが \`#### Scenario:\` 形式（4つのハッシュ）を使用していることを確認
- シナリオヘッダーに箇条書きや太字を使用しない

**サイレントシナリオ解析の失敗**
- 正確な形式が必要：\`#### Scenario: Name\`
- 以下でデバッグ：\`openspec show [change] --json --deltas-only\`

### 検証のヒント

\`\`\`bash
# 包括的なチェックには常に厳密モードを使用
openspec validate [change] --strict

# デルタ解析をデバッグ
openspec show [change] --json | jq '.deltas'

# 特定の要件を確認
openspec show [spec] --json -r 1
\`\`\`

## ハッピーパススクリプト

\`\`\`bash
# 1) 現在の状態を探索
openspec spec list --long
openspec list
# オプションの全文検索：
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) 変更 id を選択してスキャフォールド
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## 理由\\n...\\n\\n## 変更内容\\n- ...\\n\\n## 影響\\n- ...\\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. 実装\\n- [ ] 1.1 ...\\n" > openspec/changes/$CHANGE/tasks.md

# 3) デルタを追加（例）
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: 二要素認証
ユーザーはログイン時に2番目の要素を提供する必要がある。

#### Scenario: OTP が必要
- **WHEN** 有効な認証情報が提供される
- **THEN** OTP チャレンジが必要
EOF

# 4) 検証
openspec validate $CHANGE --strict
\`\`\`

## マルチ機能の例

\`\`\`
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: 二要素認証
    └── notifications/
        └── spec.md   # ADDED: OTP メール通知
\`\`\`

auth/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: 二要素認証
...
\`\`\`

notifications/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: OTP メール通知
...
\`\`\`

## ベストプラクティス

### シンプルさを優先
- デフォルトで <100 行の新しいコード
- 不十分であることが証明されるまで単一ファイルの実装
- 明確な正当化なしにフレームワークを避ける
- 退屈で実証済みのパターンを選択

### 複雑さのトリガー
以下の場合にのみ複雑さを追加：
- 現在のソリューションが遅すぎることを示すパフォーマンスデータ
- 具体的なスケール要件（>1000 ユーザー、>100MB データ）
- 抽象化を必要とする複数の実証済みのユースケース

### 明確な参照
- コードの場所に \`file.ts:42\` 形式を使用
- 仕様を \`specs/auth/spec.md\` として参照
- 関連する変更と PR をリンク

### 機能の命名
- 動詞-名詞を使用：\`user-auth\`、\`payment-capture\`
- 機能ごとに単一の目的
- 10分の理解可能性ルール
- 説明に「AND」が必要な場合は分割

### 変更 ID の命名
- kebab-case を使用、短く説明的：\`add-two-factor-auth\`
- 動詞主導のプレフィックスを優先：\`add-\`、\`update-\`、\`remove-\`、\`refactor-\`
- 一意性を確保；使用されている場合は \`-2\`、\`-3\` などを追加

## ツール選択ガイド

| タスク | ツール | 理由 |
|------|------|-----|
| パターンでファイルを検索 | Glob | 高速なパターンマッチング |
| コードコンテンツを検索 | Grep | 最適化された正規表現検索 |
| 特定のファイルを読み取る | Read | 直接ファイルアクセス |
| 未知のスコープを探索 | Task | 多段階の調査 |

## エラー回復

### 変更の競合
1. \`openspec list\` を実行してアクティブな変更を表示
2. 重複する仕様を確認
3. 変更の所有者と調整
4. 提案の結合を検討

### 検証の失敗
1. \`--strict\` フラグで実行
2. 詳細については JSON 出力を確認
3. 仕様ファイル形式を確認
4. シナリオが正しくフォーマットされていることを確認

### コンテキストの欠如
1. 最初に project.md を読む
2. 関連する仕様を確認
3. 最近のアーカイブを確認
4. 明確化を求める

## クイックリファレンス

### ステージインジケーター
- \`changes/\` - 提案済み、まだ構築されていない
- \`specs/\` - 構築されデプロイ済み
- \`archive/\` - 完了した変更

### ファイルの目的
- \`proposal.md\` - 理由と内容
- \`tasks.md\` - 実装ステップ
- \`design.md\` - 技術的決定
- \`spec.md\` - 要件と動作

### CLI の要点
\`\`\`bash
openspec list              # 何が進行中ですか？
openspec show [item]       # 詳細を表示
openspec validate --strict # 正しいですか？
openspec archive <change-id> [--yes|-y]  # 完了としてマーク（自動化に --yes を追加）
\`\`\`

覚えておいてください：仕様は真実です。変更は提案です。それらを同期させてください。
`;
