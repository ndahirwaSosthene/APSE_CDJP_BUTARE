# Recette et limites de réception

## Réalisations testées localement

- Chaîne de validation, indépendance auteur/vérificateur/approbateur et impossibilité de sauter une étape.
- Verrouillage, amendement, historique chiffré et absence de double compte de la version remplacée.
- Idempotence, conflit de contenu et contrôle de concurrence.
- Périmètre d’unités, accès sensibles et confidentialité des timesheets propres au salarié.
- Cohérence des désagrégations, lien axe/résultat, horaires sans trajet de nuit et heures ≤24/jour.
- Cycle Learning : revue après action → leçon approuvée → application → effet vérifié par une personne indépendante.
- Alertes de gravité 3–4 créées côté serveur et accusé de réception réservé au rôle sensible autorisé.
- Chiffrement des dossiers/preuves ; journal HMAC et triggers append-only.
- Rapports sur données approuvées seulement, exclusion des détails sensibles, formats DOCX/XLSX/CSV et snapshots immuables.
- Calcul des KPI sur observations approuvées ; division par zéro indisponible ; finance séparée des plans.
- Chiffrement d’une file de 500 enregistrements texte, rejet d’une mauvaise phrase secrète et isolement de compte.
- Contrôles HTTP Origin/header, absence de cache des réponses, résolution serveur des unités.

Les résultats exacts sont dans `test-results.txt` et `validation.json`. Le document Word de test a été rendu pour contrôle visuel ; il utilise des données synthétiques et n’est pas un rapport réel de CDJP.

## Ce qui exige une recette sur le site

| Domaine | Essai à réaliser | Condition de réception |
|---|---|---|
| Version serveur | Import métadonnées VALIDATE puis CREATE | Aucun rejet/avertissement non résolu |
| Identité | Connexion, expiration, révocation et MFA réels | Aucune identité injectée, session refusée si retirée |
| Autorisations | Comptes CEB/CCJP/CPJP/finance/RH/MEL/direction | Refus API directs inter-unités et accès minimaux |
| Validation | Comptes réels distincts et rôles cumulés | Auto-vérification et auto-approbation refusées |
| Navigateur | Chrome/Edge/Firefox, écran mobile | Toutes tâches critiques réalisables, aucun défaut bloquant |
| Offline terrain | 7 jours, 500 fiches, reconnexion faible | Zéro perte, doublons résolus, refus en file conservés |
| Pièces | Chiffrement et téléchargement autorisé | Aucune pièce accessible hors mandat ; pièces après reconnexion |
| Sauvegarde | Restauration sur hôte vierge | RPO/RTO mesurés, intégrité et clés disponibles |
| Charge | Volumes réels et croissance ×3 | Performance et disponibilité contractuelles atteintes |
| Rapports | Totaux, libellés, signature et confidentialité | Concordance avec sources et modèles validés |
| Traductions | Relecture RW/EN/FR/SW | Terminologie métier approuvée |
| Annuaire et PS | Noms/parents, cibles, dates d’évaluation | Validation institutionnelle et décisions tracées |
| Exploitation | Patchs, alertes, support et rétention | Responsables et procédures effectives |

Aucun test local ne certifie la production. Il n’est pas possible d’affirmer une réalisation “100% réceptionnée” sans serveur cible, annuaire complet, clés d’exploitation, affectations et essais réels. Il ne manque pas une permission demandée au lecteur : il manque des preuves de déploiement et des données institutionnelles que le code ne doit pas inventer.

## Limites fonctionnelles explicites

- Le mode offline traite les fiches texte ; les pièces sont jointes après synchronisation. Un test chiffré de 500 fiches n’est pas un test de sept jours sur téléphone.
- Les onze vues du portail fonctionnent sur les sources de l’extension. Les dashboards natifs DHIS2 sont des cartes d’orientation et nécessitent des visualisations finales dans l’instance retenue.
- La publication des événements non sensibles et des entrées mensuelles F42 est fournie ; la validation de toutes les analyses natives requiert rapprochement métier et recette serveur. Les valeurs stratégiques ne sont pas devinées.
- Les formulaires de monitoring ne remplacent pas la comptabilité générale, les paiements, la paie ni un avis clinique/juridique.
- Les alertes critiques sont disponibles immédiatement dans le serveur et interrogées par le portail sensible toutes les 30 secondes lorsque celui-ci est ouvert. Aucun email/SMS externe n’est envoyé par défaut.
- L’IA demeure optionnelle et désactivée ; aucun dossier sensible n’est transmis à un modèle externe.
- L’audit est protégé contre l’altération sans clé ; un stockage externe WORM et l’archivage légal sont des décisions d’infrastructure.
- Les migrations RC1/Kobo/Excel et les durées d’effacement sont à valider, sans suppression automatique ni rapprochement inventé.
