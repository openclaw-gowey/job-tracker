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
├── server/          # Express API
├── mcp/              # MCP server (accès IA)
├── data/             # JSON backup (dev)
└── SPEC.md           # Spécifications
```

---

## Déploiement Coolify (détaillé)

Ce projet utilise 2 services séparés : le backend (server) et le frontend (client). Chaque service est un container Docker indépendant.

### Étape 1 : Préparer Git

Push le projet sur GitHub si ce n'est pas déjà fait :

```bash
git remote -v  # vérifier que le remote pointe vers ton repo
git push origin master
```

### Étape 2 : Créer les 2 applications dans Coolify

Dans Coolify, ajouter 2 ressources (2 deployments séparés) :

**Application 1 : jobtracker-server**
- Source : GitHub → `openclaw-gowey/job-tracker`
- Build pack : Dockerfile
- Base directory : `/server`
- Port : `3002`

**Application 2 : jobtracker-client**
- Source : GitHub → `openclaw-gowey/job-tracker`
- Build pack : Dockerfile
- Base directory : `/client`
- Port : `5173`

### Étape 3 : Variables d'environnement server

Dans Coolify → jobtracker-server → Environment variables :

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgres://postgres:TON_PASSWORD@TON_HOST:5432/postgres
DISCORD_CLIENT_ID=TON_DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET=TON_DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://jobs.gowey.fr/auth/discord/callback
FRONTEND_URL=https://jobs.gowey.fr
CORS_ORIGIN=https://jobs.gowey.fr
SESSION_SECRET=generer_un_random_string_de_64_chars
```

### Étape 4 : Variables d'environnement client

Dans Coolify → jobtracker-client → Environment variables :

```env
VITE_API_URL=https://jobs-api.gowey.fr
```

### Étape 5 : Domains

**jobtracker-server** :
- Domain : `jobs-api.gowey.fr`
- Port interne : `3002`

**jobtracker-client** :
- Domain : `jobs.gowey.fr`
- Port interne : `5173`

### Étape 6 : Discord OAuth

Configurer dans Discord Developer Portal :

1. https://discord.com/developers/applications
2. Sélectionner l'app "JobTracker"
3. OAuth2 → Redirects
4. Ajouter : `https://jobs.gowey.fr/auth/discord/callback`

### Vérification

Après déploiement :
- API : `https://jobs-api.gowey.fr/api/stats` → retourne `401` (sans session, c'est normal)
- Frontend : `https://jobs.gowey.fr` → affiche la page de login Discord

### Troubleshooting

**Erreur "redirect_uri OAuth2 non valide"**
→ L'URI dans le `.env` (DISCORD_REDIRECT_URI) ne matche pas avec Discord Developer Portal. Vérifier qu'elles sont identiques.

**Erreur "no available server" sur le frontend**
→ Le `VITE_API_URL` ne pointe pas vers l'API. Vérifier qu'il pointe vers `https://jobs-api.gowey.fr`.

**Database connection failed**
→ Vérifier le `DATABASE_URL` (format : `postgres://user:password@host:port/db`).

---

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

## Screenshots

Le dashboard affiche :
- Stats globales (total, en attente, entretiens, refusés, acceptés, taux de réponse)
- Tableau des candidatures avec entreprise, poste, lieu, date, source, statut
- Bouton d'ajout rapide

## Licence

MIT