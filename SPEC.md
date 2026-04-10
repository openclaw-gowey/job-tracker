# JobTracker — Candidatures Dashboard

## Concept

Un dashboard minimaliste pour tracker ses candidatures. Pas de features complexes — un tableau clair et des stats essentielles. L'objectif : avoir une vision globale de sa recherche et la maintenir à jour en donnant des ordres à Rick (moi) plutôt que de modifier à la main.

## Design

- Dark mode default, style brutaliste-glass (match portfolio)
- Couleurs : accent `#c8ff00` (vert-jaune), fond `#080808`, surfaces `#111111`
- Typography : Syne (headings), Inter (body), JetBrains Mono (mono)
- Le même vibe que le portfolio Arthur

## Architecture

```
jobtracker/
├── client/          # React + Vite frontend
├── server/          # Express API
├── mcp/             # MCP server (pour Rick)
├── data/            # JSON file comme DB
└── SPEC.md
```

## Data Model

```json
{
  "candidatures": [
    {
      "id": "uuid",
      "company": "TechCorp",
      "jobTitle": "Développeur Fullstack",
      "location": "Caen",
      "dateApplied": "2025-01-15",
      "status": "pending|interview|rejected|accepted|withdrawn",
      "source": "LinkedIn|Indeed|Direct|Email|Other",
      "notes": "Notes libres",
      "lastUpdate": "2025-01-20T10:00:00Z"
    }
  ]
}
```

## API Endpoints

- `GET /api/candidatures` — liste toutes les candidatures
- `POST /api/candidatures` — ajoute une candidature
- `PATCH /api/candidatures/:id` — met à jour une candidature
- `DELETE /api/candidatures/:id` — supprime une candidature
- `GET /api/stats` — retourne les stats agrégées

## Stats Dashboard

- Total candidatures
- Par statut (en attente, entretien, refusé, accepté, retiré)
- Taux de réponse (%)
- Candidatures par mois (chart)
- Répartition par source

## MCP Server

Le serveur MCP expose des outils pour Rick :
- `get_candidatures` — liste les candidatures
- `add_candidature` — ajoute une candidature
- `update_candidature_status` — change le statut
- `get_stats` — retourne les stats

## Status Flow

```
pending → interview → accepted
                   → rejected
         → withdrawn
         → pending (no response after X days)
```

## Tech Stack

- **Frontend** : React 19, Vite, Tailwind CSS v4
- **Backend** : Node.js, Express
- **DB** : JSON file (simple, pas de DB needed)
- **MCP** : @modelcontextprotocol/sdk
