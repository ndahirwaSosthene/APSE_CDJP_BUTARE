# Guide de Déploiement en Ligne sur Render (Render.com)

Ce guide fournit la procédure complète pour déployer **APSE CDJP Butare** en ligne sur [Render.com](https://render.com).

---

## 1. Vue d'Ensemble & Prérequis

- **Dépôt GitHub** : `ndahirwaSosthene/APSE_CDJP_BUTARE`
- **Serveur backend** : FastAPI + Uvicorn (ASGI)
- **Frontend** : Application Web réactive sans dépendances externes (HTML5 / Vanilla JS / CSS Kargul Studio)
- **Base de données** : SQLite WAL chiffré Fernet + HMAC Append-Only Audit Trail
- **Runtime Python** : Python 3.11+

Le dépôt contient déjà :
- [`render.yaml`](render.yaml) : Fichier de configuration Render Blueprint (1-Click Deploy)
- [`Dockerfile`](Dockerfile) : Image Docker autonome et portable
- [`.dockerignore`](.dockerignore) : Exclusion des fichiers locaux et caches
- [`.python-version`](.python-version) : Spécification de version Python `3.11.9`
- [`run.py`](run.py) : Lanceur compatible ASGI (`run:app`) et détection automatique de la variable d'environnement `PORT` de Render

---

## 2. Méthode 1 : Déploiement Automatique via Blueprint (Recommandé)

Render propose une fonctionnalité **Blueprints** qui lit le fichier `render.yaml` et configure automatiquement le service web.

1. Connectez-vous à votre compte sur [dashboard.render.com](https://dashboard.render.com/).
2. Cliquez sur le bouton **New +** en haut à droite, puis sélectionnez **Blueprint**.
3. Associez votre compte GitHub et choisissez le dépôt **`APSE_CDJP_BUTARE`** (branche `main`).
4. Render détecte automatiquement `render.yaml` et affiche :
   - **Service Name** : `apse-cdjp-butare`
   - **Environment** : `Python`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `python run.py --host 0.0.0.0 --port $PORT --no-browser`
   - **Health Check** : `/apse-service/health`
5. Cliquez sur **Apply**.
6. Render construit l'application et vous fournit une URL HTTPS sécurisée :  
   `https://apse-cdjp-butare.onrender.com`

---

## 3. Méthode 2 : Déploiement Manuel Web Service (Sans Blueprint)

Si vous préférez configurer le service manuellement dans l'interface Render :

1. Sur [Render Dashboard](https://dashboard.render.com/), cliquez sur **New +** $\rightarrow$ **Web Service**.
2. Sélectionnez **Build and deploy from a Git repository** et connectez le dépôt `APSE_CDJP_BUTARE`.
3. Renseignez les paramètres suivants :
   - **Name** : `apse-cdjp-butare` (ou le nom de votre choix)
   - **Region** : Frankfurt (EU Central) ou Oregon (US West)
   - **Branch** : `main`
   - **Runtime** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `python run.py --host 0.0.0.0 --port $PORT --no-browser`
   - **Instance Type** : `Free` (ou `Starter` pour un disque persistant)
4. Dans la section **Advanced** :
   - **Health Check Path** : `/apse-service/health`
   - **Environment Variables** :
     | Variable | Valeur | Description |
     | :--- | :--- | :--- |
     | `PYTHON_VERSION` | `3.11.9` | Force Python 3.11 |
     | `APSE_HOST` | `0.0.0.0` | Écoute réseau toutes interfaces |
     | `APSE_DATA_DIR` | `/opt/render/project/src/data/runtime_store` | Emplacement des bases SQLite |
5. Cliquez sur **Create Web Service**.

---

## 4. Méthode 3 : Déploiement via Docker

Pour un environnement strictement identique au conteneur local :

1. Sur Render Dashboard, cliquez sur **New +** $\rightarrow$ **Web Service**.
2. Connectez le dépôt `APSE_CDJP_BUTARE`.
3. Render détecte le fichier `Dockerfile` présent à la racine.
4. Sélectionnez le runtime **Docker**.
5. Render exécute automatiquement les étapes de construction du `Dockerfile` (Python 3.11-slim, installation des dépendances et healthcheck intégré).

---

## 5. Stratégie de Persistance des Données

### Mode Gratuit (Free Tier)
- Sur le plan gratuit de Render, le système de fichiers est éphémère (les données en mémoire/disque local se réinitialisent en cas de nouveau déploiement ou après 15 minutes d'inactivité).
- Parfait pour la démonstration, les tests diocésains et la revue d'acceptation.
- Au premier démarrage, APSE initialise automatiquement :
  - Le catalogue complet des formulaires et axes stratégiques (`data/catalog.json`)
  - Les 7 comptes d'utilisateurs officiels
  - Les tâches de démonstration et la chaîne d'audit HMAC

### Mode Production (Starter Tier avec Disque Persistant)
Pour conserver durablement les saisies terrain, les approbations et l'historique complet :
1. Dans Render Dashboard, ouvrez votre Web Service `apse-cdjp-butare`.
2. Allez dans l'onglet **Disks** et cliquez sur **Add Disk**.
3. Renseignez :
   - **Name** : `apse-data`
   - **Mount Path** : `/var/data`
   - **Size** : `1 GB` (largement suffisant pour des années de données SQLite légères et compressées)
4. Dans l'onglet **Environment**, modifiez ou ajoutez :
   - `APSE_DATA_DIR` = `/var/data`
5. Sauvegardez : Render redémarre le service avec le disque persistant monté. Toutes les modifications seront conservées de manière permanente.

---

## 6. Synchronisation Hors-Ligne $\leftrightarrow$ Cloud

Les équipes paroissiales sur le terrain (sans connexion permanente) peuvent utiliser **APSE Windows Portable** sur leur ordinateur ou clé USB. Lorsqu'elles retrouvent une connexion Internet :

1. L'application locale utilise le point de terminaison de synchronisation v2 :
   - `POST https://apse-cdjp-butare.onrender.com/apse-service/v2/sync`
2. Les enregistrements créés hors-ligne sont transmis de manière sécurisée et intégrés dans la base centrale.
3. Les conflits éventuels sont arbitrés automatiquement par la politique `DIOCESE_APPROVED` prioritaire et horodatage HMAC.

---

## 7. Comptes de Test et Accès

À la première ouverture de l'URL Render (`https://<votre-app>.onrender.com`), l'application s'ouvre directement sur le tableau de bord des opérations. Pour basculer entre les personas ou tester les droits RBAC :

| Utilisateur | Mot de passe | Rôle & Visibilité |
| :--- | :--- | :--- |
| `mel.theophile` | `Apse90#Mel!4826` | Responsable MEL Diocésain (Accès complet, validation finale, exports, métadonnées) |
| `direction.janvier` | `Apse90#Dir!7391` | Direction CDJP Butare (Validation stratégique, audits, rapports de synthèse) |
| `coordination.emmanuel` | `Apse90#Coord!6154` | Coordination des Projets (Revue intermédiaire, planification, consolidation) |
| `finance.marceline` | `Apse90#Fin!2947` | Administration & Finance (Suivi budgétaire, timesheets, réalisations du personnel) |
| `cooperation.ruth` | `Apse90#Tech!8302` | Coopération Technique & Partenariats (Revues, indicateurs bailleurs) |
| `driver.emmanuel` | `Apse90#Drv!5419` | Équipe Logistique / Terrain (Timesheets, missions, rapports de transport) |
| `cpjp.test` | `Apse90#Cpjp!6738` | Commission Paroissiale Justice & Paix (Saisie terrain, formulaires F01-F16, Paroisse PAR-01) |

---

## 8. Vérification du Déploiement

Une fois déployé, vous pouvez tester la disponibilité du service en exécutant :

```bash
# Vérification du statut de santé
curl -I https://apse-cdjp-butare.onrender.com/apse-service/health

# Réponse attendue :
# HTTP/2 200 OK
# Content-Type: application/json; charset=utf-8
# {"status": "up", "version": "0.9.1"}
```

