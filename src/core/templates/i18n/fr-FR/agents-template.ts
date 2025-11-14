export const agentsTemplate = `# Instructions OpenSpec

Instructions pour les assistants de codage IA utilisant OpenSpec pour le développement piloté par spécifications.

## Liste de contrôle rapide

- Rechercher le travail existant : \`openspec spec list --long\`, \`openspec list\` (utiliser \`rg\` uniquement pour la recherche en texte intégral)
- Décider de la portée : nouvelle capacité vs modifier une capacité existante
- Choisir un \`change-id\` unique : kebab-case, mené par un verbe (\`add-\`, \`update-\`, \`remove-\`, \`refactor-\`)
- Échafaudage : \`proposal.md\`, \`tasks.md\`, \`design.md\` (seulement si nécessaire), et spécifications delta par capacité affectée
- Écrire les deltas : utiliser \`## ADDED|MODIFIED|REMOVED|RENAMED Requirements\` ; inclure au moins un \`#### Scenario:\` par exigence
- Valider : \`openspec validate [change-id] --strict\` et corriger les problèmes
- Demander l'approbation : Ne pas commencer l'implémentation tant que la proposition n'est pas approuvée

## Workflow en trois étapes

### Étape 1 : Création de changements
Créer une proposition lorsque vous devez :
- Ajouter des fonctionnalités ou des capacités
- Effectuer des changements majeurs (API, schéma)
- Changer l'architecture ou les modèles
- Optimiser les performances (change le comportement)
- Mettre à jour les modèles de sécurité

Déclencheurs (exemples) :
- "Aidez-moi à créer une proposition de changement"
- "Aidez-moi à planifier un changement"
- "Je veux créer une proposition"
- "Je veux créer une proposition de spécification"
- "Je veux créer une spécification"

Guide de correspondance approximative :
- Contient l'un des : \`proposal\`, \`change\`, \`spec\`
- Avec l'un des : \`create\`, \`plan\`, \`make\`, \`start\`, \`help\`

Ignorer la proposition pour :
- Corrections de bugs (restaurer le comportement prévu)
- Fautes de frappe, formatage, commentaires
- Mises à jour de dépendances (non majeures)
- Changements de configuration
- Tests pour le comportement existant

**Workflow**
1. Examiner \`openspec/project.md\`, \`openspec list\`, et \`openspec list --specs\` pour comprendre le contexte actuel.
2. Choisir un \`change-id\` unique mené par un verbe et créer \`proposal.md\`, \`tasks.md\`, \`design.md\` optionnel, et deltas de spécification sous \`openspec/changes/<id>/\`.
3. Rédiger des deltas de spécification en utilisant \`## ADDED|MODIFIED|REMOVED Requirements\` avec au moins un \`#### Scenario:\` par exigence.
4. Exécuter \`openspec validate <id> --strict\` et résoudre tous les problèmes avant de partager la proposition.

### Étape 2 : Implémentation des changements
Suivre ces étapes comme des TODOs et les compléter une par une.
1. **Lire proposal.md** - Comprendre ce qui est construit
2. **Lire design.md** (s'il existe) - Examiner les décisions techniques
3. **Lire tasks.md** - Obtenir la liste de contrôle d'implémentation
4. **Implémenter les tâches séquentiellement** - Compléter dans l'ordre
5. **Confirmer l'achèvement** - S'assurer que chaque élément de \`tasks.md\` est terminé avant de mettre à jour les statuts
6. **Mettre à jour la liste de contrôle** - Après que tout le travail est fait, définir chaque tâche à \`- [x]\` pour que la liste reflète la réalité
7. **Porte d'approbation** - Ne pas commencer l'implémentation tant que la proposition n'est pas examinée et approuvée

### Étape 3 : Archivage des changements
Après le déploiement, créer une PR séparée pour :
- Déplacer \`changes/[name]/\` → \`changes/archive/YYYY-MM-DD-[name]/\`
- Mettre à jour \`specs/\` si les capacités ont changé
- Utiliser \`openspec archive <change-id> --skip-specs --yes\` pour les changements uniquement d'outillage (toujours passer l'ID de changement explicitement)
- Exécuter \`openspec validate --strict\` pour confirmer que le changement archivé passe les vérifications

## Avant toute tâche

**Liste de contrôle du contexte :**
- [ ] Lire les spécifications pertinentes dans \`specs/[capability]/spec.md\`
- [ ] Vérifier les changements en attente dans \`changes/\` pour les conflits
- [ ] Lire \`openspec/project.md\` pour les conventions
- [ ] Exécuter \`openspec list\` pour voir les changements actifs
- [ ] Exécuter \`openspec list --specs\` pour voir les capacités existantes

**Avant de créer des spécifications :**
- Toujours vérifier si la capacité existe déjà
- Préférer modifier les spécifications existantes plutôt que de créer des doublons
- Utiliser \`openspec show [spec]\` pour examiner l'état actuel
- Si la demande est ambiguë, poser 1-2 questions de clarification avant l'échafaudage

### Guide de recherche
- Énumérer les spécifications : \`openspec spec list --long\` (ou \`--json\` pour les scripts)
- Énumérer les changements : \`openspec list\` (ou \`openspec change list --json\` - déprécié mais disponible)
- Afficher les détails :
  - Spécification : \`openspec show <spec-id> --type spec\` (utiliser \`--json\` pour les filtres)
  - Changement : \`openspec show <change-id> --json --deltas-only\`
- Recherche en texte intégral (utiliser ripgrep) : \`rg -n "Requirement:|Scenario:" openspec/specs\`

## Démarrage rapide

### Commandes CLI

\`\`\`bash
# Commandes essentielles
openspec list                  # Lister les changements actifs
openspec list --specs          # Lister les spécifications
openspec show [item]           # Afficher le changement ou la spécification
openspec validate [item]       # Valider les changements ou spécifications
openspec archive <change-id> [--yes|-y]   # Archiver après déploiement (ajouter --yes pour les exécutions non interactives)

# Gestion de projet
openspec init [path]           # Initialiser OpenSpec
openspec update [path]         # Mettre à jour les fichiers d'instructions

# Mode interactif
openspec show                  # Invite pour la sélection
openspec validate              # Mode de validation en masse

# Débogage
openspec show [change] --json --deltas-only
openspec validate [change] --strict
\`\`\`

### Drapeaux de commande

- \`--json\` - Sortie lisible par machine
- \`--type change|spec\` - Lever l'ambiguïté des éléments
- \`--strict\` - Validation complète
- \`--no-interactive\` - Désactiver les invites
- \`--skip-specs\` - Archiver sans mises à jour de spécification
- \`--yes\`/\`-y\` - Ignorer les invites de confirmation (archivage non interactif)

## Structure de répertoire

\`\`\`
openspec/
├── project.md              # Conventions du projet
├── specs/                  # Vérité actuelle - ce qui EST construit
│   └── [capability]/       # Capacité unique et ciblée
│       ├── spec.md         # Exigences et scénarios
│       └── design.md       # Modèles techniques
├── changes/                # Propositions - ce qui DEVRAIT changer
│   ├── [change-name]/
│   │   ├── proposal.md     # Pourquoi, quoi, impact
│   │   ├── tasks.md        # Liste de contrôle d'implémentation
│   │   ├── design.md       # Décisions techniques (optionnel ; voir critères)
│   │   └── specs/          # Changements delta
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # Changements terminés
\`\`\`

## Création de propositions de changement

### Arbre de décision

\`\`\`
Nouvelle demande ?
├─ Correction de bug restaurant le comportement de spécification ? → Corriger directement
├─ Faute de frappe/format/commentaire ? → Corriger directement
├─ Nouvelle fonctionnalité/capacité ? → Créer une proposition
├─ Changement majeur ? → Créer une proposition
├─ Changement d'architecture ? → Créer une proposition
└─ Pas clair ? → Créer une proposition (plus sûr)
\`\`\`

### Structure de proposition

1. **Créer le répertoire :** \`changes/[change-id]/\` (kebab-case, mené par un verbe, unique)

2. **Écrire proposal.md :**
\`\`\`markdown
# Changement : [Brève description du changement]

## Pourquoi
[1-2 phrases sur le problème/opportunité]

## Quels changements
- [Liste à puces des changements]
- [Marquer les changements majeurs avec **BREAKING**]

## Impact
- Spécifications affectées : [lister les capacités]
- Code affecté : [fichiers/systèmes clés]
\`\`\`

3. **Créer des deltas de spécification :** \`specs/[capability]/spec.md\`
\`\`\`markdown
## ADDED Requirements
### Requirement: Nouvelle fonctionnalité
Le système DOIT fournir...

#### Scenario: Cas de succès
- **WHEN** l'utilisateur effectue une action
- **THEN** résultat attendu

## MODIFIED Requirements
### Requirement: Fonctionnalité existante
[Exigence modifiée complète]

## REMOVED Requirements
### Requirement: Ancienne fonctionnalité
**Raison** : [Pourquoi supprimer]
**Migration** : [Comment gérer]
\`\`\`
Si plusieurs capacités sont affectées, créer plusieurs fichiers delta sous \`changes/[change-id]/specs/<capability>/spec.md\`—un par capacité.

4. **Créer tasks.md :**
\`\`\`markdown
## 1. Implémentation
- [ ] 1.1 Créer le schéma de base de données
- [ ] 1.2 Implémenter le point de terminaison API
- [ ] 1.3 Ajouter le composant frontend
- [ ] 1.4 Écrire les tests
\`\`\`

5. **Créer design.md si nécessaire :**
Créer \`design.md\` si l'un des éléments suivants s'applique ; sinon l'omettre :
- Changement transversal (plusieurs services/modules) ou nouveau modèle architectural
- Nouvelle dépendance externe ou changements significatifs du modèle de données
- Complexité de sécurité, performance ou migration
- Ambiguïté qui bénéficie de décisions techniques avant le codage

Squelette minimal de \`design.md\` :
\`\`\`markdown
## Contexte
[Contexte, contraintes, parties prenantes]

## Objectifs / Non-objectifs
- Objectifs : [...]
- Non-objectifs : [...]

## Décisions
- Décision : [Quoi et pourquoi]
- Alternatives considérées : [Options + justification]

## Risques / Compromis
- [Risque] → Atténuation

## Plan de migration
[Étapes, retour en arrière]

## Questions ouvertes
- [...]
\`\`\`

## Format de fichier de spécification

### Critique : Formatage des scénarios

**CORRECT** (utiliser les en-têtes ####) :
\`\`\`markdown
#### Scenario: Connexion utilisateur réussie
- **WHEN** des identifiants valides fournis
- **THEN** retourner le jeton JWT
\`\`\`

**INCORRECT** (ne pas utiliser de puces ou de gras) :
\`\`\`markdown
- **Scenario: Connexion utilisateur**  ❌
**Scenario**: Connexion utilisateur     ❌
### Scenario: Connexion utilisateur      ❌
\`\`\`

Chaque exigence DOIT avoir au moins un scénario.

### Formulation des exigences
- Utiliser SHALL/MUST pour les exigences normatives (éviter should/may sauf si intentionnellement non normatif)

### Opérations delta

- \`## ADDED Requirements\` - Nouvelles capacités
- \`## MODIFIED Requirements\` - Comportement modifié
- \`## REMOVED Requirements\` - Fonctionnalités dépréciées
- \`## RENAMED Requirements\` - Changements de nom

En-têtes correspondant à \`trim(header)\` - espaces ignorés.

#### Quand utiliser ADDED vs MODIFIED
- ADDED : Introduit une nouvelle capacité ou sous-capacité qui peut exister seule comme exigence. Préférer ADDED lorsque le changement est orthogonal (par ex., ajouter "Configuration de commande slash") plutôt que de modifier la sémantique d'une exigence existante.
- MODIFIED : Modifie le comportement, la portée ou les critères d'acceptation d'une exigence existante. Toujours coller le contenu complet et mis à jour de l'exigence (en-tête + tous les scénarios). L'archiveur remplacera l'exigence entière par ce que vous fournissez ici ; les deltas partiels perdront les détails précédents.
- RENAMED : Utiliser lorsque seul le nom change. Si vous modifiez également le comportement, utiliser RENAMED (nom) plus MODIFIED (contenu) en référençant le nouveau nom.

Piège courant : Utiliser MODIFIED pour ajouter une nouvelle préoccupation sans inclure le texte précédent. Cela entraîne une perte de détails au moment de l'archivage. Si vous ne modifiez pas explicitement l'exigence existante, ajoutez une nouvelle exigence sous ADDED à la place.

Rédaction correcte d'une exigence MODIFIED :
1) Localiser l'exigence existante dans \`openspec/specs/<capability>/spec.md\`.
2) Copier le bloc d'exigence entier (de \`### Requirement: ...\` à travers ses scénarios).
3) Le coller sous \`## MODIFIED Requirements\` et l'éditer pour refléter le nouveau comportement.
4) S'assurer que le texte de l'en-tête correspond exactement (insensible aux espaces) et conserver au moins un \`#### Scenario:\`.

Exemple pour RENAMED :
\`\`\`markdown
## RENAMED Requirements
- FROM: \`### Requirement: Login\`
- TO: \`### Requirement: User Authentication\`
\`\`\`

## Dépannage

### Erreurs courantes

**"Le changement doit avoir au moins un delta"**
- Vérifier que \`changes/[name]/specs/\` existe avec des fichiers .md
- Vérifier que les fichiers ont des préfixes d'opération (## ADDED Requirements)

**"L'exigence doit avoir au moins un scénario"**
- Vérifier que les scénarios utilisent le format \`#### Scenario:\` (4 dièses)
- Ne pas utiliser de puces ou de gras pour les en-têtes de scénario

**Échecs silencieux d'analyse de scénario**
- Format exact requis : \`#### Scenario: Name\`
- Déboguer avec : \`openspec show [change] --json --deltas-only\`

### Conseils de validation

\`\`\`bash
# Toujours utiliser le mode strict pour des vérifications complètes
openspec validate [change] --strict

# Déboguer l'analyse delta
openspec show [change] --json | jq '.deltas'

# Vérifier une exigence spécifique
openspec show [spec] --json -r 1
\`\`\`

## Script de chemin heureux

\`\`\`bash
# 1) Explorer l'état actuel
openspec spec list --long
openspec list
# Recherche en texte intégral optionnelle :
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) Choisir l'id de changement et échafauder
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## Pourquoi\\n...\\n\\n## Quels changements\\n- ...\\n\\n## Impact\\n- ...\\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. Implémentation\\n- [ ] 1.1 ...\\n" > openspec/changes/$CHANGE/tasks.md

# 3) Ajouter des deltas (exemple)
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: Authentification à deux facteurs
Les utilisateurs DOIVENT fournir un second facteur lors de la connexion.

#### Scenario: OTP requis
- **WHEN** des identifiants valides sont fournis
- **THEN** un défi OTP est requis
EOF

# 4) Valider
openspec validate $CHANGE --strict
\`\`\`

## Exemple multi-capacité

\`\`\`
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: Authentification à deux facteurs
    └── notifications/
        └── spec.md   # ADDED: Notification email OTP
\`\`\`

auth/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: Authentification à deux facteurs
...
\`\`\`

notifications/spec.md
\`\`\`markdown
## ADDED Requirements
### Requirement: Notification email OTP
...
\`\`\`

## Meilleures pratiques

### Simplicité d'abord
- Par défaut <100 lignes de nouveau code
- Implémentations à fichier unique jusqu'à preuve d'insuffisance
- Éviter les frameworks sans justification claire
- Choisir des modèles ennuyeux et éprouvés

### Déclencheurs de complexité
N'ajouter de la complexité qu'avec :
- Données de performance montrant que la solution actuelle est trop lente
- Exigences d'échelle concrètes (>1000 utilisateurs, >100MB de données)
- Plusieurs cas d'usage éprouvés nécessitant une abstraction

### Références claires
- Utiliser le format \`file.ts:42\` pour les emplacements de code
- Référencer les spécifications comme \`specs/auth/spec.md\`
- Lier les changements et PR connexes

### Nommage des capacités
- Utiliser verbe-nom : \`user-auth\`, \`payment-capture\`
- Objectif unique par capacité
- Règle de compréhensibilité en 10 minutes
- Diviser si la description nécessite "ET"

### Nommage des ID de changement
- Utiliser kebab-case, court et descriptif : \`add-two-factor-auth\`
- Préférer les préfixes menés par un verbe : \`add-\`, \`update-\`, \`remove-\`, \`refactor-\`
- Assurer l'unicité ; si pris, ajouter \`-2\`, \`-3\`, etc.

## Guide de sélection d'outils

| Tâche | Outil | Pourquoi |
|------|------|-----|
| Trouver des fichiers par motif | Glob | Correspondance de motifs rapide |
| Rechercher le contenu du code | Grep | Recherche regex optimisée |
| Lire des fichiers spécifiques | Read | Accès direct aux fichiers |
| Explorer une portée inconnue | Task | Investigation en plusieurs étapes |

## Récupération d'erreur

### Conflits de changement
1. Exécuter \`openspec list\` pour voir les changements actifs
2. Vérifier les spécifications qui se chevauchent
3. Coordonner avec les propriétaires de changement
4. Considérer la combinaison de propositions

### Échecs de validation
1. Exécuter avec le drapeau \`--strict\`
2. Vérifier la sortie JSON pour les détails
3. Vérifier le format du fichier de spécification
4. S'assurer que les scénarios sont correctement formatés

### Contexte manquant
1. Lire project.md d'abord
2. Vérifier les spécifications connexes
3. Examiner les archives récentes
4. Demander des clarifications

## Référence rapide

### Indicateurs d'étape
- \`changes/\` - Proposé, pas encore construit
- \`specs/\` - Construit et déployé
- \`archive/\` - Changements terminés

### Objectifs des fichiers
- \`proposal.md\` - Pourquoi et quoi
- \`tasks.md\` - Étapes d'implémentation
- \`design.md\` - Décisions techniques
- \`spec.md\` - Exigences et comportement

### Essentiels CLI
\`\`\`bash
openspec list              # Qu'est-ce qui est en cours ?
openspec show [item]       # Voir les détails
openspec validate --strict # Est-ce correct ?
openspec archive <change-id> [--yes|-y]  # Marquer comme terminé (ajouter --yes pour l'automatisation)
\`\`\`

Rappelez-vous : Les spécifications sont la vérité. Les changements sont des propositions. Gardez-les synchronisés.
`;
