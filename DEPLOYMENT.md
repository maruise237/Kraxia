# Kraxia — guide de déploiement Dokploy / Coolify

Ce guide décrit comment déployer Kraxia sur **Dokploy**, **Coolify** ou
n'importe quel hôte Docker, sans aucune dépendance hors-ligne.

## 1. Pré-requis

- Serveur sous Debian/Ubuntu 22.04+ avec Docker Engine ≥ 24 et Compose v2.
- Sous Dokploy/Coolify, la machine cible est déjà provisionnée (Traefik
  installé, ports 80/443 ouverts). Pour Docker brut, vous aurez besoin d'un
  reverse-proxy (Traefik, Nginx, Caddy) pour exposer le frontend en HTTPS.
- Domaine pointant vers l'IP du serveur (ex. `kraxia.example.com`,
  optionnel `api.kraxia.example.com` pour la passerelle).
- Au moins **une clé API LLM** (Anthropic, OpenAI, DeepSeek, DashScope,
  OpenRouter, etc.) : les appels sortants échouent sans clé.

## 2. Variables d'environnement

Avant tout déploiement, copiez le modèle et éditez-le :

```bash
cp .env.example .env
nano .env
```

Variables obligatoires (le compose refusera de démarrer sans) :

| Variable | Description |
|---|---|
| `JWT_SECRET` | Chaîne aléatoire ≥ 32 caractères pour signer les tokens. |
| `ADMIN_PASSWORD` | Mot de passe du compte administrateur créé au premier démarrage. |
| `ANTHROPIC_API_KEY` (ou autre) | Au moins une clé LLM. |

Variables facultatives :

| Variable | Défaut | Description |
|---|---|---|
| `POSTGRES_USER` | `kraxia` | Utilisateur Postgres interne. |
| `POSTGRES_PASSWORD` | `kraxia` | Mot de passe Postgres. |
| `POSTGRES_DB` | `kraxia_platform` | Nom de base. |
| `GATEWAY_PORT` | `8080` | Port hôte exposé pour la passerelle. |
| `FRONTEND_PORT` | `3000` | Port hôte exposé pour le frontend. |
| `VITE_API_URL` | vide | URL absolue de la passerelle si elle est sur un sous-domaine distinct (ex. `https://api.kraxia.example.com`). Videz si tout passe par le reverse-proxy. |
| `DEFAULT_MODEL` | `dashscope/qwen3-coder-plus` | Modèle par défaut proposé aux utilisateurs. |
| `CONTAINER_TZ` | `UTC` | Fuseau horaire des conteneurs utilisateur. |
| `PLATFORM_CONTAINER_MEMORY_LIMIT` | `2g` | Mémoire maximale allouée à chaque conteneur. |

## 3. Déploiement Dokploy

1. Créez un nouveau projet **« Kraxia »** dans Dokploy.
2. Type de service : **Compose** → pointez sur le repo GitHub
   `maruise237/Kraxia` (la branche `main`).
3. Dans la section *Docker Compose File Path*, laissez `docker-compose.yml`.
4. Renseignez toutes les variables d'environnement du tableau ci-dessus dans
   l'onglet « Environment ».
5. Cliquez sur **Deploy**. Dokploy provisionne PostgreSQL, le backend
   FastAPI et le frontend statique, crée les volumes persistants et active
   Traefik pour les domaines.

⚠️ Le compose monte `/var/run/docker.sock`. Sur Dokploy, activez
**« Docker Socket »** dans les paramètres du service pour permettre au
backend de spawn les conteneurs utilisateur.

## 4. Déploiement Coolify

1. Créez un projet **« Kraxia »** et ajoutez un *Docker Compose Service*.
2. Source : GitHub `maruise237/Kraxia` (branche `main`).
3. Coolify détecte automatiquement `docker-compose.yml` ; laissez-le
   construire les trois services.
4. Ajoutez le `docker-compose.yml` field `Environment Variables` (voir
   tableau) dans l'onglet *Environment*.
5. Coolify crée automatiquement :
   - Postgres (service interne)
   - Gateway (FastAPI)
   - Frontend (nginx statique)
6. Activez **« Mount Docker Socket »** sur le service gateway pour autoriser
   la création de conteneurs par utilisateur.

## 5. Déploiement Docker brut

```bash
git clone https://github.com/maruise237/Kraxia.git
cd Kraxia
cp .env.example .env && nano .env
docker compose up -d --build
docker compose logs -f gateway frontend
```

Le frontend devient accessible sur `http://<host>:3000` et la passerelle sur
`http://<host>:8080`. Placez nginx/Caddy/Traefik devant pour l'HTTPS et la
résolution de domaine.

## 6. Création du premier compte administrateur

Au premier boot du conteneur `gateway`, le script lit
`PLATFORM_ADMIN_USERNAME` (par défaut `admin`) et `PLATFORM_ADMIN_PASSWORD`.
Si le compte n'existe pas, il est créé avec le rôle `admin`.

Connectez-vous à l'interface, puis rendez-vous dans l'onglet
**« Administration SaaS »** pour piloter les utilisateurs, conteneurs,
audits et statistiques d'usage.

## 7. Mises à jour

```bash
cd Kraxia
git pull origin main
docker compose pull
docker compose up -d --build
docker compose exec gateway alembic upgrade head   # si nouvelles migrations
```

Dokploy/Coolify disposent d'un bouton « Redeploy » qui exécute la même
séquence automatiquement.

## 8. Sauvegardes

- Base PostgreSQL : activez les dumps automatiques Dokploy/Coolify ou
  exécutez `docker compose exec postgres pg_dump -U kraxia kraxia_platform
  > backup-$(date +%F).sql`.
- Trajectoires d'entraînement : volume nommé `kraxia_traces`.

## 9. Limites connues sur Dokploy/Coolify mutualisés

- Le montage du socket Docker exige un hôte dédié (pas toujours autorisé).
  En SaaS mutuel, préférez **un seul tenant par déploiement**.
- Les ports par défaut (3000 / 8080) peuvent être personnalisés via
  `FRONTEND_PORT` et `GATEWAY_PORT` sans modifier le compose.
- Le frontend étant compilé au build, toute modification d'URL de la
  passerelle impose de changer `VITE_API_URL` puis de rebuilder.
