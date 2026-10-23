# Référence institutionnelle de la version 0.4.0

Cette règle remplace les descriptions de circuit précédentes. Source : clarification de Théophile NTAKIRUTIMANA du 20 octobre 2026.

## Planification

**CDJP et CPJP seulement** élaborent les plans. CCJP et CEB contribuent aux informations et rapports ; elles ne disposent pas du droit de créer un plan annuel, trimestriel ou hebdomadaire. Le refus est appliqué à l’API, pas seulement dans le menu. Une unité identifiée CCJP/CEB dans le registre ne peut pas porter un plan même si l’opérateur est MEL. Affecter les unités de planification à CDJP ou CPJP et valider leur liaison UID DHIS2.

## Quatre volets spécifiques du CPJP

| Volet | Mission |
|---|---|
| Parajuristes | Assistance et conseil juridiques |
| Médiateurs | Résolution des conflits familiaux et autres conflits qui affectent paix et relations |
| Abahumurizamitima | Écoute active des personnes qui les sollicitent |
| Abafashamyumvire mu isanamitima | Facilitation de la guérison, de l’unité, de la réconciliation et de la résilience |

Ces volets rendent compte au comité CPJP. Celui-ci comprend **six sièges : président, vice-président, secrétaire, trésorier et deux conseillers**. L’aumônier Justice et Paix s’y ajoute ; le curé supervise l’ensemble. Le registre `cpjp_governance` représente cette composition sans transformer six sièges en six personnes nommées fictives.

Le groupe `APSE_PARISH_REPORTER` permet la contribution aux rapports, sans planification ni validation. Les personnes sont affectées à leur paroisse et choisissent leur volet dans les dossiers. L’accès aux fiches individuelles sensibles demande un mandat et le groupe de dossiers sensibles. Les comptes `APSE_CPJP` portent le comité et sa planification ; les noms de titulaires restent à attribuer par l’administrateur.

## Circuit d’information imposé

**Volets → comité CPJP → MEL → Coordinateur → Directeur**.

Dans l’application : brouillon → soumis à MEL → validé par MEL → vérifié par le Coordinateur → approuvé par le Directeur → verrouillé. Le curé supervise au niveau paroissial ; il ne remplace pas l’approbation finale du Directeur dans le système. La revue financière intervient par les dossiers financiers et les retours, sans modifier cet ordre obligatoire.

MEL peut corriger les dossiers d’autres auteurs, y compris pendant la revue. Une correction d’un dossier déjà validé par MEL ou vérifié par le Coordinateur **réinitialise le dossier à « soumis à MEL »** : nouvelle validation MEL, puis nouvelle vérification du Coordinateur. Les transitions, identités, décisions et versions restent conservées. Un dossier approuvé ou verrouillé nécessite un amendement. MEL peut examiner sa propre correction ; le Coordinateur et le Directeur restent indépendants de l’auteur et le Directeur ne peut pas être un vérificateur du dossier. Les historiques de l’ancien circuit ne permettent pas de sauter la validation MEL actuelle.

MEL, Coordinateur et Directeur ont accès aux dossiers de leur périmètre DHIS2 pour assurer ce circuit. Le périmètre diocésain doit être attribué explicitement ; aucun accès inter-unité hors affectation n’est accordé.

## Projets, opérations et partenaires

- `work_type=PROJECT` : un projet actif enregistré est obligatoire. Les dates de l’activité et son axe doivent respecter le projet.
- `work_type=OPERATIONAL` : aucun projet ne doit être indiqué.
- `project` : code stable ; `partners` : codes de partenaires séparés par virgules ; `volet` : l’un des quatre volets CPJP.
- Une activité liée à un F03 approuvé doit reprendre la même classification et le même projet. Les informations stratégiques manquantes sont héritées uniquement dans les champs disponibles du formulaire.

MEL enregistre d’abord les partenaires dans Métadonnées → `partners`, puis les projets dans `projects` avec code, quatre libellés, dates, axes et partenaires. Les registres initiaux sont vides : aucune convention, date contractuelle ni enveloppe de projet n’a été inventée. L’éditeur avancé JSON permet par exemple :

```json
{"code":"EXEMPLE_PROJET","labels":{"fr":"Exemple fictif","en":"Synthetic example","rw":"Urugero rw’impimbano","sw":"Mfano wa kubuni"},"start":"2026-09-01","end":"2027-08-31","axes":["A1"],"partners":[],"active":true}
```

Cet exemple est une structure à adapter, pas un projet réel à importer automatiquement.

## Effectiveness et efficiency

L’onglet **Projets et opérations** filtre par projet, activité operational et partenaire. Il montre plans/activités approuvés, budget, dépenses, partenaires et nombre d’activités par volet. Les KPI suivants sont calculés **par plan approuvé et unité de produit**, en conservant les observations manquantes comme indisponibles.

| KPI | Calcul | Limite |
|---|---|---|
| EFF-01 Atteinte de la cible de produit | Produits F07 approuvés et liés ÷ cible F03 × 100 | Mesure l’atteinte du produit ; ne prouve pas un effet ou un impact |
| EFI-01 Coût réel par produit | Dépenses F19 approuvées et liées ÷ produits F07 approuvés | Coût cash ; comparer même indicateur, unité et standard de qualité |
| EFI-02 Coût prévu par produit | Budget F03 approuvé ÷ cible F03 | Référence de comparaison, sans seuil universel inventé |
| FIN-01 Exécution budgétaire | Dépenses F19 liées ÷ budget F03 × 100 | Un taux de dépense n’est pas une mesure d’efficacité |

Renseigner `target` et `output_unit` dans F03 ; `outputs`, `output_unit` et `plan_ref` dans F07 ; `spent` et `plan_ref` dans F19. Des unités différentes sont refusées pour les activités liées. Sans unité explicite, sans actualisation approuvée ou avec dénominateur nul, le ratio correspondant reste indisponible. Les produits hétérogènes des projets ne sont jamais additionnés pour fabriquer un pourcentage global. Les KPI d’effets et résultats stratégiques continuent à être suivis par F42 et le dictionnaire PS ; les quatre KPI calculés figurent dans `registers/performance_kpis.json`, avec libellés dans quatre langues.

## Déploiement et mise à jour

Lire `deploy/README.md` puis `docs/INSTALLATION.md`. Le package principal contient le service obligatoire et `APSE_App_0.4.0.zip` pour l’App Management. La simple installation du ZIP d’application ne crée pas le serveur.

Pour une base 0.3 existante : arrêter le service, effectuer une sauvegarde chiffrée et vérifier sa restauration isolée ; installer le nouveau code ; examiner `scripts/migrate_v4.py` sans `--apply`. L’option `--apply --backup /CHEMIN/backup.enc` retourne les anciens dossiers en revue à « correction » avec audit, sans modifier les approuvés/verrouillés ni inventer leur rattachement projet. Compléter explicitement la classification des anciens dossiers. Les métadonnées DHIS2 déjà existantes nécessitent une migration native revue ; l’importateur de création refuse volontairement de les écraser. Valider les nouveautés natives sur une copie de test avant production.

Le déploiement réel exige le serveur DHIS2 cible, ses affectations et ses accès administrateur. Ils ne sont pas inclus ni supposés. Les tests de code et de démonstration ne remplacent pas l’import natif, le navigateur/téléphone et la restauration dans l’environnement CDJP.
