# Déploiement de l’extension APSE

Cette version inclut un service serveur : l’import du ZIP d’application seul ne suffit pas. Le noyau DHIS2 n’est pas modifié. Le service gère les workflows, les pièces chiffrées, l’apprentissage, les opérations et les rapports ; DHIS2 assure l’identité, la hiérarchie et les analyses des données approuvées publiées.

1. Préparer un hôte Linux administré, Python 3.12+, HTTPS existant pour DHIS2 2.42.x, Nginx, espace de données et sauvegardes séparées. Le service écoute **uniquement 127.0.0.1**.
2. Copier le dossier sous `/opt/apse`, créer un utilisateur système `apse`, puis créer un environnement Python :

```bash
python3 -m venv /opt/apse/venv
/opt/apse/venv/bin/pip install -r /opt/apse/service/requirements.txt
```

3. Créer `/var/lib/apse` appartenant à `apse`, permissions `0700`. Créer `/etc/apse/apse.env` à partir de l’exemple, permissions `0600`. Générer les clés localement avec `Fernet.generate_key()` et `secrets.token_hex(32)` ; conserver une copie de secours sécurisée séparée des sauvegardes. Ne jamais publier les clés ou jetons. La perte de la clé de chiffrement rend les données illisibles.
4. `APSE_PUBLIC_ORIGIN` est l’origine HTTPS sans chemin. `DHIS2_URL` inclut le contexte DHIS2. `APSE_PATH` inclut le même contexte, par exemple `/dhis/apse-service`. Ce choix permet au navigateur de transmettre les cookies DHIS2 dont le Path est `/dhis`. Garder le reverse proxy et la variable cohérents.
5. Installer `apse.service` dans systemd et ajouter le bloc Nginx au serveur HTTPS DHIS2 existant. Tester les configurations avant rechargement. Un proxy de production doit gérer limites de connexions, TLS, surveillance et rotation des journaux sans publier les paramètres sensibles des requêtes.
6. Importer les métadonnées avec le script d’installation en mode validation puis création ; installer `APSE_App_0.6.0.zip` dans DHIS2 App Management.
7. Ajouter les utilisateurs dans les groupes requis et leurs unités de saisie. Le service vérifie chaque session auprès de DHIS2 ; il n’accepte pas une identité fournie par le navigateur. Les noms de groupes APSE définissent les fonctions dans l’extension. Les autorités DHIS2 restent à configurer pour les opérations natives.
8. Dans la version 0.4, les groupes humains ont **lecture seule sur les programmes miroirs DHIS2**. Seul un compte technique du groupe `APSE_PUBLISHER`, aux autorités minimales et jeton conservé côté serveur, publie les dossiers approuvés. Ne pas donner d’écriture directe native aux utilisateurs si l’on veut éviter de contourner le workflow de l’extension. Les administrateurs système restent des personnes privilégiées à contrôler.
9. Exécuter les tests d’accès inter-unités, la chaîne de validation avec des comptes distincts, le cycle Learning, les exports, le mode hors ligne et la restauration sur un environnement de test. Le package ne constitue pas un test déjà réussi sur votre infrastructure.

## Groupes de l’extension

- `APSE_MEL` : administration versionnée des métadonnées, lecture et correction de tous les dossiers du périmètre DHIS2 affecté, qualité, apprentissage et pilotage transversal. Affecter au niveau diocésain pour tout couvrir.
- `APSE_COORDINATION` : vérification après validation MEL ; `APSE_REVIEWER` reste une fonction de soutien, sans droit de remplacer cette étape.
- `APSE_FINANCE` : revue financière et informations financières autorisées.
- `APSE_DIRECTION` : approbation finale ; `APSE_CURE` supervise la paroisse et ne remplace pas le Directeur dans ce circuit.
- `APSE_CPJP` / `APSE_CCJP` / `APSE_CEB` : saisie opérationnelle dans leurs unités, sans accès automatique aux dossiers de gestion ou sensibles.
- `APSE_HR` : disponibilité, temps, performance et documents RH selon périmètre.
- `APSE_SENSITIVE` : dossiers individuels sensibles après mandat institutionnel.
- `APSE_COMMUNICATION` : contributions de communication non sensibles dans le périmètre.
- `APSE_AUDITOR` : vérification de la chaîne d’audit ; pas d’accès implicite à tous les cas.
- `APSE_PUBLISHER` : compte technique de publication DHIS2, jamais un compte partagé de saisie humaine.

