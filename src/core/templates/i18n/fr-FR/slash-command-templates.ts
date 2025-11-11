import { SlashCommandId } from '../../slash-command-templates.js';

const baseGuardrails = `**Contraintes**
- Privilégier des implémentations simples et minimales d'abord, et n'ajouter de la complexité que lorsqu'elle est demandée ou clairement requise.
- Maintenir les changements étroitement ciblés sur le résultat demandé.
- Se référer à \`openspec/AGENTS.md\` (situé dans le répertoire \`openspec/\`—exécutez \`ls openspec\` ou \`openspec update\` si vous ne le voyez pas) si vous avez besoin de conventions ou clarifications OpenSpec supplémentaires.`;

const proposalGuardrails = `${baseGuardrails}\n- Identifier tout détail vague ou ambigu et poser les questions de suivi nécessaires avant de modifier les fichiers.`;

const proposalSteps = `**Étapes**
1. Examiner \`openspec/project.md\`, exécuter \`openspec list\` et \`openspec list --specs\`, et inspecter le code ou la documentation connexe (par ex. via \`rg\`/\`ls\`) pour comprendre le comportement actuel ; noter tout écart nécessitant une clarification.
2. Choisir un \`change-id\` unique mené par un verbe et créer \`proposal.md\`, \`tasks.md\` et \`design.md\` (si nécessaire) sous \`openspec/changes/<id>/\`.
3. Mapper le changement en capacités ou exigences concrètes, en décomposant les efforts multi-portée en deltas de spécification distincts avec des relations et un séquencement clairs.
4. Capturer le raisonnement architectural dans \`design.md\` lorsque la solution s'étend sur plusieurs systèmes, introduit de nouveaux modèles ou nécessite une discussion de compromis avant de s'engager dans les spécifications.
5. Rédiger des deltas de spécification dans \`changes/<id>/specs/<capability>/spec.md\` (un dossier par capacité) en utilisant \`## ADDED|MODIFIED|REMOVED Requirements\` avec au moins un \`#### Scenario:\` par exigence et référencer les capacités connexes lorsque cela est pertinent.
6. Rédiger \`tasks.md\` comme une liste ordonnée de petits éléments de travail vérifiables qui offrent des progrès visibles par l'utilisateur, incluent la validation (tests, outils) et mettent en évidence les dépendances ou le travail parallélisable.
7. Valider avec \`openspec validate <id> --strict\` et résoudre tous les problèmes avant de partager la proposition.`;

const proposalReferences = `**Référence**
- Utiliser \`openspec show <id> --json --deltas-only\` ou \`openspec show <spec> --type spec\` pour inspecter les détails lorsque la validation échoue.
- Rechercher les exigences existantes avec \`rg -n "Requirement:|Scenario:" openspec/specs\` avant d'en écrire de nouvelles.
- Explorer la base de code avec \`rg <keyword>\`, \`ls\` ou des lectures de fichiers directes pour que les propositions s'alignent sur les réalités d'implémentation actuelles.`;

const applySteps = `**Étapes**
Suivre ces étapes comme des TODOs et les compléter une par une.
1. Lire \`changes/<id>/proposal.md\`, \`design.md\` (s'il existe) et \`tasks.md\` pour confirmer la portée et les critères d'acceptation.
2. Travailler sur les tâches séquentiellement, en gardant les modifications minimales et ciblées sur le changement demandé.
3. Confirmer l'achèvement avant de mettre à jour les statuts—s'assurer que chaque élément de \`tasks.md\` est terminé.
4. Mettre à jour la liste de contrôle après que tout le travail est fait pour que chaque tâche soit marquée \`- [x]\` et reflète la réalité.
5. Se référer à \`openspec list\` ou \`openspec show <item>\` lorsque un contexte supplémentaire est requis.`;

const applyReferences = `**Référence**
- Utiliser \`openspec show <id> --json --deltas-only\` si vous avez besoin d'un contexte supplémentaire de la proposition lors de l'implémentation.`;

const archiveSteps = `**Étapes**
1. Déterminer l'ID de changement à archiver :
   - Si cette invite inclut déjà un ID de changement spécifique (par exemple dans un bloc \`<ChangeId>\` rempli par les arguments de commande slash), utiliser cette valeur après avoir supprimé les espaces.
   - Si la conversation fait référence à un changement de manière vague (par exemple par titre ou résumé), exécuter \`openspec list\` pour afficher les ID probables, partager les candidats pertinents et confirmer celui que l'utilisateur a l'intention d'utiliser.
   - Sinon, examiner la conversation, exécuter \`openspec list\`, et demander à l'utilisateur quel changement archiver ; attendre un ID de changement confirmé avant de continuer.
   - Si vous ne pouvez toujours pas identifier un seul ID de changement, arrêter et dire à l'utilisateur que vous ne pouvez pas encore archiver quoi que ce soit.
2. Valider l'ID de changement en exécutant \`openspec list\` (ou \`openspec show <id>\`) et s'arrêter si le changement est manquant, déjà archivé ou autrement pas prêt à être archivé.
3. Exécuter \`openspec archive <id> --yes\` pour que le CLI déplace le changement et applique les mises à jour de spécification sans invites (utiliser \`--skip-specs\` uniquement pour le travail uniquement d'outillage).
4. Examiner la sortie de la commande pour confirmer que les spécifications cibles ont été mises à jour et que le changement a atterri dans \`changes/archive/\`.
5. Valider avec \`openspec validate --strict\` et inspecter avec \`openspec show <id>\` si quelque chose semble incorrect.`;

const archiveReferences = `**Référence**
- Utiliser \`openspec list\` pour confirmer les ID de changement avant l'archivage.
- Inspecter les spécifications actualisées avec \`openspec list --specs\` et résoudre tout problème de validation avant de remettre.`;

export const slashCommandBodies: Record<SlashCommandId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n')
};

export function getSlashCommandBody(id: SlashCommandId): string {
  return slashCommandBodies[id];
}

