import { ProjectContext } from '../../project-template.js';

export const projectTemplate = (context: ProjectContext = {}) => `# Contexte ${context.projectName || 'du Projet'}

## Objectif
${context.description || '[Décrivez l\'objectif et les buts de votre projet]'}

## Pile Technologique
${context.techStack?.length ? context.techStack.map(tech => `- ${tech}`).join('\n') : '- [Listez vos technologies principales]\n- [par ex. : TypeScript, React, Node.js]'}

## Conventions du Projet

### Style de Code
[Décrivez vos préférences de style de code, règles de formatage et conventions de nommage]

### Modèles d'Architecture
[Documentez vos décisions et modèles architecturaux]

### Stratégie de Test
[Expliquez votre approche et vos exigences de test]

### Workflow Git
[Décrivez votre stratégie de branchement et vos conventions de commit]

## Contexte du Domaine
[Ajoutez des connaissances spécifiques au domaine que les assistants IA doivent comprendre]

## Contraintes Importantes
[Listez toutes les contraintes techniques, commerciales ou réglementaires]

## Dépendances Externes
[Documentez les services externes, API ou systèmes clés]
`;

