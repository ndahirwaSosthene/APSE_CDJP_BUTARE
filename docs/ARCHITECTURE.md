# Architecture de la version 0.4

Le cœur DHIS2 est conservé. Les métadonnées représentent les programmes, options, champs et indicateurs. L’extension serveur ajoute les transitions indépendantes, l’historique, les pièces chiffrées, le Learning, les opérations et les rapports qui n’étaient pas fournis par le simple package RC1.

## Source et circulation

Les utilisateurs se connectent à DHIS2. L’application utilise la même origine HTTPS et les cookies de session. Le service vérifie l’identité et les groupes auprès de `/api/me` à chaque requête authentifiée, puis résout les unités auprès de DHIS2. Les chemins d’unités envoyés par le navigateur ne sont jamais utilisés comme preuve de périmètre.

Les dossiers de l’extension sont la source canonique des états de validation. Les métadonnées natives sont en lecture pour les groupes humains. Un compte technique distinct peut publier uniquement les versions approuvées non sensibles dans DHIS2. Les dossiers individuels sensibles restent dans l’espace chiffré. Ne pas ouvrir l’écriture directe aux utilisateurs sur les miroirs si l’on veut préserver l’intégrité du workflow.

La publication utilise un identifiant stable de la lignée d’amendement pour éviter le double compte des versions. Les données disparues sont explicitement mises à null lors de l’actualisation du miroir. Un rapprochement complet couvre toute la période stratégique, notamment si les dates changent.

## Contrôles de workflow

Brouillon → Soumis à MEL → Validé MEL → Vérifié Coordinateur → Approuvé Directeur → Verrouillé. Retour pour correction possible avant approbation. MEL peut corriger et valider ; le Coordinateur et le Directeur restent indépendants de l’auteur, et le Directeur est distinct des vérificateurs. Une modification en lecture seule exige un amendement ; l’original et chaque révision sont conservés chiffrés.

La concurrence est gérée par transactions SQLite et révision optimiste. Une clé d’idempotence est liée à l’auteur et à l’empreinte du contenu : même requête, même résultat ; même clé avec autre contenu, conflit. Un code métier déjà utilisé dans le même formulaire et la même unité exige résolution humaine.

## Sécurité des données

Dossiers, historique, preuves et snapshots sont chiffrés avec Fernet. Le chiffrement ne remplace ni TLS, ni permissions du disque, ni gestion des clés, ni politique de rétention. Le journal d’audit est append-only par triggers et protégé par une chaîne HMAC ; conserver une ancre externe et des sauvegardes séparées. Un administrateur contrôlant application, stockage et clés reste privilégié.

La file offline est chiffrée AES-GCM avec clé dérivée PBKDF2-SHA256 de la phrase secrète ; la clé n’est pas persistée. Le service worker met en cache uniquement les fichiers de l’application, pas les réponses API. Les pièces offline ne sont pas gérées : elles sont jointes après synchronisation.

## Analyses

Les dashboards du portail calculent les valeurs à partir des versions approuvées les plus récentes dans le périmètre courant. Les dépenses proviennent de F19, les budgets des plans F03, afin de ne pas réadditionner le budget pour chaque facture. Les participations ne sont jamais présentées comme des personnes uniques. F42 documente des observations KPI ; les ratios utilisent somme N / somme D, les médianes utilisent des observations de durée individuelles et les écarts d’équité utilisent F41.

Le script de publication alimente aussi les entrées N/D du dataset mensuel à partir des F42 approuvées et efface les cellules historiques devenues obsolètes après amendement. Les médianes et écarts restent calculés dans le portail. Les graphiques natifs DHIS2 demeurent des destinations analytiques à rapprocher avec les sources approuvées : il n’y a pas de preuve qu’ils aient été configurés et testés sur l’instance de CDJP. Les dashboards natifs livrés sont des cartes d’orientation ; les onze vues fonctionnelles sont dans l’application APSE.

## Références

- PS officiel fourni : *Plan strategique CDJP Butare 2026-2031 12 8 2026 Final(1).docx*, tableau 17, sections 3.6.5 et 4.4.
- Cahier des charges APSE : *Specifications_Systeme_APSE_CDJP_Butare_2026-2031.docx*, version Library 2.
- Manuel fourni : *20260805_Manuel des Procedures CDJP Butare July 2026(1).docx*, périmètre administratif, RH, finances, achats et stocks. Les taux légaux et barèmes n’ont pas été automatisés.
- Métadonnées : https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-242/metadata.html
- API Tracker : https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-242/tracker.html
- Applications : https://developers.dhis2.org/docs/overview/all-features/

Les documents institutionnels sont les sources des libellés FR. Les traductions RW/EN/SW sont des traductions de travail à relire par les locuteurs mandatés avant diffusion officielle.
