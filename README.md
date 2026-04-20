# JobTracker

Dashboard pour gérer et tracker ses candidatures en alternance (ou pas). Auth via Discord OAuth. Backend Express + PostgreSQL, Frontend React + Vite. Déployable via Coolify ou en local.

## Stack

- **Frontend** : React 19, Vite 6, Tailwind CSS v4
- **Backend** : Node.js, Express
- **Database** : PostgreSQL
- **Auth** : Discord OAuth 2.0
- **MCP** : Model Context Protocol server (pour intégration IA)
- **Deployment** : Coolify-ready, Docker + nginx

## Architecture

```
jobtracker/
├── client/          # React frontend (Vite)
├── server/           # Express API
├── mcp/              # MCP server (accès IA)
├── data/             # JSON backup (dev)
└── SPEC.md           # Spécifications
```

## Installation locale

### Prérequis

- Node.js 18+
- PostgreSQL (ou compte distant)

### 1. Cloner le projet

```bash
git clone https://github.com/openclaw-gowey/job-tracker.git
cd job-tracker
```

### 2. Configurer les variables d'environnement

**Server** (`server/.env`) :
```env
NODE_ENV=development
PORT=3002

# PostgreSQL
DATABASE_URL=postgres://user:password@host:5432/dbname

# Discord OAuth (voir section "Configurer Discord OAuth")
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3002/auth/discord/callback

# Frontend URL (pour les redirections)
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Session secret (générer une chaîne aléatoire)
SESSION_SECRET=your_64_char_random_string
```

**Client** (`client/.env`) :
```env
VITE_API_URL=http://localhost:3002
```

### 3. Configurer Discord OAuth

1. Allez sur https://discord.com/developers/applications
2. Créez une nouvelle application (ex: "JobTracker")
3. Menu gauche → "OAuth2" → "Redirects"
4. Ajoutez : `http://localhost:3002/auth/discord/callback`
5. Copiez le `CLIENT ID` et `CLIENT SECRET` dans `server/.env`

### 4. Démarrer la DB (si PostgreSQL local)

```bash
# Créer la base
createdb jobtracker

# Ou via psql
psql -c "CREATE DATABASE jobtracker;"
```

Le serveur crée automatiquement les tables au premier démarrage.

### 5. Lancer

```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev
```

- Frontend : http://localhost:5173
- API : http://localhost:3002

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/candidatures` | Liste toutes les candidatures |
| POST | `/api/candidatures` | Ajoute une candidature |
| PATCH | `/api/candidatures/:id` | Met à jour une candidature |
| DELETE | `/api/candidatures/:id` | Supprime une candidature |
| GET | `/api/stats` | Retourne les stats agrégées |

**Auth** : Toutes les requêtes nécessitent le header `x-session-id`.

## MCP Server

Le serveur MCP permet à une IA (comme Rick) d'accéder directement à JobTracker.

```bash
cd mcp
npm install
# Configurer API_URL dans index.js si besoin
node index.js
```

Outils disponibles :
- `get_candidatures` — Liste les candidatures
- `add_candidature` — Ajoute une candidature
- `update_candidature_status` — Met à jour le statut
- `get_stats` — Retourne les statistiques
- `delete_candidature` — Supprime une candidature

## Déploiement production (Coolify)

1. Ajouter les variables d'environnement dans Coolify
2. Le `Dockerfile` et `nginx.conf` sont déjà-configurés
3. Configurer le domain + SSL

### Variables production

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgres://user:password@host:5432/dbname
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_secret
DISCORD_REDIRECT_URI=https://votre-domaine.com/auth/discord/callback
FRONTEND_URL=https://votre-domaine.com
CORS_ORIGIN=https://votre-domaine.com
SESSION_SECRET=random_64_chars
```

## Configuration Discord OAuth (prod)

L'URI de redirect dans Discord Developer Portal doit être exactement :
```
https://votre-domaine.com/auth/discord/callback
```

## Screenshots

Le dashboard affiche :
- Stats globales (total, en attente, entretiens, refusés, acceptés, taux de réponse)
- Tableau des candidatures avec entreprise, poste, lieu, date, source, statut
- Bouton d'ajout rapide

## Licence

MIT