import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';

async function callAPI(method, path, body = null) {
  const url = `${API_URL}${path}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

const server = new Server(
  {
    name: 'jobtracker-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_candidatures',
      description: 'Liste toutes les candidatures',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'add_candidature',
      description: 'Ajoute une nouvelle candidature',
      inputSchema: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Nom de l\'entreprise' },
          jobTitle: { type: 'string', description: 'Intitulé du poste' },
          location: { type: 'string', description: 'Lieu du poste' },
          source: { type: 'string', description: 'Source (LinkedIn, Indeed, Direct, Email, Other)' },
          notes: { type: 'string', description: 'Notes additionnelles' },
        },
        required: ['company', 'jobTitle'],
      },
    },
    {
      name: 'update_candidature_status',
      description: 'Met à jour le statut d\'une candidature',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID de la candidature' },
          status: { 
            type: 'string', 
            enum: ['pending', 'interview', 'rejected', 'accepted', 'withdrawn'],
            description: 'Nouveau statut' 
          },
          notes: { type: 'string', description: 'Notes additionnelles (optionnel)' },
        },
        required: ['id', 'status'],
      },
    },
    {
      name: 'get_stats',
      description: 'Retourne les statistiques des candidatures',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'delete_candidature',
      description: 'Supprime une candidature',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'ID de la candidature à supprimer' },
        },
        required: ['id'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_candidatures') {
      const data = await callAPI('GET', '/api/candidatures');
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === 'add_candidature') {
      const data = await callAPI('POST', '/api/candidatures', args);
      return {
        content: [
          {
            type: 'text',
            text: `Candidature ajoutée : ${data.company} - ${data.jobTitle} (${data.status})`,
          },
        ],
      };
    }

    if (name === 'update_candidature_status') {
      const { id, status, notes } = args;
      const updateData = { status };
      if (notes) updateData.notes = notes;
      const data = await callAPI('PATCH', `/api/candidatures/${id}`, updateData);
      return {
        content: [
          {
            type: 'text',
            text: `Candidature ${data.company} - ${data.jobTitle} → ${status}`,
          },
        ],
      };
    }

    if (name === 'get_stats') {
      const data = await callAPI('GET', '/api/stats');
      return {
        content: [
          {
            type: 'text',
            text: `📊 Stats Candidatures

Total : ${data.total}
- En attente : ${data.byStatus.pending}
- Entretien : ${data.byStatus.interview}
- Refusé : ${data.byStatus.rejected}
- Accepté : ${data.byStatus.accepted}
- Retiré : ${data.byStatus.withdrawn}

Taux de réponse : ${data.responseRate}%

Par source : ${Object.entries(data.bySource).map(([k,v]) => `${k}: ${v}`).join(', ') || 'aucune'}`,
          },
        ],
      };
    }

    if (name === 'delete_candidature') {
      await callAPI('DELETE', `/api/candidatures/${args.id}`);
      return {
        content: [{ type: 'text', text: 'Candidature supprimée' }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Erreur: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JobTracker MCP server running...');
}

main().catch(console.error);
