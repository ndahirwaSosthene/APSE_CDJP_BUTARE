> Historique 0.3 : le circuit et les règles d’accès sont remplacés par `V0_4_GOUVERNANCE_ET_PROJETS.md`. Les instructions de langue, sources et assistant restent applicables.

# Planification PS et administration — 0.3.0

Le français est la langue d’ouverture. Kinyarwanda, English et Kiswahili sanifu sont sélectionnables ; les couleurs CDJP jaune `#fdf751` et jaune pâle `#fefab4` sont conservées. Quatre thèmes sont disponibles. Les libellés des 131 champs, 42 fiches, cinq objectifs, 25 types opérationnels et 33 titres d’activités sont disponibles en quatre langues. Les traductions sont de travail et doivent être relues. Les textes narratifs importés (résultats attendus, indicateurs de certaines activités, feuille de route) restent la formulation française source tant que MEL n’a pas validé leurs traductions ; changer la langue n’invente pas une traduction.

## Source faisant autorité

PS final du **03.09.2026**, canevas CPJP 2026–2031 et plan annuel Economat 2026–2027 fournis avec cette demande. Le calendrier final est avril–juillet 2031 ; mi-parcours janvier–mars 2029. Ces dates remplacent l’ancienne divergence 2030/2031. Les extractions et localisations source sont dans `sources/planning_sources_extracted.json` et chaque ligne du référentiel.

Les 25 types chiffrés du PS sont **indicatifs**, en millions RWF, répartis par année. Ils ne deviennent pas des budgets approuvés en étant affichés. Les 33 activités Economat détaillées concernent **AP1 seulement**. AP2 ne reprend pas artificiellement cette liste. L’axe 3 n’a pas de ligne annuelle détaillée remplie dans le canevas fourni. Le total Excel source contient des références répétées ; le système importe les valeurs de lignes et ne reprend pas ce total.

## Préparer le plan annuel

1. Ouvrir **Planification du PS**. Choisir AP1–AP5 et Staff ou CPJP selon les droits.
2. Consulter l’objectif, l’intervention disponible, la provenance et le montant indicatif de l’année. Le PS ne lie pas chaque type budgétaire à une intervention unique : choisir l’intervention de l’axe, sans inventer de correspondance.
3. Cliquer **Préparer cette activité**. Compléter F03, résultat stratégique, code unique, dates, responsable réel, cibles, lieu, risques et budget proposé. Les responsables mentionnés dans le classeur sont des fonctions ; ils ne sont pas transformés en comptes fictifs.
4. Enregistrer le brouillon, joindre les preuves et soumettre à des personnes distinctes. La création n’approuve aucun montant.
5. Pour F07, renseigner `plan_ref` avec l’identifiant du F03 approuvé ; unité, année, axe et période sont contrôlés. Une activité non prévue exige un motif explicite. Les brouillons offline sont revalidés à la synchronisation.

Le serveur rejette une activité annuelle d’une autre AP, les dates hors AP et les tâches Staff sélectionnées par CPJP. Ajouter les tâches détaillées des années suivantes via MEL après validation institutionnelle. Les types stratégiques pluriannuels restent disponibles selon leur affectation annuelle réelle.

### Correspondance du canevas CPJP

| Colonne source | Champ F03 |
|---|---|
| Besoin / problème | `need` |
| Changement souhaité | `change` |
| Activité | `activity` et `title` |
| Situation actuelle et source | `baseline_text` ; `baseline` si numérique |
| Cible annuelle | `target_text` ; `target` si numérique |
| Argent nécessaire RWF | `budget` |
| Valeur bénévolat / apports en nature RWF | `local`, distinct du cash |
| Lieu | `location`, unité DHIS2 et limites administratives validées |
| Responsable | `owner` |
| Période | `start`, `end`, `ap` |

## Vérification, approbation et retours

Préparation → soumission → vérification → finance si applicable → qualité MEL → approbation → verrouillage. L’auteur, les vérificateurs et l’approbateur apparaissent avec leurs identifiants et décisions. Les retours sont chiffrés, conservés par dossier et adressables à Auteur, Vérification, Finance, MEL, Approbation ou Tous. L’onglet Retours contient les messages destinés à votre niveau et autorisés dans votre périmètre ; ouvrir le dossier pour répondre. Il s’agit d’une messagerie interne, sans envoi de courriel automatique.

