# Reporting axé sur les résultats du PS — R13

Le profil principal **R13** suit les cinq axes, leurs objectifs stratégiques et les treize résultats du PS final du 03.09.2026. Les observations ne sont pas remplacées par une simple liste d’activités. Les profils R01–R12 restent accessibles comme extraits opérationnels complémentaires.

## Contenu

1. Synthèse des résultats : progrès constatés et portée des preuves.
2. Analyse des changements et contribution de CDJP : expliquer ce qui change pour les personnes, familles ou communautés ; distinguer contribution et attribution causale.
3. Matrice PS : axe, objectif, résultat, indicateur, unité organisationnelle, date, valeur de référence, cible de référence, valeur observée, évolution, écart, méthode et preuve.
4. Produits : activité et plan approuvé, intervention, AP, rattachement projet/operational, partenaires, unité de produit, cible et produits effectivement rapportés.
5. Ressources et performance : budget approuvé, dépenses F19 liées, atteinte de cible EFF-01 et coût par produit EFI-01, sans assimiler dépenses ou produits à un impact.
6. Écarts, causes et hypothèses : expliquer l’écart et les facteurs externes sans inventer de causalité.
7. Apprentissages et adaptations : leçons F29, décisions/actions F30 et effets indépendamment vérifiés lorsqu’ils sont documentés.
8. Décisions, responsables et échéances : actions de suivi à préciser par les personnes responsables.
9. Qualité des preuves, données manquantes et limites : déclarer les lacunes et les observations sans rattachement explicite à un résultat PS.
10. Traçabilité : identifiants et révisions des sources non sensibles ; les pièces et cas individuels ne sont pas exposés.

## Règles de calcul et de lecture

Seules les dernières versions approuvées/verrouillées et accessibles à l’utilisateur entrent dans les sources. Une sélection CDJP ou CPJP inclut les descendants autorisés dans le chemin DHIS2. Les plans annuels chevauchant la période du rapport restent disponibles même si leur date de saisie est antérieure à cette période. Leurs dates de référence sont affichées : **une cible annuelle n’est jamais convertie automatiquement en cible trimestrielle** ; la valeur observée couvre la période sélectionnée.

Chaque observation F42 conserve son périmètre, sa date, sa méthode, son baseline et sa cible. Les pourcentages de paroisses différentes ne sont ni additionnés ni moyennés. Les ratios utilisent N/D selon leur définition : taux ×100, coût unitaire ×1 ; les comptes et observations de durée restent distincts. Les écarts d’équité qui nécessitent des données de groupes F41 ne sont pas reconstitués artificiellement à partir d’un seul numérateur F42.

L’évolution correspond à valeur observée moins baseline ; l’écart correspond à valeur observée moins cible. Une différence positive n’est pas automatiquement considérée bonne : le sens souhaité et le contexte doivent être analysés. Sans mesure ou avec dénominateur nul, la valeur reste indisponible. Les cibles manquantes ne sont pas inventées. Un indicateur sans lien explicite au résultat PS est placé dans les observations à compléter, même si son axe est connu.

Les produits F07 sont rapprochés d’un F03 approuvé avec la même unité ; les dépenses F19 sont agrégées sans exposer le dossier financier individuel. Les effets et impacts demandent des preuves et une analyse spécifiques ; l’application ne les déduit jamais d’un nombre de formations ou de participants.

## Utilisation

1. Ouvrir **Rapports**, choisir l’unité et la période. Le français est la langue initiale ; l’interface et le profil existent en français, anglais, kinyarwanda et kiswahili.
2. Cliquer sur l’aperçu R13 et examiner les cinq axes, les résultats sans observation et les liens manquants.
3. Compléter les six rubriques narratives. Référencer les preuves et préciser les responsabilités/échéances dans les décisions. Ne pas y saisir des identités de cas confidentiels.
4. Choisir Word ou Excel pour le rapport complet ; CSV exporte uniquement la matrice.
5. Figer le rapport : le serveur conserve un fichier chiffré, son SHA256 et un dossier F24 de revue. Les analyses soumises sont conservées avec ce dossier.
6. Ouvrir F24, télécharger le fichier, puis suivre **MEL → Coordinateur → Directeur**. Les six analyses doivent être complétées avant approbation finale. Les retours par niveau restent disponibles.
7. Pour corriger le contenu d’un R13 figé, revenir à Rapports et figer une nouvelle version ; le fichier antérieur n’est jamais écrasé. Les identifiants de snapshots permettent de conserver les versions distinctes. L’approbation du dossier F24 et son historique constituent le statut institutionnel ; le fichier figé conserve sa mention d’origine de brouillon, et le téléchargement depuis F24 porte le statut courant dans son nom.

## Sources à préparer

- F03 : chaîne PS, cible, unité, dates, budget et rattachement projet/operational.
- F07 : lien au plan, produits constatés, unité et preuve.
- F42 : indicateur du dictionnaire PS, axe/résultat cohérents, N/D ou mesure, baseline/cible disponibles, méthode et référence de preuve.
- F19 : dépenses effectivement approuvées et lien au plan.
- F29/F30 : leçons, décisions, responsables, échéances et effets vérifiés.

Les données absentes restent visibles comme absentes : produire le rapport ne remplace pas la collecte, la DQA, la validation des traductions ou les décisions institutionnelles. Les essais sur le serveur DHIS2, navigateur, téléphone et restauration restent requis avant mise en production.
