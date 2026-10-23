# Installation

Lire d’abord **`deploy/README.md`**, qui décrit le service obligatoire, le reverse proxy, l’authentification, les secrets et les sauvegardes.

## Métadonnées DHIS2

Version cible testable : DHIS2 2.42.x. Le package n’installe pas DHIS2 lui-même et ne prétend pas que 2.42 est la dernière version disponible. Vérifier le support et la version retenue au déploiement.

```bash
python3 scripts/validate_package.py
python3 scripts/install.py --url https://YOUR-HOST/dhis --root YOURUID1234 --out import-validation.json
```

Définir `DHIS2_TOKEN` localement par un canal sûr avant l’appel. Le script refuse HTTP, les redirections, les UID déjà présents et les avertissements de validation. Sans `--apply`, aucune métadonnée n’est créée. Après revue, répéter avec `--apply` sur le serveur de test.

Les programmes sensibles sont exclus par défaut. Sur une base vierge de test, utiliser `--include-sensitive` uniquement lorsque le périmètre et les accès sont préparés. L’extension protège ses propres données indépendamment des miroirs natifs. La mise à jour d’une installation RC1 existante nécessite une migration explicite ; l’importateur ne remplace pas silencieusement les objets existants.

## Annuaire

Compléter et valider `registers/organisations.csv`. Les 27 noms de paroisses sont disponibles. Les 101 Centrales et 2 936 CEB doivent être fournies avec noms, UID, parents, dates et validation. Ne pas créer artificiellement des unités pour atteindre un total.

```bash
python3 scripts/build_units.py registers/organisations.csv --existing-parent EXISTINGUID --output organisation-units.json
```

Importer ensuite en validation avant création. Les Doyennés, limites administratives et dates historiques restent institutionnels. Les parents de paroisses restent à confirmer ; aucune affectation de doyenné n’est présumée dans le registre livré.

## Construire le package depuis le code

```bash
python3 scripts/build.py
python3 scripts/add_analytics.py
python3 scripts/extend_v2.py
python3 scripts/finalise_v2.py
python3 scripts/extend_v3.py
python3 scripts/localise_v3.py
python3 scripts/finalise_v3.py
python3 scripts/extend_v4.py
python3 scripts/extend_v5.py
python3 scripts/extend_v6.py
python3 scripts/validate_package.py
python3 scripts/package.py
```

L’ordre est obligatoire. Les scripts base réinitialisent les métadonnées générées. Ne pas modifier à la main le fichier généré en espérant conserver les changements au rebuild ; versionner les modifications dans les scripts et les sources validées.

## Application

Installer **`APSE_App_0.6.0.zip`** via DHIS2 App Management après mise en place du service. Le manifeste lance `operations.html`. Les points d’entrée RC1 sont conservés uniquement comme source historique ; ne pas les utiliser pour contourner la validation indépendante.

## Tests

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/core.test.js
node tests/vault.test.cjs
```

Le test navigateur exige Chromium/Playwright et n’a pas été exécuté avec succès dans l’environnement de construction. Les tests HTTP utilisent des identités DHIS2 simulées : ils ne certifient pas les sessions ni les permissions de votre instance réelle.

Pour la démonstration locale sans DHIS2 réel, lire `docs/TEST_OFFLINE_RW.md`. Ne jamais déployer `scripts/demo_offline.py` en production.