Un titulaire peut cumuler des fonctions, mais le serveur interdit l’auto-vérification et impose un approbateur distinct des vérificateurs. Pour une fiche financière : auteur → MEL → Coordinateur → Directeur. Les fonctions de vérification et qualité peuvent être portées par la même personne indépendante de l’auteur ; la direction ne peut pas approuver si elle a déjà vérifié cette fiche.

## Publication approuvée dans DHIS2

Exécuter d’abord sans `--apply` :

```bash
python3 scripts/sync_dhis2.py --url https://YOUR-HOST/dhis --start 2026-09-01 --end 2031-08-31 --root-path /YOUR_ROOT_UID
```

L’option `--apply` publie les versions approuvées non sensibles et les entrées mensuelles N/D des observations F42. Les cellules issues de versions remplacées sont explicitement vidées si elles n’ont plus de source approuvée. Le dry-run affiche aussi le nombre de cellules à vider. La source canonique des statuts est l’extension. Utiliser toute la période stratégique lors d’un rapprochement complet, notamment après amendement de dates. Les dossiers sensibles restent dans l’espace chiffré de l’extension. Les données précédemment saisies en RC1 ne sont pas migrées automatiquement : préparer un rapprochement explicite avant d’utiliser 0.3 sur une base contenant déjà les mêmes UID.

## Sauvegarde et restauration

```bash
python3 service/jobs.py backup --database /var/lib/apse/apse.sqlite --file /SAFE_BACKUP/apse-2026-10-19.enc
python3 service/jobs.py restore --database /ISOLATED_TEST/apse.sqlite --file /SAFE_BACKUP/apse-2026-10-19.enc
python3 service/jobs.py verify --database /ISOLATED_TEST/apse.sqlite
```

Le backup utilise l’API SQLite de sauvegarde, inclut dossiers, historique, pièces et audit, puis chiffre le résultat. La restauration refuse d’écraser une base existante. Copier le backup hors site, vérifier le checksum et garder une ancre d’audit externe. Les journaux HMAC détectent une altération sans la clé ; ils ne rendent pas un administrateur possédant toutes les clés incapable de modifier les données. Une véritable conservation WORM demande une infrastructure externe.

Programmer les sauvegardes via l’ordonnanceur du serveur ; aucun job n’est installé silencieusement. La rétention, les gels, l’effacement des copies et les obligations légales doivent être définis par l’organisation. Ce service n’efface pas automatiquement des dossiers sensibles avec une durée inventée.

## Hors ligne

L’utilisateur prépare une file chiffrée avec une phrase secrète d’au moins 12 caractères. Le navigateur met en cache uniquement l’application statique ; snapshot de configuration, identité et brouillons restent chiffrés. La clé demeure en mémoire, jamais en stockage local. Au retour du réseau, chaque envoi réutilise une clé d’idempotence et le serveur recontrôle identité, droits, champs et doublons. Une session valide est nécessaire pour synchroniser. Les refus restent en file pour correction, pas supprimés.

Limites concrètes : texte seulement dans la file ; les pièces sont jointes après synchronisation ; la taille disponible dépend du navigateur ; un seul onglet est recommandé. Tester les 500 enregistrements requis, la perte réseau et les appareils utilisés. Les administrateurs doivent appliquer chiffrement du poste, verrouillage, procédure de perte et rétention. Le mode hors ligne du portail ne s’appuie pas sur Android Capture pour contourner le workflow.

La référence normative actuelle est `docs/V0_4_GOUVERNANCE_ET_PROJETS.md`. `APSE_PARISH_REPORTER`, CCJP et CEB ne planifient pas. Les modifications MEL en revue invalident la vérification antérieure. Pour une base existante, suivre la migration 0.4 décrite dans ce guide avant remise en service.
