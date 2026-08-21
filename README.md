# Kraxia — SaaS multi-tenant d'agents IA

Kraxia est une plateforme SaaS française, multi-tenant, qui permet à chaque
utilisateur d'instancier ses propres agents IA, d'orchestrer des canaux de
communication (Discord, Slack, Telegram, Matrix, Microsoft Teams, Zalo,
Nextcloud Talk…), d'exécuter des outils, de planifier des tâches et de
converser en temps réel depuis une interface web épurée.

Pour les opérateurs de plateforme, Kraxia embarque un **panneau
administrateur** complet : gestion des utilisateurs, des conteneurs
runtime, du journal d'audit, des quotas et des statistiques d'usage.

## Stack technique

- **Frontend** : React 19 + Vite + Tailwind CSS 4 + xterm.js
- **Passerelle** : FastAPI + SQLAlchemy + Alembic + PostgreSQL 16
- **Conteneur multi-tenant** : Docker API + per-user runtime images
- **Compatible** : Dokploy, Coolify, Docker brut

## Démarrage rapide

```bash
cp .env.example .env
nano .env                         # JWT_SECRET, ADMIN_PASSWORD, au moins une clé LLM
docker compose up -d --build
```

- Frontend : http://localhost:3000
- Passerelle : http://localhost:8080
- Premier admin : défini par `ADMIN_USERNAME` / `ADMIN_PASSWORD`

## Documentation

- [Guide de déploiement Dokploy / Coolify](DEPLOYMENT.md)
- [Architecture multi-tenant](./doc) (voir dossier `doc/` du repo)
- [Endpoints administrateur SaaS](./platform/app/routes/admin_panel.py)

## Licence

Voir le fichier `LICENSE` à la racine du dépôt.
