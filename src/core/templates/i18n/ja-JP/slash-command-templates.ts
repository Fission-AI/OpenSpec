import { SlashCommandId } from '../../slash-command-templates.js';

const baseGuardrails = `**ガードレール**
- まずはシンプルで最小限の実装を優先し、要求された場合または明確に必要な場合にのみ複雑さを追加します。
- 変更を要求された結果に厳密にスコープを絞ってください。
- 追加の OpenSpec 規則や説明が必要な場合は、\`openspec/AGENTS.md\`（\`openspec/\` ディレクトリ内にあります—表示されない場合は \`ls openspec\` または \`openspec update\` を実行）を参照してください。`;

const proposalGuardrails = `${baseGuardrails}\n- あいまいまたは不明確な詳細を特定し、ファイルを編集する前に必要なフォローアップの質問をしてください。`;

const proposalSteps = `**ステップ**
1. \`openspec/project.md\` を確認し、\`openspec list\` と \`openspec list --specs\` を実行し、関連するコードやドキュメント（例：\`rg\`/\`ls\` 経由）を検査して、現在の動作を理解します。明確化が必要なギャップに注意してください。
2. 一意の動詞主導の \`change-id\` を選択し、\`openspec/changes/<id>/\` の下に \`proposal.md\`、\`tasks.md\`、および \`design.md\`（必要な場合）を作成します。
3. 変更を具体的な機能または要件にマッピングし、マルチスコープの取り組みを明確な関係と順序付けを持つ個別の仕様デルタに分解します。
4. ソリューションが複数のシステムにまたがる場合、新しいパターンを導入する場合、または仕様にコミットする前にトレードオフの議論が必要な場合、\`design.md\` にアーキテクチャの推論を記録します。
5. \`changes/<id>/specs/<capability>/spec.md\`（機能ごとに1つのフォルダ）で仕様デルタを起草し、要件ごとに少なくとも1つの \`#### Scenario:\` を含む \`## ADDED|MODIFIED|REMOVED Requirements\` を使用し、関連する場合は関連機能を相互参照します。
6. \`tasks.md\` を、ユーザーに見える進捗を提供する小さな検証可能な作業項目の順序付きリストとして起草し、検証（テスト、ツール）を含め、依存関係または並列化可能な作業を強調します。
7. \`openspec validate <id> --strict\` で検証し、提案を共有する前にすべての問題を解決します。`;

const proposalReferences = `**参照**
- 検証が失敗した場合、\`openspec show <id> --json --deltas-only\` または \`openspec show <spec> --type spec\` を使用して詳細を検査します。
- 新しい要件を書く前に、\`rg -n "Requirement:|Scenario:" openspec/specs\` で既存の要件を検索します。
- 提案が現在の実装の現実と一致するように、\`rg <keyword>\`、\`ls\`、または直接ファイル読み取りでコードベースを探索します。`;

const applySteps = `**ステップ**
これらのステップを TODO として追跡し、1つずつ完了します。
1. \`changes/<id>/proposal.md\`、\`design.md\`（存在する場合）、および \`tasks.md\` を読んで、スコープと受け入れ基準を確認します。
2. タスクを順番に作業し、編集を最小限に抑え、要求された変更に焦点を当てます。
3. ステータスを更新する前に完了を確認します—\`tasks.md\` のすべての項目が完了していることを確認します。
4. すべての作業が完了したらチェックリストを更新し、各タスクが \`- [x]\` とマークされ、現実を反映するようにします。
5. 追加のコンテキストが必要な場合は、\`openspec list\` または \`openspec show <item>\` を参照します。`;

const applyReferences = `**参照**
- 実装中に提案から追加のコンテキストが必要な場合は、\`openspec show <id> --json --deltas-only\` を使用してください。`;

const archiveSteps = `**ステップ**
1. アーカイブする変更 ID を決定します：
   - このプロンプトに既に特定の変更 ID が含まれている場合（例：スラッシュコマンド引数で入力された \`<ChangeId>\` ブロック内）、空白を削除した後にその値を使用します。
   - 会話が変更を大まかに参照している場合（例：タイトルや要約で）、\`openspec list\` を実行して可能性のある ID を表示し、関連する候補を共有し、ユーザーが意図するものを確認します。
   - それ以外の場合は、会話を確認し、\`openspec list\` を実行し、ユーザーにどの変更をアーカイブするか尋ねます。続行する前に確認された変更 ID を待ちます。
   - それでも単一の変更 ID を識別できない場合は、停止し、ユーザーにまだ何もアーカイブできないことを伝えます。
2. \`openspec list\`（または \`openspec show <id>\`）を実行して変更 ID を検証し、変更が欠落している、既にアーカイブされている、またはアーカイブの準備ができていない場合は停止します。
3. \`openspec archive <id> --yes\` を実行して、CLI が変更を移動し、プロンプトなしで仕様更新を適用するようにします（ツールのみの作業には \`--skip-specs\` のみを使用）。
4. コマンド出力を確認して、ターゲット仕様が更新され、変更が \`changes/archive/\` に配置されたことを確認します。
5. \`openspec validate --strict\` で検証し、問題があるように見える場合は \`openspec show <id>\` で検査します。`;

const archiveReferences = `**参照**
- アーカイブする前に \`openspec list\` を使用して変更 ID を確認します。
- \`openspec list --specs\` で更新された仕様を検査し、引き継ぐ前に検証の問題に対処します。`;

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}

