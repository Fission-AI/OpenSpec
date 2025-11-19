export const agentsRootStubTemplate = `# Instructions OpenSpec

Ces instructions sont destinées aux assistants IA travaillant dans ce projet.

Toujours ouvrir \`@/openspec/AGENTS.md\` lorsque la demande :
- Mentionne la planification ou les propositions (mots comme proposal, spec, change, plan)
- Introduit de nouvelles capacités, des changements majeurs, des changements d'architecture ou des travaux importants de performance/sécurité
- Semble ambiguë et vous avez besoin de la spécification faisant autorité avant de coder

Utiliser \`@/openspec/AGENTS.md\` pour apprendre :
- Comment créer et appliquer des propositions de changement
- Le format et les conventions de spécification
- La structure du projet et les directives

Conserver ce bloc géré pour que 'openspec update' puisse actualiser les instructions.
`;