MEL peut lire et corriger tous les dossiers dans **son périmètre DHIS2 affecté**, y compris ceux d’un autre auteur et les dossiers sensibles. Affecter le compte MEL au niveau diocésain pour le périmètre complet. Les personnes ordinaires corrigent leurs propres brouillons. Les versions approuvées sont corrigées par amendement, sans effacer l’original. L’indépendance des validations demeure imposée, même à MEL.

## Administration des métadonnées

L’onglet **Métadonnées** est réservé à `APSE_MEL`. Il permet d’ajouter ou modifier axes, objectifs, résultats, interventions, AP, types opérationnels, tâches annuelles, unités, fonctions et champs, avec libellés en quatre langues, motif et version. Un conflit de version refuse l’écrasement. Les unités ont un code, un parent validé et éventuellement un UID DHIS2 ; les cycles et parents inconnus sont refusés. Le panneau JSON expose les paramètres spécialisés (dates, AP, montants, listes de champs, statut actif). Désactiver avec `active:false` plutôt qu’effacer l’historique. Un champ utilisé par une fiche active ne peut pas être désactivé.

Les fiches existantes peuvent être étendues avec des champs ; leurs obligations initiales et leur classification sensible ne peuvent pas être affaiblies. Une nouvelle chaîne de workflow ou un changement de classification demande une modification de code revue, pour conserver les contrôles d’accès. Ces métadonnées gouvernent l’extension APSE ; elles ne créent pas automatiquement des unités, comptes ou schémas dans DHIS2. L’administrateur DHIS2 effectue séparément la validation et l’import natifs. Aucun droit DHIS2 n’est auto-attribué par l’interface.

Les 27 paroisses suivent le dernier canevas CPJP. Les variantes Kibirizi/Kibilizi, Kirarammogo/Kirarambogo et St. Dominique/St Dominique restent des alias à confirmer. **Aucun parent de paroisse n’est inventé**. Le registre complet nommé des CCJP/Centrales, CEB, secteurs et cellules n’a pas été fourni ; le système accepte leur enregistrement, mais ne prétend pas que les milliers d’unités sont déjà renseignés. Les fonctions des organigrammes sont référencées ; les nominations personnelles et affectations restent à valider.

## Tableau de bord

La vue PS présente axe → objectif → intervention → AP, avec activités prévues approuvées, activités exécutées approuvées, dossiers en attente, budget approuvé et dépenses F19. Les filtres AP, axe et intervention sont disponibles ; les versions remplacées approuvées ne sont pas comptées deux fois. Les observations KPI et l’apprentissage demeurent dans les vues existantes. Une activité comptée ne prouve pas un effet ou un impact.

Les périodes sont jour, semaine ISO, mois civil, trimestre pastoral, semestre pastoral, année septembre–août, bilan de deux années, PS complet, mi-parcours et final. **Semestriel signifie deux fois par an ; biennal signifie deux années.** Les jours bissextiles et les trimestres traversant décembre sont gérés. Les dates peuvent aussi être choisies directement.

## Assistant et orthographe

Les champs texte activent la vérification orthographique du navigateur pour la langue sélectionnée ; les dictionnaires disponibles dépendent du navigateur. L’assistant propose correction grammaticale, traduction et résumé dans la langue choisie, sur un texte d’un dossier que l’utilisateur peut consulter. L’utilisateur compare puis applique la proposition ; aucune validation ni modification n’est automatique.

L’IA est désactivée tant que `APSE_OLLAMA_MODEL` est vide. Installer et tester séparément Ollama et un modèle multilingue approprié sur le même hôte, puis définir le nom exact du modèle dans l’environnement systemd et redémarrer le service. MEL active ensuite `aiEnabled:true` dans Métadonnées → settings → SYSTEM avec un motif ; les deux conditions sont requises. La connexion est fixée à `127.0.0.1:11434`, sans transfert cloud configuré par le navigateur. Le modèle n’est pas inclus, ni testé en fonctionnement dans ce package. Prévoir les ressources matérielles et faire relire particulièrement le kinyarwanda et le kiswahili. Un message explicite indique l’absence ou l’indisponibilité du modèle.

## Recette avant utilisation réelle

Exécuter les tests inclus, importer en validation sur une instance de test, affecter les comptes et unités réels, vérifier les traductions, saisir des dossiers synthétiques et tester les refus inter-unités. Tester ensuite navigateur/téléphone, mode hors ligne, reprise, sauvegarde/restauration et modèle local éventuel. Les tests automatisés du package ne certifient pas ces essais sur l’infrastructure CDJP.
